import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button, Card, Col, Empty, Input, Popconfirm, Row, Select, Space, Table, Tag, Typography, message } from 'antd';
import { AppstoreOutlined, DeleteOutlined, EditOutlined, PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import type { Account, Category, FinanceStats, Transaction, TransactionFilter } from '@lifeos/shared';
import { dataSource, generateDemoData } from '../data';
import { useSearchParams } from 'react-router-dom';
import { currentMonth, formatCents, formatShortDate } from '../lib/finance';
import { FinanceCatalogDrawer } from '../components/finance/FinanceCatalogDrawer';
import { TransactionFormModal } from '../components/finance/TransactionFormModal';
import '../styles/finance.css';

const { Text, Title } = Typography;

export function FinanceTransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [stats, setStats] = useState<FinanceStats | null>(null);
  const [filters, setFilters] = useState<TransactionFilter>({});
  const [loading, setLoading] = useState(true);
  const [editorOpen, setEditorOpen] = useState(false);
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [editing, setEditing] = useState<Transaction | undefined>();
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    if (searchParams.get('new') !== '1') return;
    setEditing(undefined);
    setEditorOpen(true);
    setSearchParams({}, { replace: true });
  }, [searchParams, setSearchParams]);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const [nextTransactions, nextCategories, nextAccounts, nextStats] = await Promise.all([
        dataSource.finance.listTransactions(filters),
        dataSource.finance.listCategories(),
        dataSource.finance.listAccounts(true),
        dataSource.stats.finance(currentMonth()),
      ]);
      setTransactions(nextTransactions);
      setCategories(nextCategories);
      setAccounts(nextAccounts);
      setStats(nextStats);
    } catch (error) {
      message.error(error instanceof Error ? error.message : '账本加载失败');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => { void reload(); }, [reload]);

  const categoryById = useMemo(() => new Map(categories.map((item) => [item.id, item])), [categories]);
  const accountById = useMemo(() => new Map(accounts.map((item) => [item.id, item])), [accounts]);
  const filteredTotal = transactions.reduce((total, item) => total + (item.type === 'expense' ? -item.amount : item.type === 'income' ? item.amount : 0), 0);

  const editTransaction = (transaction?: Transaction) => {
    setEditing(transaction);
    setEditorOpen(true);
  };
  const deleteTransaction = async (transaction: Transaction) => {
    try {
      await dataSource.finance.removeTransaction(transaction.id);
      message.success('账单已删除');
      await reload();
    } catch (error) {
      message.error(error instanceof Error ? error.message : '删除失败');
    }
  };
  const seedDemo = async () => {
    try {
      const created = await generateDemoData();
      if (created === 0) message.info('已有账单，为避免覆盖你的数据，未生成演示数据');
      else message.success(`已生成 ${created} 笔演示账单`);
      await reload();
    } catch (error) {
      message.error(error instanceof Error ? error.message : '生成演示数据失败');
    }
  };

  return (
    <>
      <section className="page-heading">
        <div><h1>账单流水</h1><p>每一笔都清楚，收支和账户余额自然汇总。</p></div>
        <Space wrap><Button icon={<AppstoreOutlined />} onClick={() => setCatalogOpen(true)}>分类与账户</Button><Button type="primary" icon={<PlusOutlined />} onClick={() => editTransaction()}>记一笔</Button></Space>
      </section>

      <Row gutter={[16, 16]} className="finance-summary">
        <Col xs={24} sm={8}><Card><span className="finance-summary-label">本月收入</span><Title level={3} style={{ margin: 0, color: '#23936d' }}>{formatCents(stats?.income ?? 0)}</Title></Card></Col>
        <Col xs={24} sm={8}><Card><span className="finance-summary-label">本月支出</span><Title level={3} style={{ margin: 0, color: '#db5161' }}>{formatCents(stats?.expense ?? 0)}</Title></Card></Col>
        <Col xs={24} sm={8}><Card><span className="finance-summary-label">本月结余</span><Title level={3} style={{ margin: 0 }}>{formatCents((stats?.income ?? 0) - (stats?.expense ?? 0))}</Title></Card></Col>
      </Row>

      <Card>
        <div className="finance-toolbar">
          <div className="finance-filters">
            <Select aria-label="筛选收支类型" allowClear placeholder="收支类型" value={filters.type} onChange={(type) => setFilters((current) => ({ ...current, type }))} options={[{ label: '支出', value: 'expense' }, { label: '收入', value: 'income' }, { label: '还款', value: 'repayment' }]} />
            <Select aria-label="筛选分类" allowClear showSearch optionFilterProp="label" placeholder="分类" value={filters.categoryId} onChange={(categoryId) => setFilters((current) => ({ ...current, categoryId }))} options={categories.map((item) => ({ value: item.id, label: `${item.icon} ${item.name}` }))} />
            <Select aria-label="筛选账户" allowClear showSearch optionFilterProp="label" placeholder="账户" value={filters.accountId} onChange={(accountId) => setFilters((current) => ({ ...current, accountId }))} options={accounts.map((item) => ({ value: item.id, label: `${item.icon} ${item.name}` }))} />
            <Input aria-label="开始日期" className="finance-date-filter" type="date" value={filters.from} onChange={(event) => setFilters((current) => ({ ...current, from: event.target.value || undefined }))} />
            <Input aria-label="结束日期" className="finance-date-filter" type="date" value={filters.to} onChange={(event) => setFilters((current) => ({ ...current, to: event.target.value || undefined }))} />
            <Input aria-label="筛选标签" placeholder="标签" value={filters.tags?.[0]} onChange={(event) => setFilters((current) => ({ ...current, tags: event.target.value ? [event.target.value] : undefined }))} style={{ width: 105 }} />
          </div>
          <Space><Button type="text" icon={<ReloadOutlined />} onClick={() => setFilters({})}>清除筛选</Button>{transactions.length === 0 && <Button onClick={() => void seedDemo()}>填充演示数据</Button>}</Space>
        </div>
        {transactions.length > 0 && <Text type="secondary">当前 {transactions.length} 笔，筛选后净额 <strong>{formatCents(filteredTotal)}</strong></Text>}
        <Table
          style={{ marginTop: 12 }}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 10, showSizeChanger: false, showTotal: (total) => `共 ${total} 笔` }}
          scroll={{ x: 760 }}
          locale={{ emptyText: <Empty description="还没有账单，记下第一笔吧" image={Empty.PRESENTED_IMAGE_SIMPLE} /> }}
          dataSource={transactions}
          columns={[
            { title: '日期', dataIndex: 'date', width: 116, render: (date: string) => formatShortDate(date) },
            { title: '分类', width: 142, render: (_, item: Transaction) => {
              if (item.type === 'repayment') {
                const toAccount = accountById.get(item.toAccountId ?? '');
                return <Space size={5}><span>🔁</span><span>还款 → {toAccount ? toAccount.name : '未知账户'}</span></Space>;
              }
              const category = categoryById.get(item.categoryId ?? '');
              return <Space size={5}><span>{category?.icon ?? '🏷️'}</span><span>{category?.name ?? '已删除分类'}</span></Space>;
            } },
            { title: '账户', width: 125, render: (_, item: Transaction) => { const account = accountById.get(item.accountId); return <span>{account ? `${account.icon} ${account.name}` : '已删除账户'}</span>; } },
            { title: '备注 / 标签', render: (_, item: Transaction) => <div>{item.note && <div className="transaction-note">{item.note}</div>}{item.tags.map((tag) => <Tag key={tag}>{tag}</Tag>)}</div> },
            { title: '金额', width: 128, align: 'right', render: (_, item: Transaction) => <span className={item.type === 'expense' ? 'transaction-expense' : item.type === 'income' ? 'transaction-income' : 'transaction-repayment'}>{item.type === 'expense' ? '-' : item.type === 'income' ? '+' : '⇄ '}{formatCents(item.amount)}</span> },
            { title: '操作', width: 110, render: (_, item: Transaction) => <Space size={0}><Button type="link" size="small" icon={<EditOutlined />} onClick={() => editTransaction(item)}>编辑</Button><Popconfirm title="删除这笔账单？" onConfirm={() => void deleteTransaction(item)} okText="删除" cancelText="取消"><Button type="link" danger size="small" icon={<DeleteOutlined />}>删除</Button></Popconfirm></Space> },
          ]}
        />
      </Card>

      <TransactionFormModal open={editorOpen} transaction={editing} categories={categories} accounts={accounts} onClose={() => { setEditorOpen(false); setEditing(undefined); }} onSaved={reload} />
      <FinanceCatalogDrawer open={catalogOpen} onClose={() => setCatalogOpen(false)} onChanged={reload} />
    </>
  );
}
