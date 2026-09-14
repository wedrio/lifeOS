import { useCallback, useEffect, useMemo, useState } from 'react';
import { Card, Col, Empty, Input, Progress, Row, Skeleton, Statistic, Table, Typography, message } from 'antd';
import type { FinanceStats } from '@lifeos/shared';
import { dataSource } from '../data';
import { currentMonth, formatCents } from '../lib/finance';
import '../styles/finance.css';

const colors = ['#5b5ce2', '#53a8ff', '#54c5a1', '#f4a261', '#e76f8a', '#a77bdc', '#78909c', '#e9c46a'];

export function FinanceStatsPage() {
  const [period, setPeriod] = useState(currentMonth());
  const [stats, setStats] = useState<FinanceStats | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try { setStats(await dataSource.stats.finance(period)); }
    catch (error) { message.error(error instanceof Error ? error.message : '报表加载失败'); }
    finally { setLoading(false); }
  }, [period]);
  useEffect(() => { void load(); }, [load]);

  const net = (stats?.income ?? 0) - (stats?.expense ?? 0);
  const accountTotal = useMemo(() => stats?.balanceByAccount.reduce((total, item) => total + item.balance, 0) ?? 0, [stats]);

  return <>
    <section className="page-heading">
      <div><h1>财务报表</h1><p>用数据回顾收支，也看见每一分努力的沉淀。</p></div>
      <Input type="month" value={period} onChange={(event) => setPeriod(event.target.value || currentMonth())} style={{ width: 148 }} aria-label="报表月份" />
    </section>
    <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
      <Col xs={24} sm={8}><Card><Statistic title="本月收入" value={(stats?.income ?? 0) / 100} precision={2} prefix="¥" valueStyle={{ color: '#23936d' }} /></Card></Col>
      <Col xs={24} sm={8}><Card><Statistic title="本月支出" value={(stats?.expense ?? 0) / 100} precision={2} prefix="¥" valueStyle={{ color: '#db5161' }} /></Card></Col>
      <Col xs={24} sm={8}><Card><Statistic title={net >= 0 ? '本月结余' : '本月缺口'} value={Math.abs(net) / 100} precision={2} prefix="¥" valueStyle={{ color: net >= 0 ? '#5b5ce2' : '#db5161' }} /></Card></Col>
    </Row>
    <Row gutter={[16, 16]}>
      <Col xs={24} xl={15}><Card title="近 12 个月收支趋势" extra={<ChartLegend />}><TrendChart data={stats?.monthlyTrend ?? []} loading={loading} /></Card></Col>
      <Col xs={24} xl={9}><Card title="本月支出分类"><ExpenseDonut stats={stats} loading={loading} /></Card></Col>
      <Col xs={24}><Card title="账户余额分布" extra={<Typography.Text type="secondary">总资产 {formatCents(accountTotal)}</Typography.Text>}>
        {loading ? <Skeleton active paragraph={{ rows: 4 }} /> : stats?.balanceByAccount.length ? <Row gutter={[22, 18]}>{stats.balanceByAccount.map(({ account, balance }) => {
          const percent = accountTotal > 0 ? Math.max(0, Math.round(balance / accountTotal * 100)) : 0;
          return <Col xs={24} md={12} xl={6} key={account.id}><Typography.Text><span style={{ fontSize: 18, marginRight: 6 }}>{account.icon}</span>{account.name}</Typography.Text><Typography.Title level={4} style={{ margin: '7px 0 8px' }}>{formatCents(balance)}</Typography.Title><Progress percent={percent} showInfo={false} size="small" strokeColor="#5b5ce2" /></Col>;
        })}</Row> : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="还没有账户" />}
      </Card></Col>
      <Col xs={24}><Card title="支出分类明细">
        <Table rowKey={({ category }) => category.id} dataSource={stats?.expenseByCategory ?? []} loading={loading} pagination={false} locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="本月暂无支出" /> }} columns={[
          { title: '分类', render: (_, item) => <span><span style={{ fontSize: 18, marginRight: 7 }}>{item.category.icon}</span>{item.category.name}</span> },
          { title: '金额', align: 'right', render: (_, item) => formatCents(item.amount) },
          { title: '占比', align: 'right', render: (_, item) => `${stats?.expense ? Math.round(item.amount / stats.expense * 100) : 0}%` },
        ]} />
      </Card></Col>
    </Row>
  </>;
}

