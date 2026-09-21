import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button, Card, Col, Empty, Form, Input, InputNumber, Progress, Row, Skeleton, Statistic, Tag, Typography, message } from 'antd';
import { SaveOutlined, SettingOutlined } from '@ant-design/icons';
import type { Budget, BudgetInput, Category, FinanceStats, MealBudget, MealBudgetStats } from '@lifeos/shared';
import { budgetInputSchema } from '@lifeos/shared';
import { dataSource } from '../data';
import { currentMonth, formatCents, fromCents, toCents } from '../lib/finance';
import { useNavigate } from 'react-router-dom';
import '../styles/finance.css';

interface BudgetFormValues {
  total: number;
  byCategory: Record<string, number | undefined>;
}

const MEAL_ITEMS: Array<{ key: keyof MealBudget; label: string; icon: string }> = [
  { key: 'breakfast', label: '早餐', icon: '🥟' },
  { key: 'lunch', label: '午餐', icon: '🍚' },
  { key: 'dinner', label: '晚餐', icon: '🍽️' },
];

export function BudgetPage() {
  const [period, setPeriod] = useState(currentMonth());
  const [budget, setBudget] = useState<Budget | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [stats, setStats] = useState<FinanceStats | null>(null);
  const [mealBudget, setMealBudget] = useState<MealBudget | null>(null);
  const [meal, setMeal] = useState<MealBudgetStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm<BudgetFormValues>();
  const navigate = useNavigate();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [nextBudget, nextCategories, nextStats, dashboard, settings] = await Promise.all([
        dataSource.finance.getBudget(period), dataSource.finance.listCategories('expense'), dataSource.stats.finance(period),
        dataSource.stats.dashboard(), dataSource.settings.get(),
      ]);
      setBudget(nextBudget);
      setCategories(nextCategories);
      setStats(nextStats);
      setMealBudget(settings.mealBudget ?? { breakfast: 0, lunch: 0, dinner: 0 });
      setMeal(dashboard.finance.meal);
      form.resetFields();
      form.setFieldsValue({
        total: fromCents(nextBudget?.total ?? 0),
        byCategory: Object.fromEntries(Object.entries(nextBudget?.byCategory ?? {}).map(([id, amount]) => [id, fromCents(amount)])),
      });
    } catch (error) {
      message.error(error instanceof Error ? error.message : '预算加载失败');
    } finally { setLoading(false); }
  }, [form, period]);

  useEffect(() => { void load(); }, [load]);

  const spentByCategory = useMemo(() => new Map(stats?.expenseByCategory.map(({ category, amount }) => [category.id, amount]) ?? []), [stats]);
  const spent = stats?.expense ?? 0;
  const total = budget?.total ?? 0;
  const percent = total > 0 ? Math.round((spent / total) * 100) : 0;
  const remaining = total - spent;

  const save = async (values: BudgetFormValues) => {
    const byCategory = Object.fromEntries(Object.entries(values.byCategory ?? {}).filter(([, amount]) => amount !== undefined).map(([id, amount]) => [id, toCents(amount ?? 0)]));
    const input: BudgetInput = { period, total: toCents(values.total ?? 0), byCategory };
    const result = budgetInputSchema.safeParse(input);
    if (!result.success) return message.error(result.error.issues[0]?.message ?? '请检查预算金额');
    setSaving(true);
    try {
      await dataSource.finance.saveBudget(result.data);
      message.success(`${period} 预算已保存`);
      await load();
    } catch (error) {
      message.error(error instanceof Error ? error.message : '预算保存失败');
    } finally { setSaving(false); }
  };

  return <>
    <section className="page-heading">
      <div><h1>预算管理</h1><p>为这个月设定边界，把钱留给真正重要的事。</p></div>
      <Input type="month" value={period} onChange={(event) => setPeriod(event.target.value || currentMonth())} style={{ width: 148 }} aria-label="预算月份" />
    </section>

    <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
      <Col xs={24} md={10}><Card><span className="finance-summary-label">本月预算进度</span>{loading ? <Skeleton active paragraph={{ rows: 1 }} /> : <><Typography.Title level={2} style={{ margin: '0 0 2px' }}>{total > 0 ? `${Math.max(0, percent)}%` : '未设置'}</Typography.Title><Typography.Text type="secondary">已支出 {formatCents(spent)} {total > 0 && `／预算 ${formatCents(total)}`}</Typography.Text><Progress percent={Math.min(percent, 100)} showInfo={false} status={percent > 100 ? 'exception' : 'normal'} strokeColor={percent > 100 ? '#db5161' : '#2f9c67'} style={{ marginTop: 18 }} /></>}</Card></Col>
      <Col xs={12} md={7}><Card><Statistic title="本月支出" value={spent / 100} precision={2} prefix="¥" valueStyle={{ color: '#db5161' }} /></Card></Col>
      <Col xs={12} md={7}><Card><Statistic title={remaining >= 0 ? '剩余可用' : '已超支'} value={Math.abs(remaining) / 100} precision={2} prefix="¥" valueStyle={{ color: remaining < 0 ? '#db5161' : '#23936d' }} /></Card></Col>
    </Row>

    <Card
      title="今日餐费"
      extra={
        mealBudget && Object.values(mealBudget).some((amount) => amount > 0)
          ? <Button type="link" icon={<SettingOutlined />} onClick={() => navigate('/settings')}>调整额度</Button>
          : <Button type="link" icon={<SettingOutlined />} onClick={() => navigate('/settings')}>开启餐费预算</Button>
      }
      style={{ marginBottom: 16 }}
    >
      {loading || !meal || !mealBudget ? <Skeleton active paragraph={{ rows: 2 }} /> : Object.values(mealBudget).every((amount) => amount === 0) ? (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="还没配置每日三餐额度，去偏好设置开启后，记到「早餐/午餐/晚餐」分类的账单会自动对比额度">
          <Button type="primary" onClick={() => navigate('/settings')}>去设置餐费额度</Button>
        </Empty>
      ) : (
        <>
          <div className="meal-budget-rows">
            {MEAL_ITEMS.map(({ key, label, icon }) => {
              const dailyBudget = mealBudget[key];
              const spentToday = meal[key];
              const left = dailyBudget - spentToday;
              const percent = dailyBudget > 0 ? Math.min(100, Math.round(spentToday / dailyBudget * 100)) : 0;
              return <div className="meal-budget-row" key={key}>
                <span className="meal-budget-label">{icon} {label}</span>
                <Progress percent={percent} size="small" showInfo={false} strokeColor={left < 0 ? '#db5161' : '#2f9c67'} style={{ flex: 1, margin: 0 }} />
                <span className="meal-budget-amount" style={{ color: left < 0 ? '#db5161' : '#23936d' }}>
                  {dailyBudget === 0 ? '未设额度' : left >= 0 ? `还剩 ${formatCents(left)}` : `超支 ${formatCents(-left)}`}
                </span>
                <Typography.Text type="secondary" className="meal-budget-spent">{formatCents(spentToday)} / {formatCents(dailyBudget)}</Typography.Text>
              </div>;
            })}
          </div>
          <div className="meal-budget-summary">
            <Tag color={meal.monthSaved > 0 ? 'green' : 'default'}>本月已节约 {formatCents(meal.monthSaved)}</Tag>
            <Tag color={meal.monthOverspent > 0 ? 'red' : 'default'}>本月已超支 {formatCents(meal.monthOverspent)}</Tag>
          </div>
        </>
      )}
    </Card>

    <Card title="设置预算" extra={<Typography.Text type="secondary">金额单位：元</Typography.Text>}>
      {loading ? <Skeleton active paragraph={{ rows: 8 }} /> : categories.length === 0 ? <Empty description="请先在账单页创建支出分类" /> : <Form form={form} layout="vertical" onFinish={save} initialValues={{ total: 0, byCategory: {} }}>
        <Form.Item name="total" label="月度总预算" rules={[{ required: true, message: '请输入月度总预算' }]}><InputNumber min={0} precision={2} prefix="¥" placeholder="例如 5000" style={{ width: 'min(320px, 100%)' }} /></Form.Item>
        <Typography.Title level={5} style={{ marginTop: 24 }}>分类预算 <Typography.Text type="secondary" style={{ fontSize: 13, fontWeight: 400 }}>可选，不设置即仅统计总预算</Typography.Text></Typography.Title>
        {categories.map((category) => {
          const categorySpent = spentByCategory.get(category.id) ?? 0;
          const categoryBudget = budget?.byCategory[category.id] ?? 0;
          const categoryPercent = categoryBudget > 0 ? Math.round(categorySpent / categoryBudget * 100) : 0;
          return <div className="budget-category-row" key={category.id}>
            <Typography.Text><span style={{ fontSize: 18, marginRight: 7 }}>{category.icon}</span>{category.name}</Typography.Text>
            <Form.Item name={['byCategory', category.id]} noStyle><InputNumber min={0} precision={2} prefix="¥" placeholder="不限制" style={{ width: '100%' }} /></Form.Item>
            <div className="budget-category-spend">已用 {formatCents(categorySpent)} {categoryBudget > 0 && <span style={{ color: categoryPercent > 100 ? '#db5161' : undefined }}> · {categoryPercent}%</span>}</div>
          </div>;
        })}
        <div className="modal-footer" style={{ marginTop: 24 }}><Button type="primary" htmlType="submit" loading={saving} icon={<SaveOutlined />}>保存 {period} 预算</Button></div>
      </Form>}
    </Card>
  </>;
}
