import { useEffect, useMemo, useState } from 'react';
import {
  Button,
  Card,
  Col,
  Empty,
  Input,
  Progress,
  Radio,
  Row,
  Select,
  Statistic,
  Typography,
  message,
} from 'antd';
import {
  BookOutlined,
  FireOutlined,
  PlusOutlined,
  ReadOutlined,
  SearchOutlined,
  ThunderboltOutlined,
  TrophyOutlined,
} from '@ant-design/icons';
import type { Book, BookNote, ReadingStats } from '@lifeos/shared';
import { dataSource, generateReadingDemoData } from '../data';
import { BookCard, DeskBookCard } from '../components/reading/BookCard';
import { BookDetailDrawer } from '../components/reading/BookDetailDrawer';
import { BookEditModal } from '../components/reading/BookEditModal';
import { ReadingLogModal } from '../components/reading/ReadingLogModal';
import { BookNoteModal } from '../components/reading/BookNoteModal';
import '../styles/reading.css';

export function ReadingPage() {
  const [books, setBooks] = useState<Book[]>([]);
  const [notes, setNotes] = useState<BookNote[]>([]);
  const [stats, setStats] = useState<ReadingStats | null>(null);

  // Filter state
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [searchKeyword, setSearchKeyword] = useState<string>('');

  // Modals / Drawers
  const [selectedBookId, setSelectedBookId] = useState<string | null>(null);
  const [activeLogBook, setActiveLogBook] = useState<Book | null>(null);
  const [activeNoteBook, setActiveNoteBook] = useState<Book | null>(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);

  const loadData = async () => {
    try {
      const [allBooks, allNotes, readingStats] = await Promise.all([
        dataSource.books.list(),
        dataSource.books.listNotes(),
        dataSource.stats.reading(),
      ]);
      setBooks(allBooks);
      setNotes(allNotes);
      setStats(readingStats);
    } catch {
      message.error('加载阅读数据失败');
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateDemo = async () => {
    try {
      const count = await generateReadingDemoData();
      if (count > 0) {
        message.success(`已生成 ${count} 条纸质书与阅读记录示例数据`);
        loadData();
      } else {
        message.info('已有图书数据，无需重复生成');
      }
    } catch {
      message.error('生成示例数据失败');
    }
  };

  // Filtered books
  const filteredBooks = useMemo(() => {
    return books.filter((book) => {
      if (statusFilter !== 'all' && book.status !== statusFilter) return false;
      if (categoryFilter !== 'all' && book.category !== categoryFilter) return false;
      if (searchKeyword.trim()) {
        const kw = searchKeyword.trim().toLowerCase();
        const matchTitle = book.title.toLowerCase().includes(kw);
        const matchAuthor = book.author ? book.author.toLowerCase().includes(kw) : false;
        if (!matchTitle && !matchAuthor) return false;
      }
      return true;
    });
  }, [books, statusFilter, categoryFilter, searchKeyword]);

  // Categories list for filter
  const categories = useMemo(() => {
    const set = new Set<string>();
    books.forEach((b) => {
      if (b.category) set.add(b.category);
    });
    return Array.from(set);
  }, [books]);

  // Books currently being read (Desk)
  const deskBooks = useMemo(() => {
    return books.filter((b) => b.status === 'reading');
  }, [books]);

  // Map of book ID to Book object for notes preview
  const bookMap = useMemo(() => {
    return new Map(books.map((b) => [b.id, b]));
  }, [books]);

  const targetProgress = stats && stats.annualTarget > 0
    ? Math.min(100, Math.round((stats.finishedThisYear / stats.annualTarget) * 100))
    : 0;

  return (
    <div className="page-container">
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">纸质书阅读书架</h1>
          <p className="page-subtitle">回归实体书墨香，翻页打卡、记录金句书摘与年度成长足迹</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {books.length === 0 && (
            <Button icon={<ThunderboltOutlined />} onClick={handleCreateDemo}>
              生成示例书籍
            </Button>
          )}
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setCreateModalOpen(true)}
          >
            上架纸质书
          </Button>
        </div>
      </div>

      {/* Summary Statistics */}
      <div className="reading-summary">
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} md={6}>
            <Card className="dashboard-metric-card" bordered={false}>
              <Statistic
                title="正在翻阅"
                value={stats?.currentReadingCount ?? 0}
                suffix="本"
                prefix={<BookOutlined style={{ color: '#3b82f6', marginRight: 6 }} />}
              />
              <div style={{ marginTop: 8, fontSize: 12, color: 'var(--muted)' }}>
                放在桌边持续阅读的书籍
              </div>
            </Card>
          </Col>

          <Col xs={24} sm={12} md={6}>
            <Card className="dashboard-metric-card" bordered={false}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Statistic
                  title="年度阅读挑战"
                  value={stats?.finishedThisYear ?? 0}
                  suffix={`/ ${stats?.annualTarget ?? 12} 本`}
                  prefix={<TrophyOutlined style={{ color: '#f59e0b', marginRight: 6 }} />}
                />
              </div>
              <div style={{ marginTop: 6 }}>
                <Progress percent={targetProgress} size="small" strokeColor="#f59e0b" showInfo={false} />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
                  <span>达成率 {targetProgress}%</span>
                  <span>{targetProgress >= 100 ? '🎉 已达标！' : `还差 ${(stats?.annualTarget ?? 12) - (stats?.finishedThisYear ?? 0)} 本`}</span>
                </div>
              </div>
            </Card>
          </Col>

          <Col xs={24} sm={12} md={6}>
            <Card className="dashboard-metric-card" bordered={false}>
              <Statistic
                title="累计阅读页数"
                value={stats?.totalPagesRead ?? 0}
                suffix="页"
                prefix={<FireOutlined style={{ color: '#10b981', marginRight: 6 }} />}
              />
              <div style={{ marginTop: 8, fontSize: 12, color: 'var(--muted)' }}>
                一步一个脚印的翻页积累
              </div>
            </Card>
          </Col>

          <Col xs={24} sm={12} md={6}>
            <Card className="dashboard-metric-card" bordered={false}>
              <Statistic
                title="精彩书摘"
                value={notes.length}
                suffix="条"
                prefix={<ReadOutlined style={{ color: '#8b5cf6', marginRight: 6 }} />}
              />
              <div style={{ marginTop: 8, fontSize: 12, color: 'var(--muted)' }}>
                随书划线与认知沉淀
              </div>
            </Card>
          </Col>
        </Row>
      </div>

      {/* Desk: Currently Reading Section */}
      <div className="reading-desk-section">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 4, height: 16, background: '#34d399', borderRadius: 2, display: 'inline-block' }} />
            <Typography.Title level={4} style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>
              在图书桌 · 当前阅读 ({deskBooks.length})
            </Typography.Title>
          </div>
        </div>

        {deskBooks.length === 0 ? (
          <Card style={{ textAlign: 'center', padding: '24px 0', borderRadius: 16, background: 'var(--glass)', border: '1px dashed var(--line)' }}>
            <Empty
              description="当前书桌没有正在阅读的书籍，从书架挑选一本开始阅读吧"
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            >
              <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateModalOpen(true)}>
                上架新书
              </Button>
            </Empty>
          </Card>
        ) : (
          <div className="desk-card-grid">
            {deskBooks.map((book) => (
              <DeskBookCard
                key={book.id}
                book={book}
                onSelect={(b) => setSelectedBookId(b.id)}
                onQuickLog={(b) => setActiveLogBook(b)}
                onQuickNote={(b) => setActiveNoteBook(b)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Bookshelf Section */}
      <Card
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 4, height: 16, background: '#3b82f6', borderRadius: 2, display: 'inline-block' }} />
            <span>我的纸质书架 ({filteredBooks.length})</span>
          </div>
        }
        extra={
          <div className="reading-filters">
            <Radio.Group
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              size="small"
              buttonStyle="solid"
            >
              <Radio.Button value="all">全部</Radio.Button>
              <Radio.Button value="reading">在读</Radio.Button>
              <Radio.Button value="queue">待读</Radio.Button>
              <Radio.Button value="finished">已读</Radio.Button>
              <Radio.Button value="abandoned">搁置</Radio.Button>
            </Radio.Group>

            {categories.length > 0 && (
              <Select
                value={categoryFilter}
                onChange={setCategoryFilter}
                size="small"
                style={{ width: 120 }}
                options={[
                  { label: '所有分类', value: 'all' },
                  ...categories.map((c) => ({ label: c, value: c })),
                ]}
              />
            )}

            <Input
              placeholder="搜索书名或作者..."
              prefix={<SearchOutlined style={{ color: 'var(--muted)' }} />}
              size="small"
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              allowClear
              style={{ width: 160 }}
            />
          </div>
        }
        style={{ marginBottom: 24, borderRadius: 18 }}
      >
        {filteredBooks.length === 0 ? (
          <Empty description="没有找到匹配的书籍" image={Empty.PRESENTED_IMAGE_SIMPLE} />
        ) : (
          <div className="bookshelf-grid">
            {filteredBooks.map((book) => (
              <BookCard
                key={book.id}
                book={book}
                onSelect={(b) => setSelectedBookId(b.id)}
                onQuickLog={(b) => setActiveLogBook(b)}
                onQuickNote={(b) => setActiveNoteBook(b)}
              />
            ))}
          </div>
        )}
      </Card>

      {/* Excerpts & Quotes Wall */}
      {notes.length > 0 && (
        <Card
          title={
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 4, height: 16, background: '#8b5cf6', borderRadius: 2, display: 'inline-block' }} />
              <span>最新书摘拾贝 ({notes.length})</span>
            </div>
          }
          style={{ borderRadius: 18, marginBottom: 24 }}
        >
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 14 }}>
            {notes.slice(0, 6).map((note) => {
              const b = bookMap.get(note.bookId);
              return (
                <div key={note.id} className="book-quote-card" style={{ margin: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink)' }}>
                      《{b?.title || '图书'}》
                    </span>
                    <span className="book-quote-page">
                      {note.pageNumber ? `P. ${note.pageNumber}` : '书摘'}
                    </span>
                  </div>
                  <div className="book-quote-text">{note.quote}</div>
                  {note.thoughts && (
                    <div className="book-quote-thoughts">
                      <strong>思考：</strong> {note.thoughts}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Drawers & Modals */}
      <BookDetailDrawer
        bookId={selectedBookId}
        open={Boolean(selectedBookId)}
        onClose={() => setSelectedBookId(null)}
        onChanged={loadData}
      />

      <ReadingLogModal
        book={activeLogBook}
        open={Boolean(activeLogBook)}
        onClose={() => setActiveLogBook(null)}
        onSuccess={loadData}
      />

      <BookNoteModal
        book={activeNoteBook}
        open={Boolean(activeNoteBook)}
        onClose={() => setActiveNoteBook(null)}
        onSuccess={loadData}
      />

      <BookEditModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onSuccess={() => {
          loadData();
        }}
      />
    </div>
  );
}
