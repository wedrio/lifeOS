import { useEffect } from 'react';
import { Button, Form, Input, Modal, Select, message } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import type { Seed, SeedEffort, SeedKind } from '@lifeos/shared';
import { seedInputSchema } from '@lifeos/shared';
import { dataSource } from '../../data';

interface SeedFormValues { title: string; url?: string; kind: SeedKind; effort: SeedEffort; note?: string; }

const KIND_OPTIONS: Array<{ value: SeedKind; label: string }> = [
  { value: 'article', label: '📰 文章' },
  { value: 'video', label: '📺 视频' },
  { value: 'tool', label: '🧰 工具' },
  { value: 'tutorial', label: '📖 教程' },
];
const EFFORT_OPTIONS: Array<{ value: SeedEffort; label: string }> = [
  { value: 'm5', label: '≈ 5 分钟' },
  { value: 'm15', label: '≈ 15 分钟' },
  { value: 'm30', label: '≈ 30 分钟' },
  { value: 'm60', label: '1 小时+' },
];

export function SeedFormModal({ seed, open, onClose, onSaved }: { seed?: Seed; open: boolean; onClose: () => void; onSaved: () => Promise<void> }) {
  const [form] = Form.useForm<SeedFormValues>();

  useEffect(() => {
    if (!open) return;
    form.setFieldsValue({
      title: seed?.title,
      url: seed?.url,
      kind: seed?.kind ?? 'article',
      effort: seed?.effort ?? 'm15',
      note: seed?.note,
    });
  }, [form, seed, open]);

  const save = async (values: SeedFormValues) => {
    const input = {
      title: values.title.trim(),
      url: values.url?.trim() || undefined,
      kind: values.kind,
      effort: values.effort,
      note: values.note?.trim() || undefined,
    };
    const result = seedInputSchema.safeParse(input);
    if (!result.success) return message.error(result.error.issues[0]?.message ?? '请检查内容');
    try {
      if (seed) await dataSource.seeds.update(seed.id, result.data);
      else await dataSource.seeds.create(result.data);
      message.success(seed ? '松好土了 🌿' : '种下了！等它长一长 🌱');
      await onSaved();
      onClose();
    } catch (error) { message.error(error instanceof Error ? error.message : '保存失败'); }
  };

  return <Modal open={open} title={seed ? '给这棵草松松土' : '种一棵草'} onCancel={onClose} footer={null} destroyOnClose width={520}>
    <Form form={form} layout="vertical" onFinish={save} initialValues={{ kind: 'article', effort: 'm15' }}>
      <Form.Item name="title" label="叫什么" rules={[{ required: true, whitespace: true, message: '先给这棵草起个名字' }]}>
        <Input maxLength={120} placeholder="例如：Excalidraw 手绘白板" autoFocus />
      </Form.Item>
      <Form.Item name="url" label="链接（可选）" rules={[{ type: 'url', message: '请输入有效链接' }]}>
        <Input maxLength={500} placeholder="https://…" />
      </Form.Item>
      <div className="seed-form-columns">
        <Form.Item name="kind" label="是什么">
          <Select options={KIND_OPTIONS} />
        </Form.Item>
        <Form.Item name="effort" label="大概要多久">
          <Select options={EFFORT_OPTIONS} />
        </Form.Item>
      </div>
      <Form.Item name="note" label="一句话备注（可选）">
        <Input.TextArea rows={2} maxLength={200} placeholder="当时为什么想记下来？" />
      </Form.Item>
      <div className="modal-footer">
        <Button onClick={onClose}>取消</Button>
        <Button type="primary" icon={<PlusOutlined />} htmlType="submit">{seed ? '保存修改' : '种下去'}</Button>
      </div>
    </Form>
  </Modal>;
}
