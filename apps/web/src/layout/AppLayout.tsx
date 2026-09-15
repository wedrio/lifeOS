import { useEffect, useState, type ReactNode } from 'react';
import type { MenuProps } from 'antd';
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
  ReadOutlined,
  SettingOutlined,
  SunOutlined,
  WalletOutlined,
} from '@ant-design/icons';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useUIStore } from '../stores/uiStore';
import { dataSource } from '../data';

const { Sider, Header, Content } = Layout;

const navigation = [
  { key: '/', icon: <HomeOutlined />, label: '今日总览' },
  { key: '/discipline/habits', icon: <CheckCircleOutlined />, label: '习惯养成' },
  { key: '/discipline/plans', icon: <CalendarOutlined />, label: '行动计划' },
  { key: '/discipline/reading', icon: <ReadOutlined />, label: '纸质阅读' },
  { key: '/finance/transactions', icon: <WalletOutlined />, label: '收支记录' },
  { key: '/finance/budget', icon: <DollarOutlined />, label: '预算边界' },
  { key: '/finance/stats', icon: <BarChartOutlined />, label: '财务洞察' },
  { key: '/assets', icon: <AppstoreOutlined />, label: '资产与订阅' },
  { key: '/moments', icon: <FileTextOutlined />, label: '日常记录' },
  { key: '/settings', icon: <SettingOutlined />, label: '偏好设置' },
];

const menuItems: MenuProps['items'] = [
  navigation[0],
  {
    key: 'growth',
    icon: <CheckCircleOutlined />,
    label: '自我生长',
    children: [navigation[1], navigation[2], navigation[3]],
  },
  {
    key: 'finance',
    icon: <WalletOutlined />,
    label: '财务脉络',
    children: [navigation[4], navigation[5], navigation[6]],
  },
  {
    key: 'life',
    icon: <AppstoreOutlined />,
    label: '生活档案',
    children: [navigation[7], navigation[8]],
  },
  navigation[9],
];

const mobileNavigation = [
  { ...navigation[0], label: '今日', section: 'overview' },
  { ...navigation[1], label: '成长', section: 'growth' },
  { ...navigation[4], label: '财务', section: 'finance' },
  { ...navigation[7], label: '生活', section: 'life' },
  { ...navigation[9], label: '设置', section: 'settings' },
];

function activeKey(pathname: string) {
  return navigation.find((item) => item.key !== '/' && pathname.startsWith(item.key))?.key ?? '/';
}

function activeSection(pathname: string) {
  if (pathname.startsWith('/discipline')) return 'growth';
  if (pathname.startsWith('/finance')) return 'finance';
  if (pathname.startsWith('/assets') || pathname.startsWith('/moments')) return 'life';
  if (pathname.startsWith('/settings')) return 'settings';
  return 'overview';
}

function sectionLabel(section: string) {
  return ({ overview: '每日节奏', growth: '自我生长', finance: '财务脉络', life: '生活档案', settings: '偏好设置' } as Record<string, string>)[section];
}

function NavigationMenu({ onNavigate }: { onNavigate?: () => void }) {
  const navigate = useNavigate();
  const location = useLocation();
  const section = activeSection(location.pathname);
  const activeGroup = ['growth', 'finance', 'life'].includes(section) ? section : undefined;
  const [openKeys, setOpenKeys] = useState<string[]>(activeGroup ? [activeGroup] : []);

  useEffect(() => {
    if (activeGroup) setOpenKeys((current) => current.includes(activeGroup) ? current : [...current, activeGroup]);
  }, [activeGroup]);

  return (
    <Menu
      className="app-menu"
      mode="inline"
      selectedKeys={[activeKey(location.pathname)]}
      openKeys={openKeys}
      items={menuItems}
      onOpenChange={(keys) => setOpenKeys(keys.map(String))}
      onClick={({ key }) => {
        navigate(String(key));
        onNavigate?.();
      }}
    />
  );
}

function MobileNavigation() {
  const location = useLocation();
  const currentSection = activeSection(location.pathname);
  return (
    <nav className="mobile-nav" aria-label="移动端主导航">
      {mobileNavigation.map((item) => (
        <NavLink
          className={currentSection === item.section ? 'active' : undefined}
          key={item.key}
          to={item.key}
          end={item.key === '/'}
        >
          {item.icon}
          <span>{item.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}

export function AppLayout({ children }: { children: ReactNode }) {
  const theme = useUIStore((state) => state.theme);
  const setTheme = useUIStore((state) => state.setTheme);
  const mobileMenuOpen = useUIStore((state) => state.mobileMenuOpen);
  const setMobileMenuOpen = useUIStore((state) => state.setMobileMenuOpen);
  const location = useLocation();
  const currentItem = navigation.find((item) => item.key === activeKey(location.pathname)) ?? navigation[0];
  const currentSection = activeSection(location.pathname);
  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    void dataSource.settings.update({ theme: next });
  };

  return (
    <Layout className="app-shell">
      <Sider width={272} className="sidebar desktop-sidebar" breakpoint="lg" collapsedWidth={0}>
        <div className="app-logo">
          <span className="traffic-lights" aria-hidden="true"><i /><i /><i /></span>
          <span className="logo-mark">✦</span>
          <span className="brand-lockup"><strong>lifeOS</strong><small>your life, in flow</small></span>
        </div>
        <div className="sidebar-caption">YOUR LIVING SYSTEM</div>
        <NavigationMenu />
        <div className="sidebar-footer"><span className="sidebar-footer-glow" /><span>把日子养成喜欢的样子</span></div>
      </Sider>
      <Layout className="page-layout">
        <Header className="topbar">
          <div className="topbar-actions">
            <Button
              className="mobile-menu-trigger"
              type="text"
              icon={<MenuOutlined />}
              onClick={() => setMobileMenuOpen(true)}
              aria-label="打开导航"
            />
            <span className="topbar-title">
              <i />
              <span className="topbar-section">{sectionLabel(currentSection)}</span>
              <em>/</em>
              <strong>{currentItem.label}</strong>
            </span>
          </div>
          <div className="topbar-actions">
            <span className="topbar-pulse"><b />一切生长中</span>
            <Tooltip title={theme === 'dark' ? '切换为浅色' : '切换为深色'}>
              <Button
                className="chrome-button"
                type="text"
                shape="circle"
                icon={theme === 'dark' ? <SunOutlined /> : <MoonOutlined />}
                onClick={toggleTheme}
                aria-label="切换主题"
              />
            </Tooltip>
            <Avatar className="profile-avatar" size={32}>我</Avatar>
          </div>
        </Header>
        <Content><main className="content">{children}</main></Content>
        <MobileNavigation />
      </Layout>
      <Drawer
        className="mobile-drawer"
        title={<span className="drawer-brand"><span className="logo-mark">✦</span> lifeOS</span>}
        placement="left"
        open={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        styles={{ body: { padding: 12 } }}
      >
        <NavigationMenu onNavigate={() => setMobileMenuOpen(false)} />
      </Drawer>
    </Layout>
  );
}
