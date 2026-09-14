import { useEffect } from 'react';
import { Button, Form, Input, InputNumber, Modal, Progress, Segmented, Select, message } from 'antd';
import type { Plan, PlanInput, PlanLevel, PlanPriority, PlanStatus } from '@lifeos/shared';
import { planInputSchema } from '@lifeos/shared';
import { dataSource } from '../../data';
import { defaultPeriod, periodInputType } from '../../lib/dates';

interface PlanFormValues {
  title: string;
  description?: string;
  level: PlanLevel;
  period: string;
  parentId?: string;
  status: PlanStatus;
  progress: number;
  priority: PlanPriority;
}

const levelOrder: Record<PlanLevel, number> = { year: 0, month: 1, week: 2, day: 3 };
const levelName: Record<PlanLevel, string> = { year: '年度', month: '月度', week: '周', day: '日' };

export function PlanFormModal({ plan, plans, defaultLevel, defaultPlanPeriod, open, onClose, onSaved }: { plan?: Plan; plans: Plan[]; defaultLevel: PlanLevel; defaultPlanPeriod: string; open: boolean; onClose: () => void; onSaved: () => Promise<void> }) {
  const [form] = Form.useForm<PlanFormValues>();
  const level = Form.useWatch('level', form) ?? plan?.level ?? defaultLevel;
  const status = Form.useWatch('status', form) ?? plan?.status ?? 'not_started';
  const progress = Form.useWatch('progress', form) ?? plan?.progress ?? 0;
  const parentOptions = plans.filter((item) => item.id !== plan?.id && levelOrder[item.level] < levelOrder[level]).map((item) => ({ value: item.id, label: `${levelName[item.level]} · ${item.title}` }));

  useEffect(() => {
    if (!open) return;
    form.setFieldsValue({
      title: plan?.title,
      description: plan?.description,
      level: plan?.level ?? defaultLevel,
      period: plan?.period ?? defaultPlanPeriod,
      parentId: plan?.parentId,
      status: plan?.status ?? 'not_started',
      progress: plan?.progress ?? 0,
      priority: plan?.priority ?? 'medium',
    });
  }, [defaultLevel, defaultPlanPeriod, form, open, plan]);

  const save = async (values: PlanFormValues) => {
    const input = { ...values, description: values.description?.trim() || undefined, parentId: values.parentId || undefined } satisfies PlanInput;
    const result = planInputSchema.safeParse(input);
    if (!result.success) return message.error(result.error.issues[0]?.message ?? '请检查计划信息');
    try {
      if (plan) await dataSource.plans.update(plan.id, result.data);
      else await dataSource.plans.create(result.data);
      message.success(plan ? '计划已更新' : '计划已创建');
      await onSaved();
      onClose();
    } catch (error) { message.error(error instanceof Error ? error.message : '保存失败'); }
  };

  return <Modal open={open} title={plan ? '编辑计划' : '新建计划'} onCancel={onClose} footer={null} destroyOnClose>
    <Form form={form} layout="vertical" onFinish={save} initialValues={{ level: defaultLevel, period: defaultPlanPeriod, status: 'not_started', progress: 0, priority: 'medium' }}>
      <Form.Item name="title" label="计划标题" rules={[{ required: true, message: '请输入计划标题' }]}><Input maxLength={160} placeholder="例如：完成本周复盘" autoFocus /></Form.Item>
      <Form.Item name="description" label="描述（可选）"><Input.TextArea rows={3} maxLength={5000} showCount placeholder="写下这个计划的意义或完成标准" /></Form.Item>
      <div className="form-two-columns"><Form.Item name="level" label="计划层级" rules={[{ required: true }]}><Segmented block options={[{ label: '年', value: 'year' }, { label: '月', value: 'month' }, { label: '周', value: 'week' }, { label: '日', value: 'day' }]} onChange={(next) => form.setFieldValue('period', defaultPeriod(next as PlanLevel))} /></Form.Item><Form.Item name="period" label="所属周期" rules={[{ required: true, message: '请选择所属周期' }]}><Input type={periodInputType(level)} /></Form.Item></div>
      {level !== 'year' && <Form.Item name="parentId" label="关联上级（可选）"><Select allowClear showSearch optionFilterProp="label" placeholder="不关联上级计划" options={parentOptions} /></Form.Item>}
      <div className="form-two-columns"><Form.Item name="priority" label="优先级" rules={[{ required: true }]}><Segmented block options={[{ label: '低', value: 'low' }, { label: '中', value: 'medium' }, { label: '高', value: 'high' }]} /></Form.Item><Form.Item name="status" label="状态" rules={[{ required: true }]}><Select options={[{ label: '待开始', value: 'not_started' }, { label: '进行中', value: 'in_progress' }, { label: '已完成', value: 'completed' }, { label: '已取消', value: 'cancelled' }]} onChange={(next) => { if (next === 'completed') form.setFieldValue('progress', 100); }} /></Form.Item></div>
      <Form.Item name="progress" label={`进度 ${status === 'completed' ? '（已完成）' : ''}`} rules={[{ required: true }]}><InputNumber min={0} max={100} precision={0} suffix="%" style={{ width: '100%' }} /></Form.Item>
      <Progress percent={Math.min(100, progress)} showInfo={false} strokeColor="#2f9c67" />
      <div className="modal-footer" style={{ marginTop: 24 }}><Button onClick={onClose}>取消</Button><Button type="primary" htmlType="submit">保存计划</Button></div>
    </Form>
  </Modal>;
}
