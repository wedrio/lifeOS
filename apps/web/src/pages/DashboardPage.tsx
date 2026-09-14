import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { Button, Card, Checkbox, Col, Empty, Progress, Row, Skeleton, Space, Tag, Typography, message } from 'antd';
import { CalendarOutlined, CheckCircleOutlined, DollarOutlined, FileTextOutlined, PlusOutlined, ReloadOutlined, WarningOutlined } from '@ant-design/icons';
import type { DashboardStats, Plan } from '@lifeos/shared';
import { useNavigate } from 'react-router-dom';
import { dataSource, generateAllDemoData } from '../data';
import { addDays, today } from '../lib/dates';
import { formatCents } from '../lib/finance';
import '../styles/dashboard.css';

export function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const navigate = useNavigate();
  const now = new Date();

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const settings = await dataSource.settings.get();
      if (settings.autoRollOverIncompletePlans) await dataSource.plans.rollOverIncompleteDayPlans(addDays(today(), -1), today());
      setStats(await dataSource.stats.dashboard());
    } catch (error) { message.error(error instanceof Error ? error.message : '主面板加载失败'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void reload(); }, [reload]);

  const togglePlan = async (plan: Plan) => {
    try {
      const completed = plan.status !== 'completed';
      await dataSource.plans.update(plan.id, { status: completed ? 'completed' : 'not_started', progress: completed ? 100 : 0 });
      message.success(completed ? '今日计划已完成' : '计划已恢复');
      await reload();
    } catch (error) { message.error(error instanceof Error ? error.message : '更新计划失败'); }
  };
  const generateAll = async () => {
    setGenerating(true);
    try {
      const created = await generateAllDemoData();
      if (created) message.success(`已补充 ${created} 条演示数据`);
      else message.info('所有板块已有数据，无需填充');
      await reload();
    } catch (error) { message.error(error instanceof Error ? error.message : '生成演示数据失败'); }
    finally { setGenerating(false); }
  };

  const planPercent = stats?.plan.total ? Math.round(stats.plan.completed / stats.plan.total * 100) : 0;
  const habitPercent = stats?.habits.total ? Math.round(stats.habits.completed / stats.habits.total * 100) : 0;
  const budgetPercent = stats?.finance.budget?.total ? Math.round(stats.finance.budgetSpent / stats.finance.budget.total * 100) : 0;

  return <>
    <section className="page-heading"><div><h1>今天，慢慢变好</h1><p>{now.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })}</p></div><Space><Button icon={<ReloadOutlined />} onClick={() => void reload()} loading={loading}>刷新</Button><Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/finance/transactions?new=1')}>记一笔</Button></Space></section>
    <Card className="dashboard-welcome" bordered={false}><div className="dashboard-welcome-row"><div className="dashboard-hero-copy"><span className="dashboard-eyebrow">LIFE CANVAS · DAILY EDITION</span><h1>今天的生活，<br />值得被认真编排。</h1><p>从一次打卡、一笔记录，开始把想过的生活变成今天的行动。</p></div><div className="dashboard-hero-aside"><div className="hero-orbit"><span>✦</span></div><Button ghost onClick={() => void generateAll()} loading={generating}>填充整套演示数据</Button></div></div></Card>
    <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
      <Col xs={24} sm={12} xl={6}><MetricCard icon={<CheckCircleOutlined />} color="#e2f5df" label="今日计划" value={stats ? `${stats.plan.completed} / ${stats.plan.total}` : '—'} loading={loading} progress={planPercent} /></Col>
      <Col xs={24} sm={12} xl={6}><MetricCard icon={<CalendarOutlined />} color="#e1f8ef" label="习惯打卡" value={stats ? `${stats.habits.completed} / ${stats.habits.total}` : '—'} loading={loading} progress={habitPercent} /></Col>
      <Col xs={24} sm={12} xl={6}><MetricCard icon={<DollarOutlined />} color="#fff2df" label="今日支出" value={stats ? formatCents(stats.finance.todayExpense) : '—'} loading={loading} /></Col>
      <Col xs={24} sm={12} xl={6}><MetricCard icon={<WarningOutlined />} color="#ffe9eb" label="临近到期" value={stats ? `${stats.expiringAssets.length} 项` : '—'} loading={loading} /></Col>
    </Row>
    <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
      <Col xs={24} lg={15}><Card title="快捷操作"><Row gutter={[12, 12]}><Col xs={24} sm={8}><ActionCard icon={<DollarOutlined />} title="记一笔" description="记录收入、支出与账户" onClick={() => navigate('/finance/transactions?new=1')} /></Col><Col xs={24} sm={8}><ActionCard icon={<CheckCircleOutlined />} title="打一次卡" description="完成今天的好习惯" onClick={() => navigate('/discipline/habits')} /></Col><Col xs={24} sm={8}><ActionCard icon={<FileTextOutlined />} title="写一条日常" description="留住此刻的心情" onClick={() => navigate('/moments?new=1')} /></Col></Row></Card></Col>
      <Col xs={24} lg={9}><Card title="本月预算"><Typography.Title level={3} style={{ margin: 0 }}>{stats?.finance.budget ? formatCents(stats.finance.budgetSpent) : '尚未设置'}</Typography.Title><Typography.Text type="secondary">{stats?.finance.budget ? `预算 ${formatCents(stats.finance.budget.total)} · 本月支出 ${formatCents(stats.finance.monthExpense)}` : '前往预算页，为本月设一个花钱边界。'}</Typography.Text><Progress percent={Math.min(100, budgetPercent)} status={budgetPercent > 100 ? 'exception' : 'normal'} showInfo={Boolean(stats?.finance.budget)} strokeColor={budgetPercent > 100 ? '#e4565c' : '#2f9c67'} style={{ marginTop: 17 }} /></Card></Col>
    </Row>
    <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
      <Col xs={24} lg={15}><Card title="今日计划" extra={<Button type="link" onClick={() => navigate('/discipline/plans')}>查看全部</Button>}>{loading ? <Skeleton active paragraph={{ rows: 4 }} /> : stats?.todayPlans.length ? <div className="dashboard-plan-list">{stats.todayPlans.map((plan) => <div className={`dashboard-plan-row ${plan.status === 'completed' ? 'is-completed' : ''}`} key={plan.id}><Checkbox checked={plan.status === 'completed'} onChange={() => void togglePlan(plan)}><span>{plan.title}</span></Checkbox><div className="dashboard-plan-progress"><Progress percent={plan.progress} showInfo={false} size="small" strokeColor="#2f9c67" /></div><Tag color={plan.priority === 'high' ? 'red' : plan.priority === 'medium' ? 'blue' : 'default'}>{plan.priority === 'high' ? '高' : plan.priority === 'medium' ? '中' : '低'}</Tag></div>)}</div> : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="今天还没有计划"><Button type="primary" onClick={() => navigate('/discipline/plans')}>创建今日计划</Button></Empty>}</Card></Col>
      <Col xs={24} lg={9}><ReminderCard stats={stats} loading={loading} onNavigate={navigate} /></Col>
    </Row>
    <Row gutter={[16, 16]} style={{ marginTop: 16 }}><Col xs={24} lg={15}><Card title="最近动态" extra={<Button type="link" onClick={() => navigate('/moments')}>全部日常</Button>}>{loading ? <Skeleton active paragraph={{ rows: 4 }} /> : stats?.recentMoments.length ? <div className="dashboard-moment-list">{stats.recentMoments.map((moment) => <div className="dashboard-moment-row" key={moment.id}><span className="dashboard-moment-emoji">{moment.mood ?? '📔'}</span><div><Typography.Text strong>{moment.content.slice(0, 72)}{moment.content.length > 72 ? '…' : ''}</Typography.Text><div><Typography.Text type="secondary" style={{ fontSize: 12 }}>{moment.createdAt.slice(0, 10)}{moment.location ? ` · 📍 ${moment.location}` : ''}</Typography.Text></div></div></div>)}</div> : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="用一条日常，记录今天的瞬间" />}</Card></Col><Col xs={24} lg={9}><Card title="今天的节奏"><div className="dashboard-progress-block"><Typography.Text>计划完成度</Typography.Text><Progress percent={planPercent} strokeColor="#2f9c67" /></div><div className="dashboard-progress-block"><Typography.Text>习惯完成度</Typography.Text><Progress percent={habitPercent} strokeColor="#54c5a1" /></div><Typography.Text type="secondary">每一次完成，都会成为明天更从容的底气。</Typography.Text></Card></Col></Row>
  </>;
}

