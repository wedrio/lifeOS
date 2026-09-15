import { Card, Progress, Rate, Tag } from 'antd';
import { BookOutlined, FormOutlined } from '@ant-design/icons';
import type { Book } from '@lifeos/shared';
import { BookCover } from './BookCover';

interface BookCardProps {
  book: Book;
  onSelect: (book: Book) => void;
  onQuickLog?: (book: Book) => void;
  onQuickNote?: (book: Book) => void;
}

const statusMap = {
  reading: { label: '在读', color: 'processing' },
  queue: { label: '待读', color: 'default' },
  finished: { label: '已读', color: 'success' },
  abandoned: { label: '搁置', color: 'warning' },
};

export function BookCard({ book, onSelect }: BookCardProps) {
  const percent = book.totalPages > 0 ? Math.min(100, Math.round(((book.currentPage || 0) / book.totalPages) * 100)) : 0;

  return (
    <Card
      className="bookshelf-card"
      hoverable
      onClick={() => onSelect(book)}
    >
      <div className="bookshelf-card-top">
        <BookCover book={book} size="sm" />
        <div className="bookshelf-card-meta">
          <div className="bookshelf-card-title" title={book.title}>
            {book.title}
          </div>
          <div className="bookshelf-card-author" title={book.author || ''}>
            {book.author || '未知作者'}
          </div>
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 'auto' }}>
            <Tag color={statusMap[book.status].color} style={{ fontSize: 11, margin: 0 }}>
              {statusMap[book.status].label}
            </Tag>
            {book.category && (
              <Tag color="cyan" style={{ fontSize: 11, margin: 0 }}>
                {book.category}
              </Tag>
            )}
          </div>
        </div>
      </div>

      <div style={{ marginTop: 8 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--muted)', marginBottom: 3 }}>
          <span>{book.currentPage || 0} / {book.totalPages} 页</span>
          <span>{percent}%</span>
        </div>
        <Progress
          percent={percent}
          size="small"
          showInfo={false}
          strokeColor={book.status === 'finished' ? '#10b981' : '#34d399'}
        />
      </div>

      {book.rating ? (
        <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Rate disabled defaultValue={book.rating} allowHalf style={{ fontSize: 11 }} />
          {book.finishDate && (
            <span style={{ fontSize: 10, color: 'var(--muted)' }}>
              {book.finishDate.slice(5)} 读完
            </span>
          )}
        </div>
      ) : null}
    </Card>
  );
}

export function DeskBookCard({ book, onSelect, onQuickLog, onQuickNote }: BookCardProps) {
  const percent = book.totalPages > 0 ? Math.min(100, Math.round(((book.currentPage || 0) / book.totalPages) * 100)) : 0;
  const remaining = Math.max(0, book.totalPages - (book.currentPage || 0));

  return (
    <Card className="desk-book-card" hoverable onClick={() => onSelect(book)}>
      <div className="desk-card-inner">
        <BookCover book={book} size="md" />
        <div className="desk-book-info">
          <h3 title={book.title}>{book.title}</h3>
          <div className="desk-book-author">{book.author || '未知作者'}</div>

          {book.category && (
            <div style={{ marginBottom: 6 }}>
              <Tag color="cyan" style={{ fontSize: 11, margin: 0 }}>{book.category}</Tag>
            </div>
          )}

          <div className="desk-book-progress-wrap">
            <div className="desk-book-progress-header">
              <span style={{ color: 'var(--ink)', fontWeight: 600 }}>
                第 {book.currentPage || 0} / {book.totalPages} 页
              </span>
              <span style={{ color: 'var(--muted)' }}>余 {remaining} 页 ({percent}%)</span>
            </div>
            <Progress percent={percent} strokeColor="#34d399" showInfo={false} size="small" />
          </div>

          <div className="desk-book-actions" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="ant-btn ant-btn-primary ant-btn-sm"
              onClick={() => onQuickLog?.(book)}
              style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}
            >
              <BookOutlined /> 翻书打卡
            </button>
            <button
              type="button"
              className="ant-btn ant-btn-default ant-btn-sm"
              onClick={() => onQuickNote?.(book)}
              style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}
            >
              <FormOutlined /> 记书摘
            </button>
          </div>
        </div>
      </div>
    </Card>
  );
}
