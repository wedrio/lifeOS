import { useEffect, useState } from 'react';
import { Button, Form, Input, InputNumber, Modal, Rate, Select, message } from 'antd';
import { BookOutlined, PlusOutlined } from '@ant-design/icons';
import type { Book, BookCoverTheme, BookInput, BookStatus } from '@lifeos/shared';
import { COVER_THEMES } from './BookCover';
import { dataSource } from '../../data';

interface BookEditModalProps {
  book?: Book | null;
  open: boolean;
  onClose: () => void;
  onSuccess: (book: Book) => void;
}

const CATEGORY_OPTIONS = [
  '思维模型', '财富与认知', '心理学', '文学社科', '经济与社会', '科技与创新', '传记历史', '艺术哲学', '个人成长',
];

export function BookEditModal({ book, open, onClose, onSuccess }: BookEditModalProps) {
  const [form] = Form.useForm<BookInput>();
  const [loading, setLoading] = useState(false);
  const [selectedTheme, setSelectedTheme] = useState<BookCoverTheme>('emerald');
  const [status, setStatus] = useState<BookStatus>('queue');
  const isEditing = Boolean(book);

  useEffect(() => {
    if (open) {
      if (book) {
        setSelectedTheme((book.coverTheme as BookCoverTheme) || 'emerald');
        setStatus(book.status);
        form.setFieldsValue({
          title: book.title,
          author: book.author || '',
          totalPages: book.totalPages,
          currentPage: book.currentPage || 0,
          status: book.status,
          category: book.category || '个人成长',
          coverTheme: book.coverTheme || 'emerald',
          coverUrl: book.coverUrl || '',
          rating: book.rating,
          review: book.review || '',
          takeaways: book.takeaways || [],
          startDate: book.startDate || '',
          finishDate: book.finishDate || '',
        });
      } else {
        setSelectedTheme('emerald');
        setStatus('reading');
        form.setFieldsValue({
          title: '',
          author: '',
          totalPages: 300,
          currentPage: 0,
          status: 'reading',
          category: '个人成长',
          coverTheme: 'emerald',
          coverUrl: '',
          startDate: new Date().toISOString().slice(0, 10),
          takeaways: [],
        });
      }
    }
  }, [book, open, form]);

  const handleSubmit = async (values: BookInput) => {
    setLoading(true);
    try {
      let saved: Book;
      if (isEditing && book) {
        saved = await dataSource.books.update(book.id, values);
        message.success('已更新书籍信息');
      } else {
        saved = await dataSource.books.create(values);
        message.success('已成功上架新书');
      }
      onSuccess(saved);
      onClose();
    } catch (error) {
      message.error(error instanceof Error ? error.message : '保存失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open={open}
      title={<span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><BookOutlined /> {isEditing ? '编辑图书信息' : '上架纸质书'}</span>}
      onCancel={onClose}
      footer={null}
      destroyOnClose
      width={540}
    >
      <Form form={form} layout="vertical" onFinish={handleSubmit} style={{ marginTop: 14 }}>
        <Form.Item
          name="title"
          label="书名"
          rules={[{ required: true, message: '请输入书名' }, { max: 120, message: '书名过长' }]}
        >
          <Input placeholder="例如：置身事内、原则、纳瓦尔宝典" />
        </Form.Item>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Form.Item name="author" label="作者 / 译者">
            <Input placeholder="例如：兰小欢 / 瑞·达利欧" />
          </Form.Item>

          <Form.Item name="category" label="分类">
            <Select
              allowClear
              placeholder="选择或输入分类"
              options={CATEGORY_OPTIONS.map((cat) => ({ label: cat, value: cat }))}
            />
          </Form.Item>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Form.Item
            name="totalPages"
            label="总页数"
            rules={[{ required: true, message: '请输入总页数' }, { type: 'number', min: 1, message: '页数须大于0' }]}
          >
            <InputNumber style={{ width: '100%' }} min={1} max={99999} addonAfter="页" />
          </Form.Item>

          <Form.Item
            name="currentPage"
            label="当前已读页数"
            rules={[{ type: 'number', min: 0, message: '页数不能为负' }]}
          >
            <InputNumber style={{ width: '100%' }} min={0} max={99999} addonAfter="页" />
          </Form.Item>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Form.Item name="status" label="阅读状态">
            <Select
              value={status}
              onChange={(val) => setStatus(val)}
              options={[
                { label: '📖 正在阅读 (Desk)', value: 'reading' },
                { label: '⏳ 待读清单 (Queue)', value: 'queue' },
                { label: '✅ 已读完 (Finished)', value: 'finished' },
                { label: '⏸️ 搁置/弃读 (Abandoned)', value: 'abandoned' },
              ]}
            />
          </Form.Item>

          <Form.Item name="startDate" label="开始阅读日期">
            <Input type="date" />
          </Form.Item>
        </div>

        <Form.Item label="精装封面配色 (无封面图时生效)" name="coverTheme">
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {COVER_THEMES.map((theme) => (
              <button
                type="button"
                key={theme.key}
                onClick={() => {
                  setSelectedTheme(theme.key);
                  form.setFieldValue('coverTheme', theme.key);
                }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '5px 10px',
                  borderRadius: 8,
                  border: selectedTheme === theme.key ? '2px solid #34d399' : '1px solid var(--line)',
                  background: 'var(--glass)',
                  cursor: 'pointer',
                  fontSize: 12,
                }}
              >
                <span style={{ width: 14, height: 14, borderRadius: 3, background: theme.color, display: 'inline-block' }} />
                <span>{theme.name}</span>
              </button>
            ))}
          </div>
        </Form.Item>

        <Form.Item name="coverUrl" label="自定义封面图片 URL (可选)">
          <Input placeholder="https://example.com/cover.jpg (留空使用精装封面)" />
        </Form.Item>

        {status === 'finished' && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Form.Item name="rating" label="阅读评分 (1-5 星)">
                <Rate allowHalf allowClear />
              </Form.Item>
              <Form.Item name="finishDate" label="读完日期">
                <Input type="date" />
              </Form.Item>
            </div>

            <Form.Item name="review" label="全书结语 / 读后简评">
              <Input.TextArea rows={3} placeholder="总结阅读收获与核心思考..." maxLength={1000} showCount />
            </Form.Item>

            <Form.Item
              name="takeaways"
              label="核心感悟 (Takeaways)"
              tooltip="输入书中最有价值的认知或行动点"
            >
              <Select
                mode="tags"
                placeholder="输入一条感悟后按回车添加"
                tokenSeparators={[',', '，', '\n']}
              />
            </Form.Item>
          </>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 14 }}>
          <Button onClick={onClose}>取消</Button>
          <Button type="primary" htmlType="submit" loading={loading} icon={isEditing ? undefined : <PlusOutlined />}>
            {isEditing ? '保存修改' : '确认上架'}
          </Button>
        </div>
      </Form>
    </Modal>
  );
}