function ChartLegend() { return <span style={{ display: 'inline-flex', gap: 12, fontSize: 12, color: '#77798a' }}><span><i className="legend-dot" style={{ display: 'inline-block', background: '#5b5ce2', marginRight: 5 }} />收入</span><span><i className="legend-dot" style={{ display: 'inline-block', background: '#e76f8a', marginRight: 5 }} />支出</span></span>; }

function TrendChart({ data, loading }: { data: FinanceStats['monthlyTrend']; loading: boolean }) {
  if (loading) return <div className="chart-shell"><Skeleton active paragraph={{ rows: 6 }} /></div>;
  if (!data.some((item) => item.income || item.expense)) return <div className="empty-chart"><Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="还没有足够的收支数据" /></div>;
  const max = Math.max(...data.flatMap((item) => [item.income, item.expense]), 1);
  const width = 700; const height = 220; const paddingX = 26; const paddingY = 22;
  const point = (value: number, index: number) => [paddingX + index * ((width - paddingX * 2) / Math.max(data.length - 1, 1)), height - paddingY - value / max * (height - paddingY * 2)] as const;
  const path = (key: 'income' | 'expense') => data.map((item, index) => { const [x, y] = point(item[key], index); return `${index ? 'L' : 'M'} ${x} ${y}`; }).join(' ');
  return <div className="chart-shell"><svg className="trend-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="近十二个月收入和支出趋势图"><line x1={paddingX} x2={width - paddingX} y1={height - paddingY} y2={height - paddingY} stroke="#e5e6ef" /><line x1={paddingX} x2={width - paddingX} y1={height / 2} y2={height / 2} stroke="#f0f0f5" strokeDasharray="4 5" /><path d={path('income')} fill="none" stroke="#5b5ce2" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /><path d={path('expense')} fill="none" stroke="#e76f8a" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />{data.map((item, index) => { const [incomeX, incomeY] = point(item.income, index); const [expenseX, expenseY] = point(item.expense, index); return <g key={item.period}><circle cx={incomeX} cy={incomeY} r="3.5" fill="#5b5ce2" /><circle cx={expenseX} cy={expenseY} r="3.5" fill="#e76f8a" /><text x={incomeX} y={height - 3} textAnchor="middle" fill="#858697" fontSize="11">{item.period.slice(5)}月</text></g>; })}</svg></div>;
}

function ExpenseDonut({ stats, loading }: { stats: FinanceStats | null; loading: boolean }) {
  if (loading) return <div className="empty-chart"><Skeleton.Avatar active size={150} shape="circle" /></div>;
  const items = stats?.expenseByCategory ?? [];
  const total = stats?.expense ?? 0;
  if (!items.length || !total) return <div className="empty-chart"><Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="本月暂无支出" /></div>;
  let cursor = 0;
  const segments = items.map((item, index) => { const start = cursor; cursor += item.amount / total * 100; return `${colors[index % colors.length]} ${start}% ${cursor}%`; });
  return <div className="donut-layout"><div className="donut" style={{ background: `conic-gradient(${segments.join(', ')})` }}><div className="donut-center"><Typography.Text type="secondary" style={{ fontSize: 12 }}>本月支出</Typography.Text><Typography.Text strong>{formatCents(total)}</Typography.Text></div></div><div className="donut-legend">{items.map((item, index) => <div className="donut-legend-row" key={item.category.id}><span className="legend-title"><i className="legend-dot" style={{ background: colors[index % colors.length] }} />{item.category.icon} {item.category.name}</span><span>{Math.round(item.amount / total * 100)}%</span></div>)}</div></div>;
}
