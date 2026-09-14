import { useEffect } from 'react';
import { Button, Form, Input, InputNumber, Modal, Segmented, Select, Switch, message } from 'antd';
import type { Asset, AssetInput, AssetKind, BillingCycle, PhysicalAssetStatus } from '@lifeos/shared';
import { assetInputSchema } from '@lifeos/shared';
import { dataSource } from '../../data';
import { fromCents, toCents } from '../../lib/finance';

interface AssetFormValues {
  kind: AssetKind;
  name: string;
  icon: string;
  category: string;
  brand?: string;
  model?: string;
  serialNo?: string;
  purchaseDate?: string;
  purchasePrice?: number;
  warrantyUntil?: string;
  estimatedValue?: number;
  status?: PhysicalAssetStatus;
  price?: number;
  billingCycle?: BillingCycle;
  startDate?: string;
  expireDate?: string;
  autoRenew?: boolean;
  accountNote?: string;
}

const physicalCategories = ['手机', '平板', '电脑', '家电', '数码', '其他'];
const subscriptionCategories = ['视频', '音乐', '云盘', '办公', '工具', '游戏', '其他'];
const centsOrUndefined = (value?: number) => typeof value === 'number' ? toCents(value) : undefined;

export function AssetFormModal({ asset, open, onClose, onSaved }: { asset?: Asset; open: boolean; onClose: () => void; onSaved: () => Promise<void> }) {
  const [form] = Form.useForm<AssetFormValues>();
  const kind = Form.useWatch('kind', form) ?? asset?.kind ?? 'physical';
  const categoryOptions = kind === 'physical' ? physicalCategories : subscriptionCategories;

  useEffect(() => {
    if (!open) return;
    form.setFieldsValue({
      kind: asset?.kind ?? 'physical', name: asset?.name, icon: asset?.icon ?? '📦', category: asset?.category,
      brand: asset?.brand, model: asset?.model, serialNo: asset?.serialNo, purchaseDate: asset?.purchaseDate,
      purchasePrice: asset?.purchasePrice === undefined ? undefined : fromCents(asset.purchasePrice), warrantyUntil: asset?.warrantyUntil,
      estimatedValue: asset?.estimatedValue === undefined ? undefined : fromCents(asset.estimatedValue), status: asset?.status ?? 'in_use',
      price: asset?.price === undefined ? undefined : fromCents(asset.price), billingCycle: asset?.billingCycle ?? 'monthly', startDate: asset?.startDate,
      expireDate: asset?.expireDate, autoRenew: asset?.autoRenew ?? false, accountNote: asset?.accountNote,
    });
  }, [asset, form, open]);

  const save = async (values: AssetFormValues) => {
    const shared = { kind: values.kind, name: values.name.trim(), icon: values.icon, category: values.category.trim() };
    const input: AssetInput = values.kind === 'physical' ? {
      ...shared,
      brand: values.brand?.trim() || undefined, model: values.model?.trim() || undefined, serialNo: values.serialNo?.trim() || undefined,
      purchaseDate: values.purchaseDate || undefined, purchasePrice: centsOrUndefined(values.purchasePrice), warrantyUntil: values.warrantyUntil || undefined,
      estimatedValue: centsOrUndefined(values.estimatedValue), status: values.status ?? 'in_use',
      price: undefined, billingCycle: undefined, startDate: undefined, expireDate: undefined, autoRenew: undefined, accountNote: undefined,
    } : {
      ...shared,
      price: centsOrUndefined(values.price), billingCycle: values.billingCycle ?? 'monthly', startDate: values.startDate || undefined,
      expireDate: values.expireDate || undefined, autoRenew: values.autoRenew ?? false, accountNote: values.accountNote?.trim() || undefined,
      brand: undefined, model: undefined, serialNo: undefined, purchaseDate: undefined, purchasePrice: undefined, warrantyUntil: undefined, estimatedValue: undefined, status: undefined,
    };
    const result = assetInputSchema.safeParse(input);
    if (!result.success) return message.error(result.error.issues[0]?.message ?? '请检查资产信息');
    try {
      if (asset) await dataSource.assets.update(asset.id, result.data);
      else await dataSource.assets.create(result.data);
      message.success(asset ? '资产已更新' : '资产已登记');
      await onSaved();
      onClose();
    } catch (error) { message.error(error instanceof Error ? error.message : '保存失败'); }
  };

  return <Modal open={open} title={asset ? '编辑资产' : '登记资产'} onCancel={onClose} footer={null} destroyOnClose width={720}>
    <Form form={form} layout="vertical" onFinish={save} initialValues={{ kind: 'physical', icon: '📦', status: 'in_use', billingCycle: 'monthly', autoRenew: false }}>
      <Form.Item name="kind" label="资产类型" rules={[{ required: true }]}><Segmented block options={[{ label: '实物资产', value: 'physical' }, { label: '订阅 / VIP', value: 'subscription' }]} /></Form.Item>
      <div className="form-three-columns"><Form.Item name="name" label="名称" rules={[{ required: true, message: '请输入资产名称' }]}><Input maxLength={120} placeholder={kind === 'physical' ? '例如：iPhone 15 Pro' : '例如：Apple Music'} /></Form.Item><Form.Item name="icon" label="图标" rules={[{ required: true }]}><Input maxLength={8} /></Form.Item><Form.Item name="category" label="分类" rules={[{ required: true, message: '请输入或选择分类' }]}><Input list={`${kind}-categories`} placeholder="选择或输入" /></Form.Item></div><datalist id={`${kind}-categories`}>{categoryOptions.map((category) => <option key={category} value={category} />)}</datalist>
      {kind === 'physical' ? <>
        <div className="form-three-columns"><Form.Item name="brand" label="品牌"><Input maxLength={80} placeholder="例如：Apple" /></Form.Item><Form.Item name="model" label="型号"><Input maxLength={120} placeholder="可选" /></Form.Item><Form.Item name="serialNo" label="序列号"><Input maxLength={160} placeholder="可选" /></Form.Item></div>
        <div className="form-three-columns"><Form.Item name="purchaseDate" label="购入日期"><Input type="date" /></Form.Item><Form.Item name="purchasePrice" label="购入价格"><InputNumber min={0} precision={2} prefix="¥" style={{ width: '100%' }} /></Form.Item><Form.Item name="estimatedValue" label="当前估值"><InputNumber min={0} precision={2} prefix="¥" style={{ width: '100%' }} /></Form.Item></div>
        <div className="form-two-columns"><Form.Item name="warrantyUntil" label="保修到期"><Input type="date" /></Form.Item><Form.Item name="status" label="状态"><Select options={[{ label: '在用', value: 'in_use' }, { label: '闲置', value: 'idle' }, { label: '已卖出', value: 'sold' }]} /></Form.Item></div>
      </> : <>
        <div className="form-three-columns"><Form.Item name="price" label="价格" rules={[{ required: true, message: '请填写订阅价格' }]}><InputNumber min={0} precision={2} prefix="¥" style={{ width: '100%' }} /></Form.Item><Form.Item name="billingCycle" label="计费周期"><Select options={[{ label: '月付', value: 'monthly' }, { label: '季付', value: 'quarterly' }, { label: '年付', value: 'yearly' }]} /></Form.Item><Form.Item name="autoRenew" label="自动续费" valuePropName="checked"><Switch checkedChildren="开启" unCheckedChildren="关闭" /></Form.Item></div>
        <div className="form-two-columns"><Form.Item name="startDate" label="开始日期" rules={[{ required: true, message: '请选择订阅开始日期' }]}><Input type="date" /></Form.Item><Form.Item name="expireDate" label="到期日期" rules={[{ required: true, message: '请选择订阅到期日期' }]}><Input type="date" /></Form.Item></div>
        <Form.Item name="accountNote" label="账号备注"><Input.TextArea rows={3} maxLength={500} showCount placeholder="账号、登录方式等仅供自己查看的信息" /></Form.Item>
      </>}
      <div className="modal-footer"><Button onClick={onClose}>取消</Button><Button type="primary" htmlType="submit">保存资产</Button></div>
    </Form>
  </Modal>;
}
