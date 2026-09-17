import { useEffect, useState } from 'react';
import { Alert, Button, Form, Input, InputNumber, Modal, Progress, Typography, message } from 'antd';
import { BookOutlined, CheckCircleOutlined } from '@ant-design/icons';
import type { Book } from '@lifeos/shared';
import { dataSource } from '../../data';
import { BookCover } from './BookCover';
import { fireCelebrationCannon, fireConfetti } from '../ui';

interface ReadingLogModalProps {
  book: Book | null;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface FormValues {
  page: number;
  date: string;
  note?: string;
}

const today = () => new Date().toISOString().slice(0, 10);

export function ReadingLogModal({ book, open, onClose, onSuccess }: ReadingLogModalProps) {
  const [form] = Form.useForm<FormValues>();
  const [loading, setLoading] = useState(false);
  const [targetPage, setTargetPage] = useState<number>(0);

  useEffect(() => {
    if (book && open) {
      const initialPage = Math.min(book.totalPages, book.currentPage > 0 ? book.currentPage + 15 : 15);
      setTargetPage(initialPage);
      form.setFieldsValue({
        page: initialPage,
        date: today(),
        note: '',
      });
    }
  }, [book, open, form]);

  if (!book) return null;

  const prevPage = book.currentPage || 0;
  const pagesRead = Math.max(0, (targetPage || 0) - prevPage);
  const percent = book.totalPages > 0 ? Math.min(100, Math.round(((targetPage || 0) / book.totalPages) * 100)) : 0;
  const remaining = Math.max(0, book.totalPages - (targetPage || 0));
  const isFinished = (targetPage || 0) >= book.totalPages;

  const handleSubmit = async (values: FormValues) => {
    setLoading(true);
    try {
      await dataSource.books.logProgress(book.id, {
        bookId: book.id,
        page: values.page,
        pagesRead: Math.max(0, values.page - prevPage),
        note: values.note?.trim() || undefined,
        date: values.date,
      });
      if (isFinished) {
        fireCelebrationCannon();
        message.success(`🎉 恭喜读完《${book.title}》！`);
      } else {
        fireConfetti();
        message.success(`已记录翻阅至第 ${values.page} 页`);
      }
      onSuccess();
      onClose();
    } catch (error) {
      message.error(error instanceof Error ? error.message : '翻书记录保存失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open={open}
      title={<span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><BookOutlined /> 翻书打卡 · 记录进度</span>}
      onCancel={onClose}
      footer={null}
      destroyOnClose
      width={460}
    >
      <div style={{ display: 'flex', gap: 14, margin: '14px 0 18px', padding: 12, background: 'rgba(255,255,255,0.04)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.08)' }}>
        <BookCover book={book} size="sm" />
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <Typography.Text strong style={{ fontSize: 15 }} ellipsis>{book.title}</Typography.Text>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            {book.author ? `${book.author} · ` : ''}总共 {book.totalPages} 页
          </Typography.Text>
          <Typography.Text type="secondary" style={{ fontSize: 12, marginTop: 4 }}>
            上次读到：第 <strong style={{ color: 'var(--leaf-deep)' }}>{prevPage}</strong> 页 ({book.totalPages > 0 ? Math.round((prevPage / book.totalPages) * 100) : 0}%)
          </Typography.Text>
        </div>
      </div>

      <Form form={form} layout="vertical" onFinish={handleSubmit}>
        <Form.Item
          name="page"
          label="今天读到第几页？"
          rules={[
            { required: true, message: '请输入读到的页码' },
            { type: 'number', min: 1, max: book.totalPages, message: `页码范围为 1 ~ ${book.totalPages}` },
          ]}
        >
          <InputNumber
            style={{ width: '100%' }}
            min={1}
            max={book.totalPages}
            addonAfter={`/ ${book.totalPages} 页`}
            onChange={(val) => setTargetPage(val || 0)}
          />
        </Form.Item>

        <div style={{ marginBottom: 16, padding: '10px 14px', background: 'rgba(52, 211, 153, 0.08)', borderRadius: 10, border: '1px solid rgba(52, 211, 153, 0.2)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
            <span>本次翻阅：<strong>+{pagesRead}</strong> 页</span>
            <span>更新后进度：<strong>{percent}%</strong> (余 {remaining} 页)</span>
          </div>
          <Progress percent={percent} size="small" strokeColor="#34d399" showInfo={false} />
          {isFinished && (
            <Alert
              type="success"
              showIcon
              icon={<CheckCircleOutlined />}
              message="读完末页！保存后书籍将自动标记为「已读」归档。"
              style={{ marginTop: 8 }}
            />
          )}
        </div>

        <Form.Item name="date" label="阅读日期" rules={[{ required: true, message: '请选择日期' }]}>
          <Input type="date" />
        </Form.Item>

        <Form.Item name="note" label="本次随想 / 划线笔记 (可选)">
          <Input.TextArea rows={2} placeholder="记录一两句印象深刻的见解或想法..." maxLength={500} showCount />
        </Form.Item>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
          <Button onClick={onClose}>取消</Button>
          <Button type="primary" htmlType="submit" loading={loading} icon={<CheckCircleOutlined />}>
            确认记录
          </Button>
        </div>
      </Form>
    </Modal>
  );
}
