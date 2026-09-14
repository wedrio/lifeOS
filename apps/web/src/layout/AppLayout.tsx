import type { ReactNode } from 'react';
import { Avatar, Button, Drawer, Layout, Menu, Tooltip } from 'antd';
import {
  AppstoreOutlined,
  BarChartOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
  DollarOutlined,
  FileTextOutlined,
  HomeOutlined,
  MenuOutlined,
  MoonOutlined,
  SettingOutlined,
  SunOutlined,
  WalletOutlined,
} from '@ant-design/icons';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useUIStore } from '../stores/uiStore';
import { dataSource } from '../data';

const { Sider, Header, Content } = Layout;

const navigation = [
  { key: '/', icon: <HomeOutlined />, label: '今日' },
  { key: '/discipline/habits', icon: <CheckCircleOutlined />, label: '自律' },
  { key: '/discipline/plans', icon: <CalendarOutlined />, label: '计划' },
  { key: '/finance/transactions', icon: <WalletOutlined />, label: '账本' },
  { key: '/finance/budget', icon: <DollarOutlined />, label: '预算' },
  { key: '/finance/stats', icon: <BarChartOutlined />, label: '洞察' },
  { key: '/assets', icon: <AppstoreOutlined />, label: '资产' },
  { key: '/moments', icon: <FileTextOutlined />, label: '日常' },
  { key: '/settings', icon: <SettingOutlined />, label: '设置' },
];

function activeKey(pathname: string) {
  return navigation.find((item) => item.key !== '/' && pathname.startsWith(item.key))?.key ?? '/';
}

function NavigationMenu({ onNavigate }: { onNavigate?: () => void }) {
  const navigate = useNavigate();
  const location = useLocation();
  return <Menu className="app-menu" mode="inline" selectedKeys={[activeKey(location.pathname)]} items={navigation.map(({ key, icon, label }) => ({ key, icon, label }))} onClick={({ key }) => { navigate(key); onNavigate?.(); }} />;
}

function MobileNavigation() {
  const items = navigation.filter((item) => ['/', '/finance/transactions', '/discipline/habits', '/assets', '/settings'].includes(item.key));
  return <nav className="mobile-nav" aria-label="移动端主导航">{items.map((item) => <NavLink key={item.key} to={item.key} end={item.key === '/'}>{item.icon}<span>{item.label}</span></NavLink>)}</nav>;
}

export function AppLayout({ children }: { children: ReactNode }) {
  const theme = useUIStore((state) => state.theme);
  const setTheme = useUIStore((state) => state.setTheme);
  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    void dataSource.settings.update({ theme: next });
  };
  const mobileMenuOpen = useUIStore((state) => state.mobileMenuOpen);
  const setMobileMenuOpen = useUIStore((state) => state.setMobileMenuOpen);

  return <Layout className="app-shell">
    <Sider width={252} className="sidebar desktop-sidebar" breakpoint="lg" collapsedWidth={0}>
      <div className="app-logo">
        <span className="traffic-lights" aria-hidden="true"><i /><i /><i /></span>
        <span className="logo-mark">✦</span>
        <span className="brand-lockup"><strong>lifeOS</strong><small>your life, in flow</small></span>
      </div>
      <div className="sidebar-caption">LIFE CANVAS</div>
      <NavigationMenu />
      <div className="sidebar-footer"><span className="sidebar-footer-glow" /><span>把日子过成作品</span></div>
    </Sider>
    <Layout className="page-layout">
      <Header className="topbar">
        <div className="topbar-actions">
          <Button className="mobile-menu-trigger" type="text" icon={<MenuOutlined />} onClick={() => setMobileMenuOpen(true)} aria-label="打开导航" />
          <span className="topbar-title"><i />生活正在发生</span>
        </div>
        <div className="topbar-actions">
          <Tooltip title={theme === 'dark' ? '切换为浅色' : '切换为深色'}><Button className="chrome-button" type="text" shape="circle" icon={theme === 'dark' ? <SunOutlined /> : <MoonOutlined />} onClick={toggleTheme} aria-label="切换主题" /></Tooltip>
          <Avatar className="profile-avatar" size={32}>我</Avatar>
        </div>
      </Header>
      <Content><main className="content">{children}</main></Content>
      <MobileNavigation />
    </Layout>
    <Drawer className="mobile-drawer" title={<span className="drawer-brand"><span className="logo-mark">✦</span> lifeOS</span>} placement="left" open={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} styles={{ body: { padding: 12 } }}>
      <NavigationMenu onNavigate={() => setMobileMenuOpen(false)} />
    </Drawer>
  </Layout>;
}
