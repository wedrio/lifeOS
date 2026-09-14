import React, { useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { ConfigProvider, theme as antdTheme } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import { BrowserRouter } from 'react-router-dom';
import { AppRoutes } from './routes';
import { useUIStore } from './stores/uiStore';
import { dataSource } from './data';
import './styles/global.css';

function Application() {
  const theme = useUIStore((state) => state.theme);
  const setTheme = useUIStore((state) => state.setTheme);
  useEffect(() => {
    void dataSource.settings.get().then((settings) => {
      setTheme(settings.theme === 'system' ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') : settings.theme);
    });
  }, [setTheme]);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);
  return (
    <ConfigProvider
      locale={zhCN}
      theme={{
        cssVar: true,
        algorithm: theme === 'dark' ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
        token: {
          colorPrimary: '#238d5b',
          colorInfo: '#238d5b',
          colorSuccess: '#359e67',
          colorWarning: '#e5a84d',
          colorError: '#dd6d79',
          borderRadius: 14,
          controlHeight: 36,
          fontFamily: '"SF Pro Display", "PingFang SC", "Helvetica Neue", sans-serif',
        },
      }}
    >
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </ConfigProvider>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Application />
  </React.StrictMode>,
);
