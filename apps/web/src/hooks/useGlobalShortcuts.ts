import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { message } from 'antd';
import { useUIStore } from '../stores/uiStore';
import { dataSource } from '../data';

export function useGlobalShortcuts() {
  const navigate = useNavigate();
  const theme = useUIStore((state) => state.theme);
  const setTheme = useUIStore((state) => state.setTheme);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts if user is typing in input, textarea, select or contentEditable
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        return;
      }

      // Ignore if modifier keys are pressed (Ctrl, Cmd, Alt)
      if (e.ctrlKey || e.metaKey || e.altKey) {
        return;
      }

      const key = e.key.toLowerCase();

      switch (key) {
        case 't': {
          e.preventDefault();
          const next = theme === 'dark' ? 'light' : 'dark';
          setTheme(next);
          void dataSource.settings.update({ theme: next });
          message.info(next === 'dark' ? '🌙 已切换为深色模式' : '☀️ 已切换为浅色模式', 1);
          break;
        }
        case 'n': {
          e.preventDefault();
          navigate('/finance/transactions?new=1');
          break;
        }
        case 'm': {
          e.preventDefault();
          navigate('/moments?new=1');
          break;
        }
        case 'h': {
          e.preventDefault();
          navigate('/discipline/habits');
          break;
        }
        case 'p': {
          e.preventDefault();
          navigate('/discipline/plans');
          break;
        }
        case 'b': {
          e.preventDefault();
          navigate('/discipline/reading');
          break;
        }
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [theme, setTheme, navigate]);
}
