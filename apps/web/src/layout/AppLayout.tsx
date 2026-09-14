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

const { Sider, Header, Content } = Layout;

const navigation = [
  { key: '/', icon: <HomeOutlined />, label: '主面板' },
  { key: '/discipline/habits', icon: <CheckCircleOutlined />, label: '自律' },
  { key: '/discipline/plans', icon: <CalendarOutlined />, label: '计划' },
  { key: '/finance/transactions', icon: <WalletOutlined />, label: '记账' },
  { key: '/finance/budget', icon: <DollarOutlined />, label: '预算' },
  { key: '/finance/stats', icon: <BarChartOutlined />, label: '报表' },
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
  return (
    <Menu
      theme="dark"
      mode="inline"
      selectedKeys={[activeKey(location.pathname)]}
      items={navigation.map(({ key, icon, label }) => ({ key, icon, label }))}
      onClick={({ key }) => { navigate(key); onNavigate?.(); }}
    />
  );
}

function MobileNavigation() {
  const items = navigation.filter((item) => ['/', '/finance/transactions', '/discipline/habits', '/assets', '/settings'].includes(item.key));
  return (
    <nav className="mobile-nav" aria-label="移动端主导航">
      {items.map((item) => (
        <NavLink key={item.key} to={item.key} end={item.key === '/'}>
          {item.icon}<span>{item.label === '记账' ? '账本' : item.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}

export function AppLayout({ children }: { children: ReactNode }) {
  const theme = useUIStore((state) => state.theme);
  const toggleTheme = useUIStore((state) => state.toggleTheme);
  const mobileMenuOpen = useUIStore((state) => state.mobileMenuOpen);
  const setMobileMenuOpen = useUIStore((state) => state.setMobileMenuOpen);

  return (
    <Layout className="app-shell">
      <Sider width={232} className="sidebar desktop-sidebar" breakpoint="lg" collapsedWidth={0}>
        <div className="app-logo"><span className="logo-mark">✦</span><span>lifeOS</span></div>
        <NavigationMenu />
      </Sider>
      <Layout className="page-layout">
        <Header className="topbar">
          <div className="topbar-actions">
            <Button className="mobile-menu-trigger" type="text" icon={<MenuOutlined />} onClick={() => setMobileMenuOpen(true)} aria-label="打开导航" />
            <span className="topbar-title">管理生活的每一天</span>
          </div>
          <div className="topbar-actions">
            <Tooltip title={theme === 'dark' ? '切换为浅色' : '切换为深色'}>
              <Button type="text" shape="circle" icon={theme === 'dark' ? <SunOutlined /> : <MoonOutlined />} onClick={toggleTheme} aria-label="切换主题" />
            </Tooltip>
            <Avatar size="small" style={{ background: '#5b5ce2' }}>我</Avatar>
          </div>
        </Header>
        <Content><main className="content">{children}</main></Content>
        <MobileNavigation />
      </Layout>
      <Drawer title="lifeOS" placement="left" open={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} styles={{ body: { padding: 0, background: '#17172a' } }}>
        <NavigationMenu onNavigate={() => setMobileMenuOpen(false)} />
      </Drawer>
    </Layout>
  );
}
