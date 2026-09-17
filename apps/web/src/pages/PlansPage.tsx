import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button, Card, Checkbox, Empty, Popconfirm, Progress, Segmented, Skeleton, Space, Switch, Tag, Tooltip, Typography, message } from 'antd';
import { DeleteOutlined, DownOutlined, EditOutlined, LeftOutlined, PlusOutlined, RightOutlined, UpOutlined } from '@ant-design/icons';
import type { Plan, PlanLevel, PlanStatus } from '@lifeos/shared';
import { dataSource, generateDisciplineDemoData } from '../data';
import { addDays, defaultPeriod, periodInputType, periodLabel, shiftPlanPeriod, today } from '../lib/dates';
import { PlanFormModal } from '../components/discipline/PlanFormModal';
import { fireCelebrationCannon, fireConfetti, SpotlightCard } from '../components/ui';
import '../styles/discipline.css';

const levelOptions: Array<{ label: string; value: PlanLevel }> = [{ label: '年计划', value: 'year' }, { label: '月计划', value: 'month' }, { label: '周计划', value: 'week' }, { label: '日计划', value: 'day' }];
const priorityMeta = { low: { label: '低优先级', color: 'default' }, medium: { label: '中优先级', color: 'blue' }, high: { label: '高优先级', color: 'red' } } as const;
const statusMeta: Record<PlanStatus, { label: string; color: string }> = { not_started: { label: '待开始', color: 'default' }, in_progress: { label: '进行中', color: 'processing' }, completed: { label: '已完成', color: 'success' }, cancelled: { label: '已取消', color: 'default' } };

export function PlansPage() {
  const [level, setLevel] = useState<PlanLevel>('day');
  const [period, setPeriod] = useState(defaultPeriod('day'));
  const [plans, setPlans] = useState<Plan[]>([]);
  const [allPlans, setAllPlans] = useState<Plan[]>([]);
  const [autoRollOver, setAutoRollOver] = useState(true);
  const [loading, setLoading] = useState(true);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<Plan | undefined>();

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const settings = await dataSource.settings.get();
      setAutoRollOver(settings.autoRollOverIncompletePlans);
      if (level === 'day' && period === today() && settings.autoRollOverIncompletePlans) {
        const moved = await dataSource.plans.rollOverIncompleteDayPlans(addDays(today(), -1), today());
        if (moved > 0) message.info(`已自动结转 ${moved} 项昨日未完成计划`);
      }
      const [visible, all] = await Promise.all([
        dataSource.plans.list({ level, period, includeCompleted: true }),
        dataSource.plans.list({ includeCompleted: true }),
      ]);
      setPlans(visible);
      setAllPlans(all);
    } catch (error) { message.error(error instanceof Error ? error.message : '计划加载失败'); }
    finally { setLoading(false); }
  }, [level, period]);
  useEffect(() => { void reload(); }, [reload]);

  const parentById = useMemo(() => new Map(allPlans.map((plan) => [plan.id, plan])), [allPlans]);
  const completion = plans.length ? Math.round(plans.filter((plan) => plan.status === 'completed').length / plans.length * 100) : 0;
  const changeLevel = (next: PlanLevel) => { setLevel(next); setPeriod(defaultPeriod(next)); };
  const openEditor = (plan?: Plan) => { setEditing(plan); setEditorOpen(true); };
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
  const reorder = async (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= plans.length) return;
    const reordered = [...plans];
    [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
    try { await dataSource.plans.reorder(reordered.map((item) => item.id)); setPlans(reordered); }
    catch (error) { message.error(error instanceof Error ? error.message : '排序失败'); }
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
          <Segmented<PlanLevel> value={level} onChange={changeLevel} options={levelOptions} />
          <Space size={14}>
            <span style={{ color: '#77798a', fontSize: 13 }}>自动结转未完成日计划</span>
            <Switch size="small" checked={autoRollOver} onChange={(enabled) => void setRollOver(enabled)} />
            <div className="plan-period-control">
              <Button type="text" icon={<LeftOutlined />} aria-label="上一周期" onClick={() => setPeriod((current) => shiftPlanPeriod(level, current, -1))} />
              <Tooltip title={periodLabel(level, period)}>
                <input className="ant-input" type={periodInputType(level)} value={period} onChange={(event) => setPeriod(event.target.value || defaultPeriod(level))} aria-label="计划周期" />
              </Tooltip>
              <Button type="text" icon={<RightOutlined />} aria-label="下一周期" onClick={() => setPeriod((current) => shiftPlanPeriod(level, current, 1))} />
            </div>
          </Space>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 8 }}>
          <Typography.Text type="secondary">{periodLabel(level, period)} 完成度</Typography.Text>
          <Progress percent={completion} showInfo={false} strokeColor="#2f9c67" style={{ maxWidth: 320 }} />
        </div>
      </div>
    </SpotlightCard>

    <Card title={level === 'day' && period === today() ? '今天的计划' : `${periodLabel(level, period)} 的计划`} extra={<Typography.Text type="secondary">{plans.length} 项</Typography.Text>}>
      {loading ? <Skeleton active paragraph={{ rows: 8 }} /> : plans.length === 0 ? <Empty description="这个周期还没有计划"><Button type="primary" onClick={() => openEditor()}>创建计划</Button></Empty> : <div className="plan-list">{plans.map((plan, index) => <PlanItem key={plan.id} plan={plan} parent={plan.parentId ? parentById.get(plan.parentId) : undefined} canMoveUp={index > 0} canMoveDown={index < plans.length - 1} onToggle={() => void togglePlan(plan)} onEdit={() => openEditor(plan)} onDelete={() => void removePlan(plan)} onMove={(direction) => void reorder(index, direction)} />)}</div>}
    </Card>
    <PlanFormModal open={editorOpen} plan={editing} plans={allPlans} defaultLevel={level} defaultPlanPeriod={period} onClose={() => { setEditorOpen(false); setEditing(undefined); }} onSaved={reload} />
  </>;
}

