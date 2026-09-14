import { useEffect } from 'react';
import { Button, Form, Input, InputNumber, Modal, Segmented, Switch, message } from 'antd';
import type { Habit, HabitInput } from '@lifeos/shared';
import { habitInputSchema } from '@lifeos/shared';
import { dataSource } from '../../data';

interface HabitFormValues {
  name: string;
  icon: string;
  color: string;
  frequency: 'daily' | 'weekly' | 'custom';
  timesPerPeriod: number;
  reminderTime?: string;
  allowBackfillDays: number;
  archived: boolean;
}

export function HabitFormModal({ habit, open, onClose, onSaved }: { habit?: Habit; open: boolean; onClose: () => void; onSaved: () => Promise<void> }) {
  const [form] = Form.useForm<HabitFormValues>();
  const frequency = Form.useWatch('frequency', form) ?? habit?.frequency ?? 'daily';

  useEffect(() => {
    if (!open) return;
    form.setFieldsValue({
      name: habit?.name,
      icon: habit?.icon ?? '✨',
      color: habit?.color ?? '#5b5ce2',
      frequency: habit?.frequency ?? 'daily',
      timesPerPeriod: habit?.timesPerPeriod ?? 1,
      reminderTime: habit?.reminderTime,
      allowBackfillDays: habit?.allowBackfillDays ?? 0,
      archived: habit?.archived ?? false,
    });
  }, [form, habit, open]);

  const save = async (values: HabitFormValues) => {
    const input = { ...values, reminderTime: values.reminderTime || undefined } satisfies HabitInput;
    const result = habitInputSchema.safeParse(input);
    if (!result.success) return message.error(result.error.issues[0]?.message ?? '请检查习惯信息');
    try {
      if (habit) await dataSource.habits.update(habit.id, result.data);
      else await dataSource.habits.create(result.data);
      message.success(habit ? '习惯已更新' : '新习惯已创建');
      await onSaved();
      onClose();
    } catch (error) { message.error(error instanceof Error ? error.message : '保存失败'); }
  };

  return <Modal open={open} title={habit ? '编辑习惯' : '新建习惯'} onCancel={onClose} footer={null} destroyOnClose>
    <Form form={form} layout="vertical" onFinish={save} initialValues={{ icon: '✨', color: '#5b5ce2', frequency: 'daily', timesPerPeriod: 1, allowBackfillDays: 0, archived: false }}>
      <Form.Item name="name" label="习惯名称" rules={[{ required: true, message: '请输入习惯名称' }]}><Input placeholder="例如：阅读 30 分钟" maxLength={80} autoFocus /></Form.Item>
      <div className="form-two-columns"><Form.Item name="icon" label="图标" rules={[{ required: true }]}><Input maxLength={8} /></Form.Item><Form.Item name="color" label="主题色" rules={[{ required: true }]}><Input type="color" style={{ height: 32 }} /></Form.Item></div>
      <Form.Item name="frequency" label="目标频率" rules={[{ required: true }]}><Segmented block options={[{ label: '每天', value: 'daily' }, { label: '每周', value: 'weekly' }, { label: '自定义', value: 'custom' }]} /></Form.Item>
      <Form.Item name="timesPerPeriod" label={frequency === 'daily' ? '每日目标次数' : frequency === 'weekly' ? '每周目标次数' : '目标次数'} rules={[{ required: true, message: '请填写目标次数' }]}><InputNumber min={1} max={365} precision={0} style={{ width: '100%' }} /></Form.Item>
      <div className="form-two-columns"><Form.Item name="reminderTime" label="提醒时间（可选）"><Input type="time" /></Form.Item><Form.Item name="allowBackfillDays" label="允许补打天数"><InputNumber min={0} max={365} precision={0} style={{ width: '100%' }} /></Form.Item></div>
      {habit && <Form.Item name="archived" label="归档习惯" valuePropName="checked"><Switch checkedChildren="已归档" unCheckedChildren="进行中" /></Form.Item>}
      <div className="modal-footer"><Button onClick={onClose}>取消</Button><Button type="primary" htmlType="submit">保存习惯</Button></div>
    </Form>
  </Modal>;
}
