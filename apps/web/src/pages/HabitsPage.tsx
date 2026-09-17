import { useCallback, useEffect, useState, type CSSProperties } from 'react';
import { Button, Card, Col, Empty, Popconfirm, Progress, Row, Segmented, Skeleton, Space, Tag, Typography, message } from 'antd';
import { CheckOutlined, DeleteOutlined, EditOutlined, FireOutlined, PlusOutlined } from '@ant-design/icons';
import type { Habit, HabitCheckIn, ISODate } from '@lifeos/shared';
import { dataSource, generateDisciplineDemoData } from '../data';
import { useSearchParams } from 'react-router-dom';
import { calculateHabitStats, today } from '../lib/dates';
import { HabitFormModal } from '../components/discipline/HabitFormModal';
import { HabitHeatmap } from '../components/discipline/HabitHeatmap';
import { HabitStatBlocks } from '../components/discipline/HabitStatBlocks';
import { CountUp, fireCelebrationCannon, fireConfetti, SpotlightCard } from '../components/ui';
import '../styles/discipline.css';

type HabitView = 'active' | 'archived';

const frequencyLabel = (habit: Habit) => habit.frequency === 'daily' ? `每天 ${habit.timesPerPeriod} 次` : habit.frequency === 'weekly' ? `每周 ${habit.timesPerPeriod} 次` : `自定义 ${habit.timesPerPeriod} 次`;

export function HabitsPage() {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [checkIns, setCheckIns] = useState<Record<string, HabitCheckIn[]>>({});
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<HabitView>('active');
  const [selectedId, setSelectedId] = useState<string>();
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<Habit | undefined>();
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
      const nextHabits = await dataSource.habits.list(true);
      const byHabit = await Promise.all(nextHabits.map(async (habit) => [habit.id, await dataSource.habits.listCheckIns(habit.id, '1970-01-01', today())] as const));
      setHabits(nextHabits);
      setCheckIns(Object.fromEntries(byHabit));
      setSelectedId((current) => nextHabits.some((habit) => habit.id === current) ? current : nextHabits.find((habit) => !habit.archived)?.id ?? nextHabits[0]?.id);
    } catch (error) {
      message.error(error instanceof Error ? error.message : '习惯加载失败');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { void reload(); }, [reload]);

  const visibleHabits = habits.filter((habit) => view === 'active' ? !habit.archived : habit.archived);
  const selectedHabit = habits.find((habit) => habit.id === selectedId);
  const selectedCheckIns = selectedHabit ? checkIns[selectedHabit.id] ?? [] : [];
  const activeHabits = habits.filter((habit) => !habit.archived);
  const checkedToday = activeHabits.filter((habit) => (checkIns[habit.id] ?? []).some((item) => item.date === today())).length;

  const openEditor = (habit?: Habit) => { setEditing(habit); setEditorOpen(true); };
  const toggle = async (habit: Habit, date: ISODate) => {
    const exists = (checkIns[habit.id] ?? []).some((item) => item.date === date);
    try {
      if (exists) {
        await dataSource.habits.uncheck(habit.id, date);
        message.success(`${date} 的打卡已取消`);
      } else {
        await dataSource.habits.checkIn(habit.id, date);
        if (date === today()) {
          fireConfetti();
          message.success('今日打卡完成！太棒了 🎉');
        } else {
          message.success('补打成功');
        }
      }
      await reload();
    } catch (error) { message.error(error instanceof Error ? error.message : '打卡失败'); }
  };
  const remove = async (habit: Habit) => {
    try { await dataSource.habits.remove(habit.id); message.success('习惯已删除'); await reload(); }
    catch (error) { message.error(error instanceof Error ? error.message : '删除失败'); }
  };
  const seedDemo = async () => {
    try {
      const created = await generateDisciplineDemoData();
      if (created) {
        fireCelebrationCannon();
        message.success(`已生成 ${created} 条演示自律数据`);
      } else {
        message.info('已有习惯或计划，未覆盖你的数据');
      }
      await reload();
    } catch (error) { message.error(error instanceof Error ? error.message : '生成演示数据失败'); }
  };

  return <>
    <section className="page-heading">
      <div><h1>习惯打卡</h1><p>把想要的生活，拆成每天都能完成的一小步。</p></div>
      <Space wrap><Button onClick={() => void seedDemo()}>填充演示数据</Button><Button type="primary" icon={<PlusOutlined />} onClick={() => openEditor()}>新建习惯</Button></Space>
    </section>

    <Row gutter={[16, 16]} className="discipline-summary">
      <Col xs={24} md={14}>
        <SpotlightCard className="stat-card" spotlightColor="rgba(35, 141, 91, 0.16)">
          <div style={{ padding: 20 }}>
            <Typography.Text type="secondary">今日打卡进度</Typography.Text>
            <Typography.Title level={2} style={{ margin: '4px 0 0' }}>
              <CountUp to={checkedToday} /> <Typography.Text type="secondary">/ <CountUp to={activeHabits.length} /></Typography.Text>
            </Typography.Title>
            <Progress percent={activeHabits.length ? Math.round(checkedToday / activeHabits.length * 100) : 0} showInfo={false} strokeColor="#2f9c67" />
          </div>
        </SpotlightCard>
      </Col>
      <Col xs={24} md={10}>
        <SpotlightCard className="stat-card" spotlightColor="rgba(77, 191, 157, 0.16)">
          <div style={{ padding: 20 }}>
            <Typography.Text type="secondary">今天</Typography.Text>
            <Typography.Title level={3} style={{ margin: '7px 0 0' }}>{new Date(`${today()}T12:00:00Z`).toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'long', timeZone: 'UTC' })}</Typography.Title>
            <Typography.Text type="secondary">点击「完成」即可记录今天的坚持</Typography.Text>
          </div>
        </SpotlightCard>
      </Col>
    </Row>

    <div className="finance-toolbar"><Segmented<HabitView> value={view} onChange={setView} options={[{ label: `进行中 (${activeHabits.length})`, value: 'active' }, { label: `已归档 (${habits.length - activeHabits.length})`, value: 'archived' }]} /></div>
    {loading ? <Row gutter={[16, 16]}>{Array.from({ length: 3 }, (_, index) => <Col xs={24} md={12} xl={8} key={index}><Card><Skeleton active paragraph={{ rows: 4 }} /></Card></Col>)}</Row> : visibleHabits.length === 0 ? <Card><Empty description={view === 'active' ? '还没有进行中的习惯' : '没有归档的习惯'}><Button type="primary" onClick={() => openEditor()}>创建第一个习惯</Button></Empty></Card> : <Row gutter={[16, 16]}>{visibleHabits.map((habit) => <HabitCard key={habit.id} habit={habit} checkIns={checkIns[habit.id] ?? []} selected={habit.id === selectedId} onSelect={() => setSelectedId(habit.id)} onToggle={() => void toggle(habit, today())} onEdit={() => openEditor(habit)} onDelete={() => void remove(habit)} />)}</Row>}

    {selectedHabit && <Card style={{ marginTop: 16, '--habit-color': selectedHabit.color } as CSSProperties}>
      <div className="heatmap-heading"><div className="habit-card-title"><span className="habit-icon" style={{ background: `${selectedHabit.color}18` }}>{selectedHabit.icon}</span><div><Typography.Title level={3} style={{ margin: 0 }}>{selectedHabit.name}</Typography.Title><Typography.Text type="secondary">{frequencyLabel(selectedHabit)} · 可补打最近 {selectedHabit.allowBackfillDays} 天</Typography.Text></div></div><Button icon={<EditOutlined />} onClick={() => openEditor(selectedHabit)}>编辑习惯</Button></div>
      <HabitStatBlocks habit={selectedHabit} checkIns={selectedCheckIns} />
      <div style={{ marginTop: 26 }}><HabitHeatmap habit={selectedHabit} checkIns={selectedCheckIns} onToggle={(date) => void toggle(selectedHabit, date)} /></div>
    </Card>}

    <HabitFormModal open={editorOpen} habit={editing} onClose={() => { setEditorOpen(false); setEditing(undefined); }} onSaved={reload} />
  </>;
}

