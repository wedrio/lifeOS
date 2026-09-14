import { useCallback, useEffect, useState } from 'react';
import { Button, Card, Col, Empty, Popconfirm, Row, Segmented, Space, Statistic, Tabs, Tag, Typography, message } from 'antd';
import { DeleteOutlined, EditOutlined, PlusOutlined, WarningOutlined } from '@ant-design/icons';
import type { Asset, AssetKind, PhysicalAssetStatus } from '@lifeos/shared';
import { dataSource, generateAssetsDemoData } from '../data';
import { daysBetween, today } from '../lib/dates';
import { formatCents } from '../lib/finance';
import { AssetFormModal } from '../components/assets/AssetFormModal';
import '../styles/assets.css';

const statusMeta: Record<PhysicalAssetStatus, { label: string; color: string }> = { in_use: { label: '在用', color: 'green' }, idle: { label: '闲置', color: 'gold' }, sold: { label: '已卖出', color: 'default' } };
const billingLabel = { monthly: '月付', quarterly: '季付', yearly: '年付' } as const;

export function AssetsPage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [kind, setKind] = useState<AssetKind>('physical');
  const [physicalStatus, setPhysicalStatus] = useState<'all' | PhysicalAssetStatus>('all');
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<Asset | undefined>();

  const reload = useCallback(async () => {
    setLoading(true);
    try { setAssets(await dataSource.assets.list()); }
    catch (error) { message.error(error instanceof Error ? error.message : '资产加载失败'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void reload(); }, [reload]);

  const physicalAssets = assets.filter((asset) => asset.kind === 'physical');
  const subscriptions = assets.filter((asset) => asset.kind === 'subscription');
  const estimatedValue = physicalAssets.filter((asset) => asset.status !== 'sold').reduce((sum, asset) => sum + (asset.estimatedValue ?? 0), 0);
  const monthlySubscription = subscriptions.reduce((sum, asset) => sum + monthlyEquivalent(asset), 0);
  const annualSubscription = subscriptions.reduce((sum, asset) => sum + annualEquivalent(asset), 0);
  const expiring = assets.filter((asset) => { const date = expiryDate(asset); return date !== undefined && daysBetween(today(), date) <= 30; }).length;
  const shownAssets = assets.filter((asset) => asset.kind === kind).filter((asset) => kind !== 'physical' || physicalStatus === 'all' || asset.status === physicalStatus).sort((a, b) => deadlineSort(a) - deadlineSort(b) || b.updatedAt.localeCompare(a.updatedAt));

  const openEditor = (asset?: Asset) => { setEditing(asset); setEditorOpen(true); };
  const remove = async (asset: Asset) => {
    try { await dataSource.assets.remove(asset.id); message.success('资产已删除'); await reload(); }
    catch (error) { message.error(error instanceof Error ? error.message : '删除失败'); }
  };
  const seedDemo = async () => {
    try {
      const created = await generateAssetsDemoData();
      if (created) message.success(`已生成 ${created} 项演示资产`);
      else message.info('已有资产，未覆盖你的数据');
      await reload();
    } catch (error) { message.error(error instanceof Error ? error.message : '生成演示数据失败'); }
  };

  return <>
    <section className="page-heading"><div><h1>资产登记</h1><p>让设备、保修和订阅到期日都清楚可见。</p></div><Space wrap><Button onClick={() => void seedDemo()}>填充演示数据</Button><Button type="primary" icon={<PlusOutlined />} onClick={() => openEditor()}>登记资产</Button></Space></section>
    <Row gutter={[16, 16]} className="asset-summary">
      <Col xs={24} sm={8}><Card><span className="asset-summary-label">实物资产当前估值</span><Statistic value={estimatedValue / 100} precision={2} prefix="¥" valueStyle={{ color: '#2f9c67' }} /><Typography.Text type="secondary">{physicalAssets.filter((asset) => asset.status !== 'sold').length} 项在册设备</Typography.Text></Card></Col>
      <Col xs={12} sm={8}><Card><span className="asset-summary-label">月均订阅支出</span><Statistic value={monthlySubscription / 100} precision={2} prefix="¥" valueStyle={{ color: '#e76f8a' }} /><Typography.Text type="secondary">{subscriptions.length} 项订阅</Typography.Text></Card></Col>
      <Col xs={12} sm={8}><Card><span className="asset-summary-label">年度订阅支出</span><Statistic value={annualSubscription / 100} precision={2} prefix="¥" valueStyle={{ color: '#f09a45' }} /><Typography.Text type="secondary"><WarningOutlined /> 30 天内到期 {expiring} 项</Typography.Text></Card></Col>
    </Row>
    <Card className="asset-tabs">
      <Tabs activeKey={kind} onChange={(next) => setKind(next as AssetKind)} items={[{ key: 'physical', label: `实物资产 (${physicalAssets.length})` }, { key: 'subscription', label: `订阅 / VIP (${subscriptions.length})` }]} />
      {kind === 'physical' && <div className="finance-toolbar"><Segmented value={physicalStatus} onChange={(next) => setPhysicalStatus(next as 'all' | PhysicalAssetStatus)} options={[{ label: '全部', value: 'all' }, { label: '在用', value: 'in_use' }, { label: '闲置', value: 'idle' }, { label: '已卖出', value: 'sold' }]} /></div>}
      {loading ? <Row gutter={[16, 16]}>{Array.from({ length: 3 }, (_, index) => <Col xs={24} md={12} xl={8} key={index}><Card loading /></Col>)}</Row> : shownAssets.length ? <div className="asset-grid">{shownAssets.map((asset) => <AssetCard key={asset.id} asset={asset} onEdit={() => openEditor(asset)} onDelete={() => void remove(asset)} />)}</div> : <Empty description={kind === 'physical' ? '还没有实物资产' : '还没有订阅或 VIP'}><Button type="primary" onClick={() => openEditor()}>登记第一项资产</Button></Empty>}
    </Card>
    <AssetFormModal open={editorOpen} asset={editing} onClose={() => { setEditorOpen(false); setEditing(undefined); }} onSaved={reload} />
  </>;
}

function expiryDate(asset: Asset): string | undefined { return asset.kind === 'physical' ? asset.warrantyUntil : asset.expireDate; }
function monthlyEquivalent(asset: Asset) { if (asset.kind !== 'subscription' || !asset.price) return 0; return asset.billingCycle === 'yearly' ? asset.price / 12 : asset.billingCycle === 'quarterly' ? asset.price / 3 : asset.price; }
function annualEquivalent(asset: Asset) { if (asset.kind !== 'subscription' || !asset.price) return 0; return asset.billingCycle === 'yearly' ? asset.price : asset.billingCycle === 'quarterly' ? asset.price * 4 : asset.price * 12; }
function deadlineSort(asset: Asset) { const date = expiryDate(asset); return date ? daysBetween(today(), date) : Number.MAX_SAFE_INTEGER; }

function Deadline({ asset }: { asset: Asset }) {
  const date = expiryDate(asset);
  if (!date) return <div className="asset-deadline"><span>◷</span><span>{asset.kind === 'physical' ? '未设置保修到期日' : '未设置订阅到期日'}</span></div>;
  const days = daysBetween(today(), date);
  const unit = asset.kind === 'physical' ? '保修' : '订阅';
  const text = days < 0 ? `${unit}已过期 ${Math.abs(days)} 天` : days === 0 ? `${unit}今日到期` : days === 1 ? `${unit}明日到期` : days <= 3 ? `${days} 天内到期` : days <= 7 ? `${days} 天内到期` : days <= 30 ? `${days} 天内到期` : `${unit}到期：${date}`;
  const urgent = days <= 3;
  return <div className={`asset-deadline ${urgent ? 'is-critical' : days <= 30 ? 'is-soon' : ''}`}><WarningOutlined /><span>{text}</span></div>;
}

function AssetCard({ asset, onEdit, onDelete }: { asset: Asset; onEdit: () => void; onDelete: () => void }) {
  const deadline = expiryDate(asset);
  const expired = deadline ? daysBetween(today(), deadline) < 0 : false;
  const status = asset.kind === 'physical' ? statusMeta[asset.status ?? 'in_use'] : undefined;
  return <Card className={`asset-card ${expired ? 'is-expired' : ''}`}><div className="asset-card-header"><div className="asset-card-title"><span className="asset-card-icon">{asset.icon}</span><div><h3 title={asset.name}>{asset.name}</h3><div className="asset-card-category">{asset.category}{asset.brand ? ` · ${asset.brand}` : ''}</div></div></div>{status ? <Tag color={status.color}>{status.label}</Tag> : <Tag color={asset.autoRenew ? 'green' : 'default'}>{asset.autoRenew ? '自动续费' : '手动续费'}</Tag>}</div><Deadline asset={asset} /><div className="asset-card-details">{asset.kind === 'physical' ? <><span>{asset.model ? `型号：${asset.model}` : '型号：未填写'}</span><span>{asset.purchaseDate ? `购入：${asset.purchaseDate}` : '购入日期：未填写'}{asset.purchasePrice !== undefined ? ` · ${formatCents(asset.purchasePrice)}` : ''}</span><span>{asset.estimatedValue !== undefined ? `当前估值：${formatCents(asset.estimatedValue)}` : '当前估值：未填写'}</span></> : <><span>费用：{asset.price === undefined ? '未填写' : `${formatCents(asset.price)} / ${billingLabel[asset.billingCycle ?? 'monthly']}`}</span><span>{asset.startDate ? `开始：${asset.startDate}` : '开始日期：未填写'}</span><span className="asset-note">{asset.accountNote ? `备注：${asset.accountNote}` : '暂无账号备注'}</span></>}</div><div className="asset-card-footer"><Typography.Text type="secondary" style={{ fontSize: 12 }}>{asset.kind === 'physical' ? asset.serialNo ? `序列号：${asset.serialNo}` : '实物设备' : '订阅服务'}</Typography.Text><Space size={0}><Button type="text" size="small" icon={<EditOutlined />} onClick={onEdit} aria-label="编辑资产" /><Popconfirm title="删除这项资产？" onConfirm={onDelete} okText="删除" cancelText="取消"><Button type="text" danger size="small" icon={<DeleteOutlined />} aria-label="删除资产" /></Popconfirm></Space></div></Card>;
}
