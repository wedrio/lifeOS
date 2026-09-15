import { useEffect, useState } from 'react';
import { Button, Form, Input, InputNumber, Modal, Select, message } from 'antd';
import { EditOutlined } from '@ant-design/icons';
import type { Book } from '@lifeos/shared';
import { dataSource } from '../../data';

interface BookNoteModalProps {
  book: Book | null;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface FormValues {
  pageNumber?: number;
  quote: string;
  thoughts?: string;
  tags?: string[];
}

export function BookNoteModal({ book, open, onClose, onSuccess }: BookNoteModalProps) {
  const [form] = Form.useForm<FormValues>();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (book && open) {
      form.setFieldsValue({
        pageNumber: book.currentPage > 0 ? book.currentPage : undefined,
        quote: '',
        thoughts: '',
        tags: [],
      });
    }
  }, [book, open, form]);

  if (!book) return null;

  const handleSubmit = async (values: FormValues) => {
    setLoading(true);
    try {
      await dataSource.books.createNote(book.id, {
        bookId: book.id,
        quote: values.quote.trim(),
        pageNumber: values.pageNumber,
        thoughts: values.thoughts?.trim() || undefined,
        tags: values.tags || [],
      });
      message.success('已保存书摘笔记');
      onSuccess();
      onClose();
    } catch (error) {
      message.error(error instanceof Error ? error.message : '笔记保存失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open={open}
      title={<span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><EditOutlined /> 摘抄划线 · 纸质书随笔</span>}
      onCancel={onClose}
      footer={null}
      destroyOnClose
      width={500}
    >
      <Form form={form} layout="vertical" onFinish={handleSubmit} style={{ marginTop: 14 }}>
        <Form.Item
          name="quote"
          label="摘录原文 / 金句"
          rules={[{ required: true, message: '请输入摘录的内容' }]}
        >
          <Input.TextArea
            rows={3}
            placeholder="输入书中打动你的精彩原句..."
            maxLength={1000}
            showCount
          />
        </Form.Item>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 12 }}>
          <Form.Item
            name="pageNumber"
            label="所在页码"
            tooltip={`该书共 ${book.totalPages} 页`}
          >
            <InputNumber
              style={{ width: '100%' }}
              min={1}
              max={book.totalPages}
              addonAfter="页"
              placeholder="例如 42"
            />
          </Form.Item>

          <Form.Item name="tags" label="标签 (按回车添加)">
            <Select
              mode="tags"
              placeholder="如：认知、行动点、金句"
              tokenSeparators={[',', '，', ' ']}
            />
          </Form.Item>
        </div>

        <Form.Item name="thoughts" label="个人思考 / 延伸联想 (可选)">
          <Input.TextArea
            rows={3}
            placeholder="联系自身经历或工作场景的思考..."
            maxLength={1000}
            showCount
          />
        </Form.Item>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
          <Button onClick={onClose}>取消</Button>
          <Button type="primary" htmlType="submit" loading={loading}>
            保存书摘
          </Button>
        </div>
      </Form>
    </Modal>
  );
}