function HabitCard({ habit, checkIns, selected, onSelect, onToggle, onEdit, onDelete }: { habit: Habit; checkIns: HabitCheckIn[]; selected: boolean; onSelect: () => void; onToggle: () => void; onEdit: () => void; onDelete: () => void }) {
  const checked = checkIns.some((item) => item.date === today());
  const stats = calculateHabitStats(habit, checkIns);
  const habitGlow = habit.color ? `${habit.color}26` : 'rgba(35, 141, 91, 0.16)';

  return <Col xs={24} md={12} xl={8}>
    <SpotlightCard
      className={`habit-card ${selected ? 'is-selected' : ''}`}
      spotlightColor={habitGlow}
      style={{ '--habit-color': habit.color } as CSSProperties}
      onClick={onSelect}
    >
      <div style={{ padding: '20px' }}>
        <div className="habit-card-stripe" />
        <div className="habit-card-title">
          <span className="habit-icon" style={{ background: `${habit.color}18` }}>{habit.icon}</span>
          <div>
            <h3>{habit.name}</h3>
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>{frequencyLabel(habit)}</Typography.Text>
          </div>
        </div>
        <div className="habit-meta">
          <span><FireOutlined style={{ color: '#ef9c38' }} /> 连续 {stats.currentStreak} 天</span>
          {habit.reminderTime ? <span>🕘 {habit.reminderTime}</span> : <span>无需提醒</span>}
        </div>
        <Progress percent={stats.recent30Rate} showInfo={false} strokeColor={habit.color} size="small" />
        <div className="habit-actions">
          <Button
            type={checked ? 'default' : 'primary'}
            icon={<CheckOutlined />}
            disabled={habit.archived}
            onClick={(event) => { event.stopPropagation(); onToggle(); }}
          >
            {checked ? '已完成' : '完成今日打卡'}
          </Button>
          <Button type="text" icon={<EditOutlined />} onClick={(event) => { event.stopPropagation(); onEdit(); }} aria-label="编辑习惯" />
          <Popconfirm title="删除这个习惯？" description="所有历史打卡也会删除。" onConfirm={(event) => { event?.stopPropagation(); onDelete(); }} okText="删除" cancelText="取消">
            <Button type="text" danger icon={<DeleteOutlined />} onClick={(event) => event.stopPropagation()} aria-label="删除习惯" />
          </Popconfirm>
        </div>
        {habit.archived && <Tag style={{ marginTop: 10 }}>已归档</Tag>}
      </div>
    </SpotlightCard>
  </Col>;
}
