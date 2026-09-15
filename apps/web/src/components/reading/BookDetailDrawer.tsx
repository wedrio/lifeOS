import { useEffect, useState } from 'react';
import {
  Button,
  Card,
  Descriptions,
  Drawer,
  Empty,
  Popconfirm,
  Progress,
  Rate,
  Space,
  Tabs,
  Tag,
  Timeline,
  Typography,
  message,
} from 'antd';
import {
  BookOutlined,
  DeleteOutlined,
  EditOutlined,
  FormOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import type { Book, BookNote, ReadingLog } from '@lifeos/shared';
import { dataSource } from '../../data';
import { BookCover } from './BookCover';
import { ReadingLogModal } from './ReadingLogModal';
import { BookNoteModal } from './BookNoteModal';
import { BookEditModal } from './BookEditModal';

interface BookDetailDrawerProps {
  bookId: string | null;
  open: boolean;
  onClose: () => void;
  onChanged: () => void;
}

export function BookDetailDrawer({ bookId, open, onClose, onChanged }: BookDetailDrawerProps) {
  const [book, setBook] = useState<Book | null>(null);
  const [logs, setLogs] = useState<ReadingLog[]>([]);
  const [notes, setNotes] = useState<BookNote[]>([]);
  const [loading, setLoading] = useState(false);

  const [logModalOpen, setLogModalOpen] = useState(false);
  const [noteModalOpen, setNoteModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);

  const loadData = async (id: string) => {
    setLoading(true);
    try {
      const [bookData, logsData, notesData] = await Promise.all([
        dataSource.books.get(id),
        dataSource.books.listLogs(id),
        dataSource.books.listNotes(id),
      ]);
      setBook(bookData);
      setLogs(logsData);
      setNotes(notesData);
    } catch {
      message.error('加载图书详情失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (bookId && open) {
      loadData(bookId);
    } else {
      setBook(null);
      setLogs([]);
      setNotes([]);
    }
  }, [bookId, open]);

  if (!book && !loading) return null;

  const percent = book && book.totalPages > 0 ? Math.min(100, Math.round(((book.currentPage || 0) / book.totalPages) * 100)) : 0;

  const handleDeleteBook = async () => {
    if (!book) return;
    try {
      await dataSource.books.remove(book.id);
      message.success('已移出书架');
      onChanged();
      onClose();
    } catch (error) {
      message.error(error instanceof Error ? error.message : '删除失败');
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    try {
      await dataSource.books.removeNote(noteId);
      message.success('已删除书摘');
      if (book) loadData(book.id);
      onChanged();
    } catch {
      message.error('删除笔记失败');
    }
  };

  const statusMap = {
    reading: { label: '正在阅读', color: 'processing' },
    queue: { label: '待读清单', color: 'default' },
    finished: { label: '已读完', color: 'success' },
    abandoned: { label: '搁置', color: 'warning' },
  };

  return (
    <>
      <Drawer
        open={open}
        onClose={onClose}
        width={580}
        title={book ? book.title : '图书详情'}
        extra={
          <Space size={8}>
            <Button icon={<EditOutlined />} size="small" onClick={() => setEditModalOpen(true)}>编辑</Button>
            <Popconfirm title="确定要将该书移出书架吗？" okText="确定" cancelText="取消" onConfirm={handleDeleteBook}>
              <Button icon={<DeleteOutlined />} size="small" danger />
            </Popconfirm>
          </Space>
        }
      >
        {book && (
          <div>
            {/* Header with Cover */}
            <div style={{ display: 'flex', gap: 18, marginBottom: 20 }}>
              <BookCover book={book} size="lg" />
              <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
                <Typography.Title level={4} style={{ margin: '0 0 4px', lineHeight: 1.3 }}>
                  {book.title}
                </Typography.Title>
                <Typography.Text type="secondary" style={{ fontSize: 13, marginBottom: 8 }}>
                  {book.author || '未知作者'}
                </Typography.Text>

                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
                  <Tag color={statusMap[book.status].color}>{statusMap[book.status].label}</Tag>
                  {book.category && <Tag color="blue">{book.category}</Tag>}
                  {book.rating && <Rate disabled defaultValue={book.rating} allowHalf style={{ fontSize: 12 }} />}
                </div>

                <div style={{ marginTop: 'auto', padding: '10px 12px', background: 'rgba(255,255,255,0.04)', borderRadius: 10, border: '1px solid var(--line)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                    <span>已翻阅 <strong>{book.currentPage || 0}</strong> / {book.totalPages} 页</span>
                    <strong style={{ color: 'var(--leaf-deep)' }}>{percent}%</strong>
                  </div>
                  <Progress percent={percent} strokeColor="#34d399" showInfo={false} size="small" />
                </div>
              </div>
            </div>

            {/* Action Bar */}
            <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
              <Button
                type="primary"
                icon={<BookOutlined />}
                style={{ flex: 1 }}
                onClick={() => setLogModalOpen(true)}
              >
                翻书打卡
              </Button>
              <Button
                icon={<FormOutlined />}
                style={{ flex: 1 }}
                onClick={() => setNoteModalOpen(true)}
              >
                摘抄划线
              </Button>
            </div>

            {/* Tabs for Reading Logs / Book Notes / Reviews */}
            <Tabs
              defaultActiveKey="notes"
              items={[
                {
                  key: 'notes',
                  label: `书摘划线 (${notes.length})`,
                  children: (
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                          记录页码金句与思辨心得
                        </Typography.Text>
                        <Button
                          type="dashed"
                          size="small"
                          icon={<PlusOutlined />}
                          onClick={() => setNoteModalOpen(true)}
                        >
                          写书摘
                        </Button>
                      </div>

                      {notes.length === 0 ? (
                        <Empty description="暂无书摘，读到精彩处随手记一句吧~" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                      ) : (
                        notes.map((note) => (
                          <div key={note.id} className="book-quote-card">
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                              <span className="book-quote-page">
                                {note.pageNumber ? `P. ${note.pageNumber}` : '随笔摘录'}
                              </span>
                              <Popconfirm title="删除该条书摘？" onConfirm={() => handleDeleteNote(note.id)}>
                                <Button type="text" size="small" danger icon={<DeleteOutlined />} style={{ opacity: 0.5 }} />
                              </Popconfirm>
                            </div>
                            <div className="book-quote-text">{note.quote}</div>
                            {note.thoughts && (
                              <div className="book-quote-thoughts">
                                <strong>思考：</strong> {note.thoughts}
                              </div>
                            )}
                            {note.tags && note.tags.length > 0 && (
                              <div style={{ marginTop: 6, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                                {note.tags.map((t) => (
                                  <Tag key={t} bordered={false} style={{ fontSize: 11 }}>#{t}</Tag>
                                ))}
                              </div>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  ),
                },
                {
                  key: 'logs',
                  label: `翻书足迹 (${logs.length})`,
                  children: (
                    <div>
                      {logs.length === 0 ? (
                        <Empty description="暂无翻书记录" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                      ) : (
                        <Timeline
                          style={{ marginTop: 14 }}
                          items={logs.map((log) => ({
                            color: '#34d399',
                            children: (
                              <div style={{ fontSize: 13 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <strong style={{ color: 'var(--ink)' }}>读至第 {log.page} 页</strong>
                                  <Typography.Text type="secondary" style={{ fontSize: 11 }}>{log.date}</Typography.Text>
                                </div>
                                {log.pagesRead > 0 && (
                                  <div style={{ fontSize: 12, color: 'var(--leaf-deep)', marginTop: 2 }}>
                                    本次翻读 +{log.pagesRead} 页
                                  </div>
                                )}
                                {log.note && (
                                  <div style={{ color: 'var(--muted)', marginTop: 3, fontSize: 12, background: 'rgba(255,255,255,0.03)', padding: '4px 8px', borderRadius: 6 }}>
                                    {log.note}
                                  </div>
                                )}
                              </div>
                            ),
                          }))}
                        />
                      )}
                    </div>
                  ),
                },
                {
                  key: 'review',
                  label: '读后复盘',
                  children: (
                    <div>
                      {book.review || (book.takeaways && book.takeaways.length > 0) ? (
                        <div>
                          {book.review && (
                            <Card size="small" style={{ marginBottom: 14, background: 'rgba(255,255,255,0.03)' }}>
                              <Typography.Title level={5} style={{ margin: '0 0 6px', fontSize: 14 }}>
                                全书总结
                              </Typography.Title>
                              <Typography.Paragraph style={{ margin: 0, fontSize: 13, color: 'var(--ink)' }}>
                                {book.review}
                              </Typography.Paragraph>
                            </Card>
                          )}

                          {book.takeaways && book.takeaways.length > 0 && (
                            <Card size="small" style={{ background: 'rgba(255,255,255,0.03)' }}>
                              <Typography.Title level={5} style={{ margin: '0 0 8px', fontSize: 14 }}>
                                核心感悟 (Takeaways)
                              </Typography.Title>
                              <ul style={{ paddingLeft: 18, margin: 0, fontSize: 13 }}>
                                {book.takeaways.map((point, idx) => (
                                  <li key={idx} style={{ marginBottom: 4 }}>{point}</li>
                                ))}
                              </ul>
                            </Card>
                          )}
                        </div>
                      ) : (
                        <Empty
                          description="尚未填写读后复盘，点击右上角「编辑」在读完后写下结语吧"
                          image={Empty.PRESENTED_IMAGE_SIMPLE}
                        />
                      )}

                      <Descriptions column={1} size="small" style={{ marginTop: 20 }} bordered>
                        <Descriptions.Item label="开卷日期">{book.startDate || '未记录'}</Descriptions.Item>
                        <Descriptions.Item label="读完日期">{book.finishDate || '未完结'}</Descriptions.Item>
                        <Descriptions.Item label="总页数">{book.totalPages} 页</Descriptions.Item>
                      </Descriptions>
                    </div>
                  ),
                },
              ]}
            />
          </div>
        )}
      </Drawer>

      {/* Modals */}
      <ReadingLogModal
        book={book}
        open={logModalOpen}
        onClose={() => setLogModalOpen(false)}
        onSuccess={() => {
          if (book) loadData(book.id);
          onChanged();
        }}
      />

      <BookNoteModal
        book={book}
        open={noteModalOpen}
        onClose={() => setNoteModalOpen(false)}
        onSuccess={() => {
          if (book) loadData(book.id);
          onChanged();
        }}
      />

      <BookEditModal
        book={book}
        open={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        onSuccess={(updated) => {
          setBook(updated);
          onChanged();
        }}
      />
    </>
  );
}
