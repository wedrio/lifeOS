import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button, Card, Checkbox, Empty, Modal, Popconfirm, Progress, Segmented, Skeleton, Space, Switch, Tag, Tooltip, Typography, message } from 'antd';
import { CaretDownOutlined, CaretRightOutlined, DeleteOutlined, DownOutlined, EditOutlined, ForwardOutlined, LeftOutlined, PlusOutlined, RightOutlined, UpOutlined } from '@ant-design/icons';
import type { Plan, PlanLevel, PlanStatus } from '@lifeos/shared';
import { dataSource, generateDisciplineDemoData } from '../data';
import { addDays, defaultPeriod, isPlanOverdue, periodInputType, periodLabel, relativeDayLabel, shiftPlanPeriod, today, weekPeriodStart } from '../lib/dates';
import { PlanFormModal } from '../components/discipline/PlanFormModal';
import { fireCelebrationCannon, fireConfetti, SpotlightCard } from '../components/ui';
import '../styles/discipline.css';

const levelOptions: Array<{ label: string; value: PlanLevel }> = [{ label: '年计划', value: 'year' }, { label: '月计划', value: 'month' }, { label: '周计划', value: 'week' }, { label: '日计划', value: 'day' }];
const levelLabel: Record<PlanLevel, string> = { year: '年计划', month: '月计划', week: '周计划', day: '日计划' };
type PlanViewMode = PlanLevel | 'overdue' | 'upcoming' | 'review';
const priorityMeta = { low: { label: '低优先级', color: 'default' }, medium: { label: '中优先级', color: 'blue' }, high: { label: '高优先级', color: 'red' } } as const;
const statusMeta: Record<PlanStatus, { label: string; color: string }> = { not_started: { label: '待开始', color: 'default' }, in_progress: { label: '进行中', color: 'processing' }, completed: { label: '已完成', color: 'success' }, cancelled: { label: '已取消', color: 'default' } };

interface PlanNode { plan: Plan; children: PlanNode[] }