function PlanItem({ plan, parent, canMoveUp, canMoveDown, onToggle, onEdit, onDelete, onMove }: { plan: Plan; parent?: Plan; canMoveUp: boolean; canMoveDown: boolean; onToggle: () => void; onEdit: () => void; onDelete: () => void; onMove: (direction: -1 | 1) => void }) {
  const priority = priorityMeta[plan.priority];
  const status = statusMeta[plan.status];
  return <div className={`plan-item ${plan.status === 'completed' ? 'is-completed' : ''}`}><Checkbox checked={plan.status === 'completed'} onChange={onToggle} aria-label={`完成 ${plan.title}`} /><div className="plan-item-main"><div className="plan-item-title-row"><span className="plan-item-title">{plan.title}</span><Tag color={status.color}>{status.label}</Tag><Tag color={priority.color}>{priority.label}</Tag></div>{plan.description && <div className="plan-item-description">{plan.description}</div>}<div className="plan-item-meta">{parent && <span>↳ 关联：{parent.title}</span>}<span>进度 {plan.progress}%</span></div><div className="plan-item-progress"><Progress percent={plan.progress} size="small" showInfo={false} status={plan.status === 'cancelled' ? 'exception' : 'normal'} /></div></div><div className="plan-item-actions"><Tooltip title="上移"><Button type="text" size="small" disabled={!canMoveUp} icon={<UpOutlined />} onClick={() => onMove(-1)} /></Tooltip><Tooltip title="下移"><Button type="text" size="small" disabled={!canMoveDown} icon={<DownOutlined />} onClick={() => onMove(1)} /></Tooltip><Button type="text" size="small" icon={<EditOutlined />} onClick={onEdit} aria-label="编辑计划" /><Popconfirm title="删除这个计划？" description="其直接下级计划也会被删除。" onConfirm={onDelete} okText="删除" cancelText="取消"><Button type="text" danger size="small" icon={<DeleteOutlined />} aria-label="删除计划" /></Popconfirm></div></div>;
}
