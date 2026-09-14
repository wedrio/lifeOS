import { useEffect, useState } from 'react';
import { Button, Drawer, Form, Input, InputNumber, Modal, Popconfirm, Segmented, Select, Space, Switch, Table, Tag, message } from 'antd';
import { DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons';
import type { Account, AccountInput, Category, CategoryInput } from '@lifeos/shared';
import { accountInputSchema, categoryInputSchema } from '@lifeos/shared';
import { dataSource } from '../../data';
import { formatCents, fromCents, toCents } from '../../lib/finance';

type CatalogKind = 'category' | 'account';

interface FinanceCatalogDrawerProps {
  open: boolean;
  onClose: () => void;
  onChanged: () => Promise<void> | void;
}

interface CategoryFormValues {
  name: string;
  icon: string;
  color: string;
  type: 'expense' | 'income';
  parentId?: string;
}
interface AccountFormValues {
  name: string;
  icon: string;
  initialBalance: number;
  archived: boolean;
}

export function FinanceCatalogDrawer({ open, onClose, onChanged }: FinanceCatalogDrawerProps) {
  const [kind, setKind] = useState<CatalogKind>('category');
  const [categories, setCategories] = useState<Category[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [balances, setBalances] = useState<Record<string, number>>({});
  const [categoryEditing, setCategoryEditing] = useState<Category | null | undefined>(undefined);
  const [accountEditing, setAccountEditing] = useState<Account | null | undefined>(undefined);

  const load = async () => {
    const [nextCategories, nextAccounts, stats] = await Promise.all([
      dataSource.finance.listCategories(), dataSource.finance.listAccounts(true), dataSource.stats.finance(),
    ]);
    setCategories(nextCategories);
    setAccounts(nextAccounts);
    setBalances(Object.fromEntries(stats.balanceByAccount.map(({ account, balance }) => [account.id, balance])));
  };

  useEffect(() => { if (open) void load(); }, [open]);

  const changed = async () => { await load(); await onChanged(); };
  const removeCategory = async (category: Category) => {
    try { await dataSource.finance.removeCategory(category.id); message.success('分类已删除'); await changed(); }
    catch (error) { message.error(error instanceof Error ? error.message : '删除失败'); }
  };
  const removeAccount = async (account: Account) => {
    try { await dataSource.finance.removeAccount(account.id); message.success('账户已删除'); await changed(); }
    catch (error) { message.error(error instanceof Error ? error.message : '删除失败'); }
  };

  return <>
    <Drawer title="分类与账户管理" width={680} open={open} onClose={onClose} destroyOnClose extra={<Segmented<CatalogKind> value={kind} onChange={setKind} options={[{ label: '分类', value: 'category' }, { label: '账户', value: 'account' }]} />}>
      {kind === 'category' ? <>
        <div className="drawer-action"><Button type="primary" icon={<PlusOutlined />} onClick={() => setCategoryEditing(null)}>新建分类</Button></div>
        <Table rowKey="id" size="small" pagination={false} dataSource={categories} scroll={{ x: 580 }} columns={[
          { title: '分类', render: (_, item: Category) => <Space><span style={{ fontSize: 19 }}>{item.icon}</span><span>{item.name}</span>{item.isSystem && <Tag>内置</Tag>}</Space> },
          { title: '类型', dataIndex: 'type', width: 85, render: (type: string) => <Tag color={type === 'expense' ? 'volcano' : 'green'}>{type === 'expense' ? '支出' : '收入'}</Tag> },
          { title: '操作', width: 126, render: (_, item: Category) => <Space size={0}><Button type="link" size="small" icon={<EditOutlined />} onClick={() => setCategoryEditing(item)}>编辑</Button><Popconfirm title="删除这个分类？" description="已有账单引用时不可删除。" onConfirm={() => removeCategory(item)} okText="删除" cancelText="取消"><Button type="link" danger size="small" icon={<DeleteOutlined />} disabled={item.isSystem}>删除</Button></Popconfirm></Space> },
        ]} />
      </> : <>
        <div className="drawer-action"><Button type="primary" icon={<PlusOutlined />} onClick={() => setAccountEditing(null)}>新建账户</Button></div>
        <Table rowKey="id" size="small" pagination={false} dataSource={accounts} scroll={{ x: 580 }} columns={[
          { title: '账户', render: (_, item: Account) => <Space><span style={{ fontSize: 19 }}>{item.icon}</span><span>{item.name}</span>{item.archived && <Tag>已归档</Tag>}</Space> },
          { title: '当前余额', width: 130, render: (_, item: Account) => formatCents(balances[item.id] ?? item.initialBalance) },
          { title: '操作', width: 126, render: (_, item: Account) => <Space size={0}><Button type="link" size="small" icon={<EditOutlined />} onClick={() => setAccountEditing(item)}>编辑</Button><Popconfirm title="删除这个账户？" description="已有账单引用时不可删除。" onConfirm={() => removeAccount(item)} okText="删除" cancelText="取消"><Button type="link" danger size="small" icon={<DeleteOutlined />}>删除</Button></Popconfirm></Space> },
        ]} />
      </>}
    </Drawer>
    {categoryEditing !== undefined && <CategoryModal category={categoryEditing ?? undefined} categories={categories} onClose={() => setCategoryEditing(undefined)} onSaved={async () => { setCategoryEditing(undefined); await changed(); }} />}
    {accountEditing !== undefined && <AccountModal account={accountEditing ?? undefined} onClose={() => setAccountEditing(undefined)} onSaved={async () => { setAccountEditing(undefined); await changed(); }} />}
  </>;
}

function CategoryModal({ category, categories, onClose, onSaved }: { category?: Category; categories: Category[]; onClose: () => void; onSaved: () => Promise<void> }) {
  const [form] = Form.useForm<CategoryFormValues>();
  const type = Form.useWatch('type', form) ?? category?.type ?? 'expense';
  useEffect(() => { form.setFieldsValue({ name: category?.name, icon: category?.icon ?? '🏷️', color: category?.color ?? '#2f9c67', type: category?.type ?? 'expense', parentId: category?.parentId }); }, [category, form]);
  const submit = async (values: CategoryFormValues) => {
    const input = { ...values, parentId: values.parentId || undefined } satisfies CategoryInput;
    const result = categoryInputSchema.safeParse(input);
    if (!result.success) return message.error(result.error.issues[0]?.message ?? '请检查分类信息');
    try { if (category) await dataSource.finance.updateCategory(category.id, result.data); else await dataSource.finance.createCategory(result.data); message.success(category ? '分类已更新' : '分类已创建'); await onSaved(); } catch (error) { message.error(error instanceof Error ? error.message : '保存失败'); }
  };
  return <Modal open title={category ? '编辑分类' : '新建分类'} onCancel={onClose} footer={null} destroyOnClose><Form form={form} layout="vertical" onFinish={submit} initialValues={{ icon: '🏷️', color: '#2f9c67', type: 'expense' }}><Form.Item name="type" label="类型" rules={[{ required: true }]}><Segmented block options={[{ label: '支出', value: 'expense' }, { label: '收入', value: 'income' }]} onChange={() => form.setFieldValue('parentId', undefined)} /></Form.Item><Form.Item name="name" label="名称" rules={[{ required: true, message: '请输入分类名称' }]}><Input maxLength={40} placeholder="例如：咖啡" /></Form.Item><Space.Compact block><Form.Item name="icon" label="图标" style={{ width: '34%' }} rules={[{ required: true }]}><Input maxLength={8} /></Form.Item><Form.Item name="color" label="颜色" style={{ width: '66%' }} rules={[{ required: true }]}><Input type="color" style={{ height: 32 }} /></Form.Item></Space.Compact><Form.Item name="parentId" label="父分类（可选）"><Select allowClear placeholder="不设置父分类" options={categories.filter((item) => item.type === type && item.id !== category?.id).map((item) => ({ value: item.id, label: `${item.icon} ${item.name}` }))} /></Form.Item><div className="modal-footer"><Button onClick={onClose}>取消</Button><Button type="primary" htmlType="submit">保存</Button></div></Form></Modal>;
}

function AccountModal({ account, onClose, onSaved }: { account?: Account; onClose: () => void; onSaved: () => Promise<void> }) {
  const [form] = Form.useForm<AccountFormValues>();
  useEffect(() => { form.setFieldsValue({ name: account?.name, icon: account?.icon ?? '💳', initialBalance: account ? fromCents(account.initialBalance) : 0, archived: account?.archived ?? false }); }, [account, form]);
  const submit = async (values: AccountFormValues) => {
    const input = { ...values, initialBalance: toCents(values.initialBalance) } satisfies AccountInput;
    const result = accountInputSchema.safeParse(input);
    if (!result.success) return message.error(result.error.issues[0]?.message ?? '请检查账户信息');
    try { if (account) await dataSource.finance.updateAccount(account.id, result.data); else await dataSource.finance.createAccount(result.data); message.success(account ? '账户已更新' : '账户已创建'); await onSaved(); } catch (error) { message.error(error instanceof Error ? error.message : '保存失败'); }
  };
  return <Modal open title={account ? '编辑账户' : '新建账户'} onCancel={onClose} footer={null} destroyOnClose><Form form={form} layout="vertical" onFinish={submit} initialValues={{ icon: '💳', initialBalance: 0, archived: false }}><Form.Item name="name" label="名称" rules={[{ required: true, message: '请输入账户名称' }]}><Input maxLength={60} placeholder="例如：招商银行卡" /></Form.Item><Form.Item name="icon" label="图标" rules={[{ required: true }]}><Input maxLength={8} /></Form.Item><Form.Item name="initialBalance" label="初始余额"><InputNumber min={0} precision={2} prefix="¥" style={{ width: '100%' }} /></Form.Item><Form.Item name="archived" label="归档账户" valuePropName="checked"><Switch checkedChildren="已归档" unCheckedChildren="使用中" /></Form.Item><div className="modal-footer"><Button onClick={onClose}>取消</Button><Button type="primary" htmlType="submit">保存</Button></div></Form></Modal>;
}