export function PlansPage() {
  const [viewMode, setViewMode] = useState<PlanViewMode>('day');
  const [period, setPeriod] = useState(defaultPeriod('day'));
  const [plans, setPlans] = useState<Plan[]>([]);
  const [allPlans, setAllPlans] = useState<Plan[]>([]);
  const [autoRollOver, setAutoRollOver] = useState(true);
  const [loading, setLoading] = useState(true);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<Plan | undefined>();
  const [editorPresetPeriod, setEditorPresetPeriod] = useState<string | undefined>();
  const [collapsedIds, setCollapsedIds] = useState<ReadonlySet<string>>(new Set());
  /** 结转确认弹窗：同一自然日最多询问一次 */
  const askedRolloverRef = useRef('');

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const settings = await dataSource.settings.get();
      setAutoRollOver(settings.autoRollOverIncompletePlans);
      const all = await dataSource.plans.list({ includeCompleted: true });
      const visible = viewMode === 'overdue' || viewMode === 'upcoming' || viewMode === 'review' ? all : await dataSource.plans.list({ level: viewMode, period, includeCompleted: true });
      setPlans(visible);
      setAllPlans(all);
    } catch (error) { message.error(error instanceof Error ? error.message : '计划加载失败'); }
    finally { setLoading(false); }
  }, [viewMode, period]);
  useEffect(() => { void reload(); }, [reload]);

  // 确认式结转：进入今天的日视图时若有过期日计划，弹窗询问一次性补齐（同一自然日最多一次）
  useEffect(() => {
    if (viewMode !== 'day' || period !== today() || !autoRollOver || askedRolloverRef.current === today()) return;
    const overdueCount = allPlans.filter((item) => item.level === 'day' && item.period < today() && !['completed', 'cancelled'].includes(item.status)).length;
    if (overdueCount === 0) return;
    askedRolloverRef.current = today();
    Modal.confirm({
      title: '补齐结转未完成日计划',
      content: `有 ${overdueCount} 项过去周期的日计划未完成，是否全部结转到今天？取消后可在「逾期」视图中逐项处理。`,
      okText: '结转到今天',
      cancelText: '先不了',
      onOk: async () => {
        const moved = await dataSource.plans.rollOverOverdueDayPlans(today());
        message.success(`已结转 ${moved} 项日计划到今天`);
        await reload();
      },
    });
  }, [viewMode, period, autoRollOver, allPlans, reload]);

  const parentById = useMemo(() => new Map(allPlans.map((plan) => [plan.id, plan])), [allPlans]);
  /** 各计划的后代总数（含子、孙……），用于删除级联确认提示 */
  const descendantCountById = useMemo(() => {
    const childrenMap = new Map<string, string[]>();
    allPlans.forEach((plan) => { if (plan.parentId) { const arr = childrenMap.get(plan.parentId) ?? []; arr.push(plan.id); childrenMap.set(plan.parentId, arr); } });
    const count = (id: string): number => (childrenMap.get(id) ?? []).reduce((sum, childId) => sum + 1 + count(childId), 0);
    return new Map(allPlans.map((plan) => [plan.id, count(plan.id)]));
  }, [allPlans]);
  /** 树形视图：当前周期计划为根（按 parentId 分组，同组内才是排序兄弟），后代从全量 plans 挂载（可跨层级/周期） */
  const treeGroups = useMemo(() => {
    const childrenMap = new Map<string, Plan[]>();
    allPlans.forEach((plan) => { if (plan.parentId) { const arr = childrenMap.get(plan.parentId) ?? []; arr.push(plan); childrenMap.set(plan.parentId, arr); } });
    const build = (plan: Plan, depth: number): PlanNode => ({
      plan,
      children: depth >= 5 ? [] : (childrenMap.get(plan.id) ?? []).sort((a, b) => a.order - b.order).map((child) => build(child, depth + 1)),
    });
    const groups = new Map<string, PlanNode[]>();
    plans.forEach((plan) => {
      const key = plan.parentId ?? '';
      const arr = groups.get(key) ?? [];
      arr.push(build(plan, 0));
      groups.set(key, arr);
    });
    return [...groups.entries()];
  }, [plans, allPlans]);
  const completion = plans.length ? Math.round(plans.filter((plan) => plan.status === 'completed').length / plans.length * 100) : 0;
  /** 逾期计划：已过周期且未完成/未取消，按层级分区（年/月/周/日）、周期升序 */
  const overduePlans = useMemo(() => allPlans
    .filter((plan) => plan.status !== 'completed' && plan.status !== 'cancelled' && isPlanOverdue(plan))
    .sort((a, b) => a.period.localeCompare(b.period) || a.order - b.order), [allPlans]);
  const overdueGroups = useMemo(() => (['year', 'month', 'week', 'day'] as PlanLevel[])
    .map((lv) => ({ level: lv, items: overduePlans.filter((plan) => plan.level === lv) }))
    .filter((group) => group.items.length > 0), [overduePlans]);
  /** 未来 7 天（含今天）的日计划，按天分组、组内按 order 排列 */
  const upcomingGroups = useMemo(() => {
    const start = today();
    const window = allPlans.filter((plan) => plan.level === 'day' && plan.period >= start && plan.period <= addDays(start, 6));
    return Array.from({ length: 7 }, (_, index) => addDays(start, index))
      .map((date) => ({ date, items: window.filter((plan) => plan.period === date).sort((a, b) => a.order - b.order) }));
  }, [allPlans]);
  const upcomingTotal = upcomingGroups.reduce((sum, group) => sum + group.items.length, 0);
  /** 周复盘统计：以周为单位（period 为周周期），日计划按周窗口、周/月/年计划按周期匹配 */
  const review = useMemo(() => {
    const start = weekPeriodStart(period);
    const end = addDays(start, 6);
    const inRange = (plan: Plan) => {
      if (plan.status === 'cancelled') return false;
      if (plan.level === 'day') return plan.period >= start && plan.period <= end;
      if (plan.level === 'week') return plan.period === period;
      if (plan.level === 'month') return plan.period === start.slice(0, 7); // 周期含 W 后缀，月份取周一所在月
      return plan.period === period.slice(0, 4);
    };
    const rateOf = (plans: Plan[]) => {
      const done = plans.filter((plan) => plan.status === 'completed').length;
      return { done, total: plans.length, rate: plans.length ? Math.round(done / plans.length * 100) : 0 };
    };
    const levelStat = (level: PlanLevel) => rateOf(allPlans.filter((plan) => plan.level === level && inRange(plan)));
    const execPlans = allPlans.filter((plan) => (plan.level === 'day' || plan.level === 'week') && inRange(plan));
    const dayStats = (week: string) => rateOf(allPlans.filter((plan) => {
      if (plan.level !== 'day' || plan.status === 'cancelled') return false;
      const s = weekPeriodStart(week);
      return plan.period >= s && plan.period <= addDays(s, 6);
    }));
    return {
      levels: (['year', 'month', 'week', 'day'] as PlanLevel[]).map((level) => ({ level, ...levelStat(level) })),
      priorityStats: (['high', 'medium', 'low'] as const).map((priority) => ({ priority, ...rateOf(execPlans.filter((plan) => plan.priority === priority)) })),
      dayTrend: dayStats(period).rate - dayStats(shiftPlanPeriod('week', period, -1)).rate,
    };
  }, [allPlans, period]);
  const changeViewMode = (next: PlanViewMode) => {
    setViewMode(next);
    if (next === 'upcoming') setPeriod(today());
    else if (next === 'review') setPeriod(defaultPeriod('week'));
    else if (next !== 'overdue') setPeriod(defaultPeriod(next));
  };
  const openEditor = (plan?: Plan, presetPeriod?: string) => { setEditing(plan); setEditorPresetPeriod(presetPeriod); setEditorOpen(true); };
  const togglePlan = async (plan: Plan) => {
    try {
      const completed = plan.status !== 'completed';
      await dataSource.plans.update(plan.id, { status: completed ? 'completed' : 'not_started', progress: completed ? 100 : 0 });
      if (completed) {
        fireConfetti();
        message.success('计划已完成！🎯');
      } else {
        message.info('计划已恢复为待开始');
      }
      await reload();
    } catch (error) { message.error(error instanceof Error ? error.message : '更新失败'); }
  };
  const removePlan = async (plan: Plan) => {
    try { await dataSource.plans.remove(plan.id); message.success('计划已删除'); await reload(); }
    catch (error) { message.error(error instanceof Error ? error.message : '删除失败'); }
  };
  const toggleCollapse = (planId: string) => {
    setCollapsedIds((prev) => {
      const next = new Set(prev);
      if (next.has(planId)) next.delete(planId); else next.add(planId);
      return next;
    });
  };
  /** 上移/下移：仅在同级兄弟之间交换 order */
  const movePlan = async (planId: string, siblingIds: string[], direction: -1 | 1) => {
    const index = siblingIds.indexOf(planId);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= siblingIds.length) return;
    const a = allPlans.find((item) => item.id === siblingIds[index]);
    const b = allPlans.find((item) => item.id === siblingIds[target]);
    if (!a || !b) return;
    try {
      await dataSource.plans.update(a.id, { order: b.order });
      await dataSource.plans.update(b.id, { order: a.order === b.order ? b.order + (direction === 1 ? 1 : -1) : a.order });
      await reload();
    } catch (error) { message.error(error instanceof Error ? error.message : '排序失败'); }
  };
  /** 逾期日计划一键结转今日：排到今天日计划的末尾（父计划汇总由 update 内自动重算） */
  const rollOverToToday = async (plan: Plan) => {
    try {
      const todayOrders = allPlans.filter((item) => item.level === 'day' && item.period === today()).map((item) => item.order);
      await dataSource.plans.update(plan.id, { period: today(), order: (todayOrders.length ? Math.max(...todayOrders) : -1) + 1 });
      message.success('已结转到今天');
      await reload();
    } catch (error) { message.error(error instanceof Error ? error.message : '结转失败'); }
  };
  const setRollOver = async (enabled: boolean) => {
    try {
      await dataSource.settings.update({ autoRollOverIncompletePlans: enabled });
      setAutoRollOver(enabled);
      message.success(enabled ? '已开启自动结转' : '已关闭自动结转');
    } catch (error) { message.error(error instanceof Error ? error.message : '设置保存失败'); }
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
    <section className="page-heading"><div><h1>四级计划</h1><p>从年度方向拆解到今天，让每个行动都与目标有关。</p></div><Space wrap><Button onClick={() => void seedDemo()}>填充演示数据</Button><Button type="primary" icon={<PlusOutlined />} onClick={() => openEditor()}>新建计划</Button></Space></section>
    <SpotlightCard className="plan-summary-card" spotlightColor="rgba(35, 141, 91, 0.16)" style={{ marginBottom: 16 }}>
      <div style={{ padding: 20 }}>
        <div className="finance-toolbar">
          <Segmented<PlanViewMode> value={viewMode} onChange={changeViewMode} options={[...levelOptions, { label: overduePlans.length > 0 ? `逾期 · ${overduePlans.length}` : '逾期', value: 'overdue' as PlanViewMode }, { label: '未来 7 天', value: 'upcoming' as PlanViewMode }, { label: '复盘', value: 'review' as PlanViewMode }]} />
          {(viewMode === 'year' || viewMode === 'month' || viewMode === 'week' || viewMode === 'day') && <Space size={14}>
            <span style={{ color: '#77798a', fontSize: 13 }}>自动结转未完成日计划</span>
            <Switch size="small" checked={autoRollOver} onChange={(enabled) => void setRollOver(enabled)} />
            <div className="plan-period-control">
              <Button type="text" icon={<LeftOutlined />} aria-label="上一周期" onClick={() => setPeriod((current) => shiftPlanPeriod(viewMode, current, -1))} />
              <Tooltip title={periodLabel(viewMode, period)}>
                <input className="ant-input" type={periodInputType(viewMode)} value={period} onChange={(event) => setPeriod(event.target.value || defaultPeriod(viewMode))} aria-label="计划周期" />
              </Tooltip>
              <Button type="text" icon={<RightOutlined />} aria-label="下一周期" onClick={() => setPeriod((current) => shiftPlanPeriod(viewMode, current, 1))} />
            </div>
          </Space>}
        </div>
        {(viewMode === 'year' || viewMode === 'month' || viewMode === 'week' || viewMode === 'day') && <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 8 }}>
          <Typography.Text type="secondary">{periodLabel(viewMode, period)} 完成度</Typography.Text>
          <Progress percent={completion} showInfo={false} strokeColor="#2f9c67" style={{ maxWidth: 320 }} />
        </div>}
        {(viewMode === 'overdue' || viewMode === 'upcoming') && <div style={{ marginTop: 8 }}><Typography.Text type="secondary">{viewMode === 'overdue' ? `共 ${overduePlans.length} 项逾期未完成，按周期从旧到新排列` : `未来 7 天（含今天）共 ${upcomingTotal} 项日计划`}</Typography.Text></div>}
        {viewMode === 'review' && <div style={{ marginTop: 8 }}>
          <Space size={14}>
            <Typography.Text type="secondary">回顾周期</Typography.Text>
            <div className="plan-period-control">
              <Button type="text" icon={<LeftOutlined />} aria-label="上一周期" onClick={() => setPeriod((current) => shiftPlanPeriod('week', current, -1))} />
              <input className="ant-input" type="week" value={period} onChange={(event) => setPeriod(event.target.value || defaultPeriod('week'))} aria-label="复盘周期" />
              <Button type="text" icon={<RightOutlined />} aria-label="下一周期" onClick={() => setPeriod((current) => shiftPlanPeriod('week', current, 1))} />
            </div>
          </Space>
          <Typography.Text type="secondary" style={{ marginLeft: 12 }}>统计该周相关的年/月/周/日计划（已取消不参与）</Typography.Text>
        </div>}
      </div>
    </SpotlightCard>

    <Card title={viewMode === 'overdue' ? '逾期的计划' : viewMode === 'upcoming' ? '未来 7 天的计划' : viewMode === 'review' ? '计划复盘' : viewMode === 'day' && period === today() ? '今天的计划' : `${periodLabel(viewMode, period)} 的计划`} extra={<Typography.Text type="secondary">{viewMode === 'overdue' ? overduePlans.length : viewMode === 'upcoming' ? upcomingTotal : viewMode === 'review' ? periodLabel('week', period) : plans.length} 项</Typography.Text>}>
      {loading ? <Skeleton active paragraph={{ rows: 8 }} /> : viewMode === 'overdue'
        ? overdueGroups.length === 0
          ? <Empty description="没有逾期的计划，保持这个节奏"><Button type="primary" onClick={() => openEditor()}>创建计划</Button></Empty>
          : <div className="plan-list">{overdueGroups.map((group) => <Fragment key={group.level}><div className="plan-overdue-group-title"><Tag color="red">{levelLabel[group.level]}</Tag><Typography.Text type="secondary">{group.items.length} 项</Typography.Text></div>{group.items.map((plan) => <PlanItem key={plan.id} node={{ plan, children: [] }} index={0} siblings={[]} depth={0} parent={plan.parentId ? parentById.get(plan.parentId) : undefined} descendantCount={descendantCountById.get(plan.id) ?? 0} collapsedIds={collapsedIds} onToggleCollapse={toggleCollapse} onToggle={(item) => void togglePlan(item)} onEdit={openEditor} onDelete={(item) => void removePlan(item)} onMove={() => undefined} onRollOver={plan.level === 'day' ? () => void rollOverToToday(plan) : undefined} />)}</Fragment>)}</div>
        : viewMode === 'upcoming'
          ? upcomingTotal === 0
            ? <Empty description="未来 7 天还没有计划"><Button type="primary" onClick={() => openEditor()}>创建计划</Button></Empty>
            : <div className="plan-list">{upcomingGroups.map((group) => <Fragment key={group.date}><div className="plan-overdue-group-title"><Tag color={group.date === today() ? 'green' : 'blue'}>{periodLabel('day', group.date)} · {relativeDayLabel(group.date)}</Tag><Typography.Text type="secondary">{group.items.length} 项</Typography.Text><Button type="text" size="small" icon={<PlusOutlined />} aria-label={`创建 ${group.date} 的计划`} onClick={() => openEditor(undefined, group.date)} /></div>{group.items.map((plan) => <PlanItem key={plan.id} node={{ plan, children: [] }} index={0} siblings={[]} depth={0} parent={plan.parentId ? parentById.get(plan.parentId) : undefined} descendantCount={descendantCountById.get(plan.id) ?? 0} collapsedIds={collapsedIds} onToggleCollapse={toggleCollapse} onToggle={(item) => void togglePlan(item)} onEdit={openEditor} onDelete={(item) => void removePlan(item)} onMove={() => undefined} />)}</Fragment>)}</div>
        : viewMode === 'review'
          ? <div className="plan-list">
              <div className="habit-stats plan-review-stats">
                {review.levels.map(({ level, done, total, rate }) => (
                  <div key={level} className="habit-stat">
                    <span>{levelLabel[level]}完成率</span>
                    <strong>{rate}%</strong>
                    <small>{done}/{total} 项{level === 'day' && total > 0 && review.dayTrend !== 0 ? ` · 较上周 ${review.dayTrend > 0 ? '+' : ''}${review.dayTrend}pp` : ''}</small>
                  </div>
                ))}
              </div>
              <div className="plan-review-card">
                <Typography.Text type="secondary">执行层优先级分布（本周日计划 + 周计划）</Typography.Text>
                {review.priorityStats.map(({ priority, done, total, rate }) => (
                  <div key={priority} className="plan-review-priority">
                    <Tag color={priorityMeta[priority].color}>{priorityMeta[priority].label}</Tag>
                    <Progress percent={rate} size="small" showInfo={false} strokeColor="#2f9c67" style={{ flex: 1 }} />
                    <Typography.Text type="secondary">{done}/{total}</Typography.Text>
                  </div>
                ))}
              </div>
              <div className="plan-overdue-group-title">
                <Tag color={overduePlans.length > 0 ? 'red' : 'green'}>当前逾期 {overduePlans.length} 项</Tag>
                {overduePlans.length > 0 && <Button size="small" onClick={() => changeViewMode('overdue')}>去处理</Button>}
              </div>
            </div>
          : plans.length === 0 ? <Empty description="这个周期还没有计划"><Button type="primary" onClick={() => openEditor()}>创建计划</Button></Empty> : <div className="plan-list">{treeGroups.map(([parentKey, nodes]) => <Fragment key={parentKey || 'root'}>{nodes.map((node, index) => <PlanItem key={node.plan.id} node={node} index={index} siblings={nodes} depth={0} parent={parentKey ? parentById.get(parentKey) : undefined} descendantCount={descendantCountById.get(node.plan.id) ?? 0} collapsedIds={collapsedIds} onToggleCollapse={toggleCollapse} onToggle={(plan) => void togglePlan(plan)} onEdit={openEditor} onDelete={(plan) => void removePlan(plan)} onMove={(planId, siblingIds, direction) => void movePlan(planId, siblingIds, direction)} />)}</Fragment>)}</div>}
    </Card>
    <PlanFormModal open={editorOpen} plan={editing} plans={allPlans} defaultLevel={viewMode === 'overdue' || viewMode === 'upcoming' || viewMode === 'review' ? 'day' : viewMode} defaultPlanPeriod={editorPresetPeriod ?? period} onClose={() => { setEditorOpen(false); setEditing(undefined); setEditorPresetPeriod(undefined); }} onSaved={reload} />
  </>;
}

