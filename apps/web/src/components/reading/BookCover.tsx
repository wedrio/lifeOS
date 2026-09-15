import type { Book, BookCoverTheme } from '@lifeos/shared';

interface BookCoverProps {
  book: Pick<Book, 'title' | 'author' | 'coverUrl' | 'coverTheme'>;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  onClick?: () => void;
}

const themeClasses: Record<string, string> = {
  emerald: 'theme-emerald',
  sage: 'theme-sage',
  obsidian: 'theme-obsidian',
  chestnut: 'theme-chestnut',
  ocean: 'theme-ocean',
  crimson: 'theme-crimson',
};

export const COVER_THEMES: Array<{ key: BookCoverTheme; name: string; color: string }> = [
  { key: 'emerald', name: '山岚青', color: '#164e38' },
  { key: 'sage', name: '鼠尾绿', color: '#33594b' },
  { key: 'obsidian', name: '黑曜岩', color: '#1e293b' },
  { key: 'chestnut', name: '落栗褐', color: '#5c3523' },
  { key: 'ocean', name: '深海绀', color: '#1b3d5d' },
  { key: 'crimson', name: '绯红墨', color: '#5c232f' },
];

function fallbackTheme(title: string): string {
  let hash = 0;
  for (let i = 0; i < title.length; i++) {
    hash = (hash << 5) - hash + title.charCodeAt(i);
    hash |= 0;
  }
  const keys = ['emerald', 'sage', 'obsidian', 'chestnut', 'ocean', 'crimson'];
  return keys[Math.abs(hash) % keys.length];
}

export function BookCover({ book, size = 'md', className = '', onClick }: BookCoverProps) {
  const themeKey = book.coverTheme || fallbackTheme(book.title);
  const themeClass = themeClasses[themeKey] || 'theme-emerald';

  return (
    <div
      className={`book-cover-shell size-${size} ${className}`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      title={book.title}
    >
      {book.coverUrl ? (
        <img
          src={book.coverUrl}
          alt={book.title}
          className="book-cover-real-img"
          loading="lazy"
        />
      ) : (
        <div className={`hardcover-skin ${themeClass}`}>
          <div className="hardcover-emblem">✦ 纸质典藏</div>
          <div className="hardcover-title">{book.title}</div>
          <div className="hardcover-author">{book.author || '著'}</div>
        </div>
      )}
    </div>
  );
}
