import { useEffect, useState, type ReactNode } from 'react';
import { Button, Card, Col, Progress, Row, Skeleton, Typography } from 'antd';
import { CalendarOutlined, CheckCircleOutlined, DollarOutlined, FileTextOutlined, PlusOutlined, WarningOutlined } from '@ant-design/icons';
import type { DashboardStats } from '@lifeos/shared';
import { useNavigate } from 'react-router-dom';
import { dataSource } from '../data';

const money = new Intl.NumberFormat('zh-CN', { style: 'currency', currency: 'CNY', minimumFractionDigits: 0, maximumFractionDigits: 2 });
const cents = (value: number) => money.format(value / 100);

export function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const navigate = useNavigate();
  const now = new Date();

  useEffect(() => {
    let active = true;
    dataSource.stats.dashboard().then((data) => active && setStats(data)).catch(() => active && setStats(null));
    return () => { active = false; };
  }, []);

  const planPercent = stats?.plan.total ? Math.round((stats.plan.completed / stats.plan.total) * 100) : 0;
  const habitPercent = stats?.habits.total ? Math.round((stats.habits.completed / stats.habits.total) * 100) : 0;
  const budgetPercent = stats?.finance.budget?.total ? Math.min(100, Math.round((stats.finance.budgetSpent / stats.finance.budget.total) * 100)) : 0;

  return (
    <>
      <section className="page-heading">
        <div><h1>今天，慢慢变好</h1><p>{now.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })}</p></div>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/finance/transactions')}>记一笔</Button>
      </section>

      <Card className="dashboard-welcome" bordered={false}>
        <h1>你的生活，由你定义。</h1>
        <p>从一次打卡、一笔记录，开始把想过的生活变成今天的行动。</p>
      </Card>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} sm={12} xl={6}><MetricCard icon={<CheckCircleOutlined />} color="#e9e8ff" label="今日计划" value={stats ? `${stats.plan.completed} / ${stats.plan.total}` : '—'} loading={!stats} progress={planPercent} /></Col>
        <Col xs={24} sm={12} xl={6}><MetricCard icon={<CalendarOutlined />} color="#e1f8ef" label="习惯打卡" value={stats ? `${stats.habits.completed} / ${stats.habits.total}` : '—'} loading={!stats} progress={habitPercent} /></Col>
        <Col xs={24} sm={12} xl={6}><MetricCard icon={<DollarOutlined />} color="#fff2df" label="今日支出" value={stats ? cents(stats.finance.todayExpense) : '—'} loading={!stats} /></Col>
        <Col xs={24} sm={12} xl={6}><MetricCard icon={<WarningOutlined />} color="#ffe9eb" label="临近到期" value={stats ? `${stats.expiringAssets.length} 项` : '—'} loading={!stats} /></Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} lg={15}>
          <Card title="快速开始" extra={<Typography.Text type="secondary">A0 · 工程骨架</Typography.Text>}>
            <Row gutter={[12, 12]}>
              <Col xs={24} sm={8}><ActionCard icon={<DollarOutlined />} title="记一笔" description="收入、支出与账户" onClick={() => navigate('/finance/transactions')} /></Col>
              <Col xs={24} sm={8}><ActionCard icon={<CheckCircleOutlined />} title="打一次卡" description="建立今日好习惯" onClick={() => navigate('/discipline/habits')} /></Col>
              <Col xs={24} sm={8}><ActionCard icon={<FileTextOutlined />} title="写一条日常" description="记录此刻的心情" onClick={() => navigate('/moments')} /></Col>
            </Row>
          </Card>
        </Col>
        <Col xs={24} lg={9}>
          <Card title="本月预算">
            <Typography.Title level={3} style={{ margin: 0 }}>{stats?.finance.budget ? cents(stats.finance.budgetSpent) : '尚未设置'}</Typography.Title>
            <Typography.Text type="secondary">{stats?.finance.budget ? `预算 ${cents(stats.finance.budget.total)}` : 'A1 记账闭环将开放预算设置'}</Typography.Text>
            <Progress percent={budgetPercent} showInfo={Boolean(stats?.finance.budget)} strokeColor={budgetPercent >= 100 ? '#e4565c' : '#5b5ce2'} style={{ marginTop: 17 }} />
          </Card>
        </Col>
      </Row>
    </>
  );
}

function MetricCard({ icon, color, label, value, progress, loading }: { icon: ReactNode; color: string; label: string; value: string; progress?: number; loading: boolean }) {
  return <Card className="stat-card"><div className="stat-icon" style={{ background: color, color: '#42435d' }}>{icon}</div><Typography.Text type="secondary">{label}</Typography.Text>{loading ? <Skeleton.Input active size="small" style={{ display: 'block', width: 92, marginTop: 7 }} /> : <Typography.Title level={3} style={{ margin: '5px 0 0' }}>{value}</Typography.Title>}{progress !== undefined && <Progress percent={progress} showInfo={false} size="small" strokeColor="#5b5ce2" style={{ marginTop: 9 }} />}</Card>;
}

function ActionCard({ icon, title, description, onClick }: { icon: ReactNode; title: string; description: string; onClick: () => void }) {
  return <Card size="small" className="action-card" onClick={onClick}><div className="action-icon">{icon}</div><Typography.Text strong>{title}</Typography.Text><br /><Typography.Text type="secondary" style={{ fontSize: 12 }}>{description}</Typography.Text></Card>;
}
