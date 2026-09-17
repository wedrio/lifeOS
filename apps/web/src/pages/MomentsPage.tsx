import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button, Card, Empty, Image, Popconfirm, Segmented, Space, Tag, Typography, message } from 'antd';
import { CalendarOutlined, DeleteOutlined, EditOutlined, FileTextOutlined, PlusOutlined } from '@ant-design/icons';
import type { Asset, Habit, HabitCheckIn, Moment, Transaction } from '@lifeos/shared';
import { dataSource, generateMomentsDemoData } from '../data';
import { useSearchParams } from 'react-router-dom';
import { addDays, today } from '../lib/dates';
import { formatCents } from '../lib/finance';
import { MomentFormModal, type MomentLinkOption } from '../components/moments/MomentFormModal';
import { fireCelebrationCannon, SpotlightCard } from '../components/ui';
import '../styles/moments.css';

type MomentView = 'timeline' | 'calendar';
const weekdays = ['日', '一', '二', '三', '四', '五', '六'];

export function MomentsPage() {
  const [moments, setMoments] = useState<Moment[]>([]);
  const [linkOptions, setLinkOptions] = useState<MomentLinkOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<MomentView>('timeline');
  const [month, setMonth] = useState(today().slice(0, 7));
  const [selectedDate, setSelectedDate] = useState(today());
  const [weekStartsOn, setWeekStartsOn] = useState<0 | 1>(1);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<Moment | undefined>();
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    if (searchParams.get('new') !== '1') return;
    setEditing(undefined);
    setEditorOpen(true);
    setSearchParams({}, { replace: true });
  }, [searchParams, setSearchParams]);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const [nextMoments, habits, transactions, assets, settings] = await Promise.all([
        dataSource.moments.list(), dataSource.habits.list(), dataSource.finance.listTransactions(), dataSource.assets.list(), dataSource.settings.get(),
      ]);
      const checkInGroups = await Promise.all(habits.map(async (habit) => ({ habit, checkIns: await dataSource.habits.listCheckIns(habit.id, '1970-01-01', today()) })));
      setMoments(nextMoments);
      setWeekStartsOn(settings.weekStartsOn);
      setLinkOptions(buildLinkOptions(checkInGroups, transactions, assets));
    } catch (error) { message.error(error instanceof Error ? error.message : '日常加载失败'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void reload(); }, [reload]);

  const linkLabels = useMemo(() => new Map(linkOptions.map((option) => [option.value, option.label])), [linkOptions]);
  const momentsByDate = useMemo(() => new Map<string, Moment[]>(Array.from(new Set(moments.map((moment) => moment.createdAt.slice(0, 10)))).map((date) => [date, moments.filter((moment) => moment.createdAt.slice(0, 10) === date)])), [moments]);
  const openEditor = (moment?: Moment) => { setEditing(moment); setEditorOpen(true); };
  const remove = async (moment: Moment) => {
    try { await dataSource.moments.remove(moment.id); message.success('日常已删除'); await reload(); }
    catch (error) { message.error(error instanceof Error ? error.message : '删除失败'); }
  };
  const seedDemo = async () => {
    try {
      const created = await generateMomentsDemoData();
      if (created) {
        fireCelebrationCannon();
        message.success(`已生成 ${created} 条演示日常`);
      } else {
        message.info('已有日常，未覆盖你的数据');
      }
      await reload();
    } catch (error) { message.error(error instanceof Error ? error.message : '生成演示数据失败'); }
  };
  const changeMonth = (next: string) => { const safe = next || today().slice(0, 7); setMonth(safe); setSelectedDate(`${safe}-01`); };

  return <>
    <section className="page-heading"><div><h1>记录日常</h1><p>文字、照片与关联记录，一起留住生活的上下文。</p></div><Space wrap><Button onClick={() => void seedDemo()}>填充演示数据</Button><Button type="primary" icon={<PlusOutlined />} onClick={() => openEditor()}>写一条日常</Button></Space></section>
    <Card style={{ marginBottom: 16 }}><div className="finance-toolbar"><Segmented<MomentView> value={view} onChange={setView} options={[{ label: '时间线', value: 'timeline', icon: <FileTextOutlined /> }, { label: '日历视图', value: 'calendar', icon: <CalendarOutlined /> }]} />{view === 'calendar' && <input className="ant-input" type="month" value={month} onChange={(event) => changeMonth(event.target.value)} style={{ width: 150 }} aria-label="选择日历月份" />}</div></Card>
    {loading ? <Card loading style={{ minHeight: 260 }} /> : view === 'timeline' ? <Timeline moments={moments} linkLabels={linkLabels} onEdit={openEditor} onDelete={remove} /> : <CalendarView month={month} weekStartsOn={weekStartsOn} selectedDate={selectedDate} momentsByDate={momentsByDate} onSelect={setSelectedDate} linkLabels={linkLabels} onEdit={openEditor} />}
    <MomentFormModal open={editorOpen} moment={editing} linkOptions={linkOptions} onClose={() => { setEditorOpen(false); setEditing(undefined); }} onSaved={reload} />
  </>;
}

