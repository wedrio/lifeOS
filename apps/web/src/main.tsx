import React, { useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { ConfigProvider, theme as antdTheme } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import { HashRouter } from 'react-router-dom';
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

  const isDark = theme === 'dark';

  return (
    <ConfigProvider
      locale={zhCN}
      theme={{
        cssVar: true,
        algorithm: isDark ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
        token: {
          colorPrimary: isDark ? '#10b981' : '#238d5b',
          colorInfo: isDark ? '#38bdf8' : '#238d5b',
          colorSuccess: isDark ? '#34d399' : '#359e67',
          colorWarning: isDark ? '#fbbf24' : '#e5a84d',
          colorError: isDark ? '#f87171' : '#dd6d79',
          borderRadius: 14,
          controlHeight: 36,
          fontFamily: '"SF Pro Display", "PingFang SC", "Helvetica Neue", sans-serif',
          ...(isDark
            ? {
                colorBgBase: '#0c1017',
                colorBgContainer: 'rgba(18, 25, 38, 0.72)',
                colorBgElevated: '#141d2b',
                colorBgLayout: '#0c1017',
                colorBorder: 'rgba(255, 255, 255, 0.10)',
                colorBorderSecondary: 'rgba(255, 255, 255, 0.06)',
                colorText: '#f1f5f9',
                colorTextSecondary: '#94a3b8',
                colorTextTertiary: '#64748b',
              }
            : {}),
        },
        components: isDark
          ? {
              Card: {
                colorBgContainer: 'rgba(18, 25, 38, 0.72)',
                colorBorderSecondary: 'rgba(255, 255, 255, 0.08)',
              },
              Table: {
                colorBgContainer: 'transparent',
                headerBg: 'rgba(255, 255, 255, 0.035)',
                headerColor: '#94a3b8',
                rowHoverBg: 'rgba(255, 255, 255, 0.04)',
                borderColor: 'rgba(255, 255, 255, 0.07)',
              },
              Modal: {
                contentBg: '#131b28',
                headerBg: '#131b28',
              },
              Drawer: {
                colorBgElevated: '#131b28',
              },
              Segmented: {
                trackBg: 'rgba(12, 17, 26, 0.65)',
                itemSelectedBg: 'rgba(255, 255, 255, 0.12)',
                itemSelectedColor: '#34d399',
                itemColor: '#94a3b8',
                itemHoverColor: '#f1f5f9',
              },
              Input: {
                colorBgContainer: 'rgba(13, 19, 30, 0.6)',
                colorBorder: 'rgba(255, 255, 255, 0.12)',
                activeBorderColor: '#34d399',
                hoverBorderColor: 'rgba(52, 211, 153, 0.5)',
              },
              Select: {
                colorBgContainer: 'rgba(13, 19, 30, 0.6)',
                colorBorder: 'rgba(255, 255, 255, 0.12)',
              },
              DatePicker: {
                colorBgContainer: 'rgba(13, 19, 30, 0.6)',
                colorBorder: 'rgba(255, 255, 255, 0.12)',
              },
              Button: {
                defaultBg: 'rgba(255, 255, 255, 0.06)',
                defaultBorderColor: 'rgba(255, 255, 255, 0.12)',
                defaultColor: '#e2e8f0',
                defaultHoverBg: 'rgba(255, 255, 255, 0.10)',
                defaultHoverBorderColor: 'rgba(52, 211, 153, 0.4)',
                defaultHoverColor: '#34d399',
              },
            }
          : undefined,
      }}
    >
      <HashRouter>
        <AppRoutes />
      </HashRouter>
    </ConfigProvider>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Application />
  </React.StrictMode>,
);