function ReminderCard({ stats, loading, onNavigate }: { stats: DashboardStats | null; loading: boolean; onNavigate: (path: string) => void }) {
  const reminders = stats ? [...stats.expiringAssets.slice(0, 3).map((item) => ({ id: `asset-${item.asset.id}`, icon: item.asset.icon, title: item.asset.name, description: deadlineText(item.daysUntil), path: '/assets', urgent: item.daysUntil <= 3 })), ...stats.overduePlans.slice(0, 2).map((plan) => ({ id: `plan-${plan.id}`, icon: '🗓️', title: plan.title, description: `${plan.period} 未完成`, path: '/discipline/plans', urgent: true }))] : [];
  return <Card title="提醒"><div className="dashboard-reminder-list">{loading ? <Skeleton active paragraph={{ rows: 4 }} /> : reminders.length ? reminders.map((reminder) => <button type="button" key={reminder.id} className={`dashboard-reminder ${reminder.urgent ? 'urgent' : ''}`} onClick={() => onNavigate(reminder.path)}><span>{reminder.icon}</span><span className="dashboard-reminder-body"><strong>{reminder.title}</strong><small>{reminder.description}</small></span><span>›</span></button>) : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无待处理提醒" />}</div></Card>;
}

function deadlineText(days: number) { return days < 0 ? `已过期 ${Math.abs(days)} 天` : days === 0 ? '今日到期' : `还有 ${days} 天到期`; }
function MetricCard({ icon, color, label, value, progress, loading }: { icon: ReactNode; color: string; label: string; value: string; progress?: number; loading: boolean }) { return <Card className="stat-card"><div className="stat-icon" style={{ background: color, color: '#315943' }}>{icon}</div><Typography.Text type="secondary">{label}</Typography.Text>{loading ? <Skeleton.Input active size="small" style={{ display: 'block', width: 92, marginTop: 7 }} /> : <Typography.Title level={3} style={{ margin: '5px 0 0' }}>{value}</Typography.Title>}{progress !== undefined && <Progress percent={progress} showInfo={false} size="small" strokeColor="#2f9c67" style={{ marginTop: 9 }} />}</Card>; }
function ActionCard({ icon, title, description, onClick }: { icon: ReactNode; title: string; description: string; onClick: () => void }) { return <Card size="small" className="action-card" onClick={onClick}><div className="action-icon">{icon}</div><Typography.Text strong>{title}</Typography.Text><br /><Typography.Text type="secondary" style={{ fontSize: 12 }}>{description}</Typography.Text></Card>; }