function buildLinkOptions(groups: Array<{ habit: Habit; checkIns: HabitCheckIn[] }>, transactions: Transaction[], assets: Asset[]): MomentLinkOption[] {
  const habitOptions = groups.flatMap(({ habit, checkIns }) => checkIns.slice(0, 20).map((checkIn) => ({ value: `habit_checkin:${checkIn.id}`, label: `🎯 ${habit.icon} ${habit.name} · ${checkIn.date}` })));
  const transactionOptions = transactions.slice(0, 40).map((transaction) => ({ value: `transaction:${transaction.id}`, label: `💰 ${transaction.type === 'expense' ? '支出' : '收入'} ${formatCents(transaction.amount)} · ${transaction.date}` }));
  const assetOptions = assets.map((asset) => ({ value: `asset:${asset.id}`, label: `📦 ${asset.icon} ${asset.name}` }));
  return [...habitOptions, ...transactionOptions, ...assetOptions];
}

function Timeline({ moments, linkLabels, onEdit, onDelete }: { moments: Moment[]; linkLabels: Map<string, string>; onEdit: (moment?: Moment) => void; onDelete: (moment: Moment) => void }) {
  if (!moments.length) return <Card><Empty description="还没有日常记录"><Button type="primary" onClick={() => onEdit()}>写下第一条日常</Button></Empty></Card>;
  return <div className="moment-feed">{moments.map((moment) => <MomentCard key={moment.id} moment={moment} linkLabels={linkLabels} onEdit={() => onEdit(moment)} onDelete={() => onDelete(moment)} />)}</div>;
}