function PlanItem({ node, index, siblings, depth, parent, descendantCount, collapsedIds, onToggleCollapse, onToggle, onEdit, onDelete, onMove, onRollOver }: {
  node: PlanNode;
  index: number;
  siblings: PlanNode[];
  depth: number;
  parent?: Plan;
  descendantCount: number;
  collapsedIds: ReadonlySet<string>;
  onToggleCollapse: (planId: string) => void;
  onToggle: (plan: Plan) => void;
  onEdit: (plan: Plan) => void;
  onDelete: (plan: Plan) => void;
  onMove: (planId: string, siblingIds: string[], direction: -1 | 1) => void;
  onRollOver?: () => void;
}) {
  const plan = node.plan;
  const priority = priorityMeta[plan.priority];
  const status = statusMeta[plan.status];
  const childCount = node.children.length;
  const collapsed = collapsedIds.has(plan.id);
  return <>
    <div className={`plan-item ${plan.status === 'completed' ? 'is-completed' : ''}`}>
      {childCount > 0 && <Button type="text" size="small" className="plan-tree-toggle" icon={collapsed ? <CaretRightOutlined /> : <CaretDownOutlined />} onClick={() => onToggleCollapse(plan.id)} aria-label={collapsed ? '展开子计划' : '折叠子计划'} />}
      <Tooltip title={childCount > 0 ? `勾选将级联完成全部 ${childCount} 个子计划` : undefined}><Checkbox checked={plan.status === 'completed'} onChange={() => onToggle(plan)} aria-label={`完成 ${plan.title}`} /></Tooltip>
      <div className="plan-item-main"><div className="plan-item-title-row"><span className="plan-item-title">{plan.title}</span><Tag color={status.color}>{status.label}</Tag><Tag color={priority.color}>{priority.label}</Tag>{childCount > 0 && <Tooltip title={`进度由 ${childCount} 个子计划自动汇总`}><Tag color="green">自动汇总</Tag></Tooltip>}</div><div className="plan-item-description">{plan.description}</div><div className="plan-item-meta">{parent && <span>↳ 关联：{parent.title}</span>}<span>进度 {plan.progress}%</span></div><div className="plan-item-progress"><Progress percent={plan.progress} size="small" showInfo={false} status={plan.status === 'cancelled' ? 'exception' : 'normal'} /></div></div>
      <div className="plan-item-actions">{onRollOver && <Tooltip title="结转到今天"><Button type="text" size="small" icon={<ForwardOutlined />} onClick={onRollOver} aria-label="结转到今天" /></Tooltip>}<Tooltip title="上移"><Button type="text" size="small" disabled={index <= 0} icon={<UpOutlined />} onClick={() => onMove(plan.id, siblings.map((item) => item.plan.id), -1)} /></Tooltip><Tooltip title="下移"><Button type="text" size="small" disabled={index >= siblings.length - 1} icon={<DownOutlined />} onClick={() => onMove(plan.id, siblings.map((item) => item.plan.id), 1)} /></Tooltip><Button type="text" size="small" icon={<EditOutlined />} onClick={() => onEdit(plan)} aria-label="编辑计划" /><Popconfirm title="删除这个计划？" description={descendantCount > 0 ? `将连带删除全部 ${descendantCount} 个后代计划。` : undefined} onConfirm={() => onDelete(plan)} okText="删除" cancelText="取消"><Button type="text" danger size="small" icon={<DeleteOutlined />} aria-label="删除计划" /></Popconfirm></div>
    </div>
    {childCount > 0 && !collapsed && <div className="plan-tree-children">{node.children.map((child, childIndex) => <PlanItem key={child.plan.id} node={child} index={childIndex} siblings={node.children} depth={depth + 1} descendantCount={descendantCount} collapsedIds={collapsedIds} onToggleCollapse={onToggleCollapse} onToggle={onToggle} onEdit={onEdit} onDelete={onDelete} onMove={onMove} />)}</div>}
  </>;
}