function MomentCard({ moment, linkLabels, onEdit, onDelete }: { moment: Moment; linkLabels: Map<string, string>; onEdit: () => void; onDelete: () => void }) {
  const time = new Date(moment.createdAt).toLocaleString('zh-CN', { month: 'long', day: 'numeric', weekday: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Shanghai' });
  return <SpotlightCard className="moment-card" spotlightColor="rgba(167, 139, 250, 0.16)"><div style={{ padding: 22 }}><div className="moment-card-head"><div><Typography.Text strong>{[moment.mood, moment.weather].filter(Boolean).join(' ') || '📔'} 我的日常</Typography.Text><div className="moment-time">{time}{moment.location ? ` · 📍 ${moment.location}` : ''}</div></div><Space size={0}><Button type="text" size="small" icon={<EditOutlined />} onClick={onEdit} aria-label="编辑日常" /><Popconfirm title="删除这条日常？" onConfirm={onDelete} okText="删除" cancelText="取消"><Button type="text" danger size="small" icon={<DeleteOutlined />} aria-label="删除日常" /></Popconfirm></Space></div><div className="moment-content">{moment.content}</div>{moment.imageUrls.length > 0 && <Image.PreviewGroup><div className={`moment-images ${moment.imageUrls.length === 1 ? 'one' : moment.imageUrls.length === 2 ? 'two' : ''}`}>{moment.imageUrls.map((url, index) => <Image key={`${url.slice(0, 32)}-${index}`} src={url} alt={`${time} 的图片 ${index + 1}`} />)}</div></Image.PreviewGroup>}<div className="moment-tags">{moment.tags.map((tag) => <Tag color="purple" key={tag}>#{tag}</Tag>)}</div>{moment.links.length > 0 && <div className="moment-links">{moment.links.map((link) => <Tag color="blue" key={`${link.type}-${link.id}`}>🔗 {linkLabels.get(`${link.type}:${link.id}`) ?? '关联记录已删除'}</Tag>)}</div>}<div className="moment-card-footer"><Typography.Text type="secondary" style={{ fontSize: 12 }}>{moment.imageUrls.length ? `${moment.imageUrls.length} 张图片` : '纯文字记录'}</Typography.Text><Typography.Text type="secondary" style={{ fontSize: 12 }}>记录于 {moment.createdAt.slice(0, 10)}</Typography.Text></div></div></SpotlightCard>;
}

function CalendarView({ month, weekStartsOn, selectedDate, momentsByDate, onSelect, linkLabels, onEdit }: { month: string; weekStartsOn: 0 | 1; selectedDate: string; momentsByDate: Map<string, Moment[]>; onSelect: (date: string) => void; linkLabels: Map<string, string>; onEdit: (moment: Moment) => void }) {
  const days = calendarDays(month, weekStartsOn);
  const headers = weekStartsOn === 1 ? [...weekdays.slice(1), weekdays[0]] : weekdays;
  const selected = momentsByDate.get(selectedDate) ?? [];
  return <Card title={`${month.replace('-', ' 年 ')} 月日历`}><div className="moment-calendar">{headers.map((day) => <div className="calendar-weekday" key={day}>周{day}</div>)}{days.map((day) => { const count = momentsByDate.get(day.date)?.length ?? 0; return <button type="button" key={day.date} className={`calendar-day ${day.inMonth ? '' : 'outside'} ${selectedDate === day.date ? 'selected' : ''}`} onClick={() => onSelect(day.date)}><span className="calendar-day-number">{Number(day.date.slice(8))}</span>{count > 0 && <span className="calendar-day-count">{count}</span>}</button>; })}</div><div className="calendar-moment-preview"><Typography.Title level={5}>{selectedDate} 的记录</Typography.Title>{selected.length ? selected.map((moment) => <div className="calendar-moment-row" key={moment.id}><Typography.Text strong>{[moment.mood, moment.weather].filter(Boolean).join(' ') || '📔'} {moment.content.slice(0, 70)}{moment.content.length > 70 ? '…' : ''}</Typography.Text><div><Button type="link" size="small" onClick={() => onEdit(moment)} style={{ paddingLeft: 0 }}>查看 / 编辑</Button>{moment.links.slice(0, 2).map((link) => <Tag key={`${link.type}-${link.id}`}>🔗 {linkLabels.get(`${link.type}:${link.id}`)?.replace(/^.{2}\s/, '') ?? '已删除记录'}</Tag>)}</div></div>) : <Typography.Text type="secondary">这一天还没有记录。</Typography.Text>}</div></Card>;
}

function calendarDays(month: string, weekStartsOn: 0 | 1) {
  const first = `${month}-01`;
  const firstDay = new Date(`${first}T12:00:00Z`).getUTCDay();
  const offset = (firstDay - weekStartsOn + 7) % 7;
  const gridStart = addDays(first, -offset);
  return Array.from({ length: 42 }, (_, index) => { const date = addDays(gridStart, index); return { date, inMonth: date.startsWith(month) }; });
}
