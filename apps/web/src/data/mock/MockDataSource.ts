import type {
  Account,
  AccountInput,
  Asset,
  AssetInput,
  BaseEntity,
  Budget,
  BudgetInput,
  Category,
  CategoryInput,
  DataSource,
  Habit,
  HabitCheckIn,
  HabitInput,
  ISODate,
  Moment,
  MomentFilter,
  MomentInput,
  Plan,
  PlanFilter,
  PlanInput,
  Settings,
  SettingsInput,
  Transaction,
  TransactionFilter,
  TransactionInput,
} from '@lifeos/shared';

const STORAGE_KEY = 'lifeos:mock-data:v1';
const USER_ID = 'mock-user';

interface MockStore {
  habits: Habit[];
  habitCheckIns: HabitCheckIn[];
  plans: Plan[];
  categories: Category[];
  accounts: Account[];
  transactions: Transaction[];
  budgets: Budget[];
  assets: Asset[];
  moments: Moment[];
  settings: Settings;
}

const timestamp = () => new Date().toISOString();
const dateToday = (): ISODate => new Date().toISOString().slice(0, 10);
const monthToday = () => dateToday().slice(0, 7);
const id = () => globalThis.crypto?.randomUUID?.() ?? `mock-${Date.now()}-${Math.random().toString(16).slice(2)}`;
const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

function base(): BaseEntity {
  const now = timestamp();
  return { id: id(), userId: USER_ID, createdAt: now, updatedAt: now };
}

function systemEntity<T extends object>(entityId: string, value: T): T & BaseEntity {
  const now = timestamp();
  return { ...value, id: entityId, userId: USER_ID, createdAt: now, updatedAt: now };
}

function defaultCategories(): Category[] {
  const expense = [
    ['dining', '餐饮', '🍜', '#f08c53'], ['transport', '交通', '🚇', '#5d9cec'],
    ['shopping', '购物', '🛍️', '#dd6b9a'], ['housing', '居住', '🏠', '#8a6fdf'],
    ['entertainment', '娱乐', '🎮', '#a86bdb'], ['medical', '医疗', '💊', '#e67373'],
    ['learning', '学习', '📚', '#5ab99a'], ['social', '人情', '🎁', '#d79463'],
    ['other-expense', '其他', '📌', '#87909f'],
  ] as const;
  const income = [
    ['salary', '工资', '💼', '#47a878'], ['investment', '理财', '📈', '#5b8ff9'],
    ['part-time', '兼职', '✨', '#c58c32'], ['other-income', '其他', '📌', '#87909f'],
  ] as const;
  return [
    ...expense.map(([suffix, name, icon, color]) => systemEntity(`category-${suffix}`, { name, icon, color, type: 'expense' as const, isSystem: true })),
    ...income.map(([suffix, name, icon, color]) => systemEntity(`category-${suffix}`, { name, icon, color, type: 'income' as const, isSystem: true })),
  ];
}

function defaultAccounts(): Account[] {
  return [
    systemEntity('account-cash', { name: '现金', icon: '💵', initialBalance: 0, archived: false }),
    systemEntity('account-alipay', { name: '支付宝', icon: '🔵', initialBalance: 0, archived: false }),
    systemEntity('account-wechat', { name: '微信', icon: '🟢', initialBalance: 0, archived: false }),
    systemEntity('account-bank', { name: '银行卡', icon: '💳', initialBalance: 0, archived: false }),
  ];
}

function initialStore(): MockStore {
  const now = timestamp();
  return {
    habits: [],
    habitCheckIns: [],
    plans: [],
    categories: defaultCategories(),
    accounts: defaultAccounts(),
    transactions: [],
    budgets: [],
    assets: [],
    moments: [],
    settings: {
      id: 'settings',
      userId: USER_ID,
      createdAt: now,
      updatedAt: now,
      currency: 'CNY',
      theme: 'system',
      weekStartsOn: 1,
    },
  };
}

/** Brings the empty A0 localStorage shape forward without overwriting user finance data. */
function migrateFinanceDefaults(store: MockStore): boolean {
  const untouchedFinance = store.categories.length === 0 && store.accounts.length === 0 && store.transactions.length === 0 && store.budgets.length === 0;
  if (!untouchedFinance) return false;
  store.categories = defaultCategories();
  store.accounts = defaultAccounts();
  return true;
}

function ensureFinanceCatalog(store: MockStore) {
  if (store.categories.length === 0) store.categories = defaultCategories();
  if (store.accounts.length === 0) store.accounts = defaultAccounts();
}

function shiftMonth(period: string, offset: number): string {
  const [year, month] = period.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1 + offset, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

function dateInMonth(period: string, day: number): ISODate {
  return `${period}-${String(day).padStart(2, '0')}`;
}

function demoTransactions(): Transaction[] {
  const demos: Transaction[] = [];
  const periods = Array.from({ length: 12 }, (_, index) => shiftMonth(monthToday(), index - 11));
  periods.forEach((period, index) => {
    const salary: Transaction = { ...base(), type: 'income', amount: 1800000 + (index % 3) * 50000, categoryId: 'category-salary', accountId: 'account-bank', date: dateInMonth(period, 8), note: '工资收入', tags: ['固定收入'] };
    const dining: Transaction = { ...base(), type: 'expense', amount: 12000 + (index % 4) * 1800, categoryId: 'category-dining', accountId: 'account-alipay', date: dateInMonth(period, 12), note: '日常餐饮', tags: ['日常'] };
    const transport: Transaction = { ...base(), type: 'expense', amount: 4200 + (index % 3) * 600, categoryId: 'category-transport', accountId: 'account-wechat', date: dateInMonth(period, 18), note: '通勤交通', tags: ['通勤'] };
    const entertainment: Transaction = { ...base(), type: 'expense', amount: 6500 + (index % 5) * 900, categoryId: 'category-entertainment', accountId: 'account-alipay', date: dateInMonth(period, 23), note: '放松一下', tags: ['生活'] };
    demos.push(salary, dining, transport, entertainment);
  });
  return demos;
}

/**
 * Browser-local implementation of the stable DataSource contract.
 * It deliberately persists the same entity shapes that the remote API will use.
 */
export class MockDataSource implements DataSource {
  private memory: MockStore | null = null;

  constructor(private readonly delayMs = 250) {}

  private async wait() {
    if (this.delayMs > 0) await new Promise<void>((resolve) => globalThis.setTimeout(resolve, this.delayMs));
  }

  private read(): MockStore {
    if (typeof window === 'undefined') return this.memory ?? (this.memory = initialStore());
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const store = JSON.parse(raw) as MockStore;
        if (migrateFinanceDefaults(store)) this.write(store);
        return store;
      }
    } catch {
      // A blocked or corrupted localStorage should never block the empty shell from opening.
    }
    const store = initialStore();
    this.write(store);
    return store;
  }

  private write(store: MockStore) {
    this.memory = store;
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
    } catch {
      // Keep the current in-memory session usable if storage quota/privacy settings disallow writes.
    }
  }

  private async query<T>(callback: (store: MockStore) => T): Promise<T> {
    await this.wait();
    return clone(callback(this.read()));
  }

  private async mutate<T>(callback: (store: MockStore) => T): Promise<T> {
    await this.wait();
    const store = this.read();
    const result = callback(store);
    this.write(store);
    return clone(result);
  }

  private touch<T extends BaseEntity>(entity: T, patch: object): T {
    return Object.assign(entity, patch, { updatedAt: timestamp() }) as T;
  }

  /** Adds a non-destructive, 12-month data set to an untouched finance workspace. */
  async generateDemoData(): Promise<number> {
    return this.mutate((store) => {
      if (store.transactions.length > 0) return 0;
      ensureFinanceCatalog(store);
      const transactions = demoTransactions();
      store.transactions.push(...transactions);
      return transactions.length;
    });
  }

  habits = {
    list: (includeArchived = false) => this.query((store) => store.habits.filter((item) => includeArchived || !item.archived)),
    create: (input: HabitInput) => this.mutate((store) => {
      const entity: Habit = { ...base(), ...input, archived: input.archived ?? false };
      store.habits.push(entity);
      return entity;
    }),
    update: (habitId: string, patch: Partial<HabitInput>) => this.mutate((store) => {
      const entity = store.habits.find((item) => item.id === habitId);
      if (!entity) throw new Error('未找到该习惯');
      return this.touch(entity, patch);
    }),
    remove: (habitId: string) => this.mutate((store) => {
      store.habits = store.habits.filter((item) => item.id !== habitId);
      store.habitCheckIns = store.habitCheckIns.filter((item) => item.habitId !== habitId);
    }),
    checkIn: (habitId: string, date: ISODate, note?: string) => this.mutate((store) => {
      if (!store.habits.some((item) => item.id === habitId)) throw new Error('未找到该习惯');
      const existing = store.habitCheckIns.find((item) => item.habitId === habitId && item.date === date);
      if (existing) return existing;
      const entity: HabitCheckIn = { ...base(), habitId, date, ...(note ? { note } : {}) };
      store.habitCheckIns.push(entity);
      return entity;
    }),
    uncheck: (habitId: string, date: ISODate) => this.mutate((store) => {
      store.habitCheckIns = store.habitCheckIns.filter((item) => !(item.habitId === habitId && item.date === date));
    }),
    listCheckIns: (habitId: string, from: ISODate, to: ISODate) => this.query((store) =>
      store.habitCheckIns.filter((item) => item.habitId === habitId && item.date >= from && item.date <= to),
    ),
  };

  plans = {
    list: (filter: PlanFilter = {}) => this.query((store) => store.plans
      .filter((item) => !filter.level || item.level === filter.level)
      .filter((item) => !filter.period || item.period === filter.period)
      .filter((item) => !filter.parentId || item.parentId === filter.parentId)
      .filter((item) => filter.includeCompleted || item.status !== 'completed')
      .sort((a, b) => a.order - b.order)),
    create: (input: PlanInput) => this.mutate((store) => {
      const nextOrder = input.order ?? store.plans.filter((item) => item.period === input.period).length;
      const entity: Plan = { ...base(), ...input, order: nextOrder };
      store.plans.push(entity);
      return entity;
    }),
    update: (planId: string, patch: Partial<PlanInput>) => this.mutate((store) => {
      const entity = store.plans.find((item) => item.id === planId);
      if (!entity) throw new Error('未找到该计划');
      return this.touch(entity, patch);
    }),
    remove: (planId: string) => this.mutate((store) => {
      store.plans = store.plans.filter((item) => item.id !== planId && item.parentId !== planId);
    }),
    reorder: (ids: string[]) => this.mutate((store) => {
      ids.forEach((planId, order) => {
        const entity = store.plans.find((item) => item.id === planId);
        if (entity) this.touch(entity, { order });
      });
    }),
  };

  finance = {
    listCategories: (type?: 'expense' | 'income') => this.query((store) => store.categories.filter((item) => !type || item.type === type)),
    createCategory: (input: CategoryInput) => this.mutate((store) => {
      const entity: Category = { ...base(), ...input, isSystem: input.isSystem ?? false };
      store.categories.push(entity);
      return entity;
    }),
    updateCategory: (categoryId: string, patch: Partial<CategoryInput>) => this.mutate((store) => {
      const entity = store.categories.find((item) => item.id === categoryId);
      if (!entity) throw new Error('未找到该分类');
      return this.touch(entity, patch);
    }),
    removeCategory: (categoryId: string) => this.mutate((store) => {
      const category = store.categories.find((item) => item.id === categoryId);
      if (category?.isSystem) throw new Error('内置分类不能删除');
      if (store.transactions.some((item) => item.categoryId === categoryId)) throw new Error('已有账单使用该分类，无法删除');
      store.categories = store.categories.filter((item) => item.id !== categoryId);
    }),
    listAccounts: (includeArchived = false) => this.query((store) => store.accounts.filter((item) => includeArchived || !item.archived)),
    createAccount: (input: AccountInput) => this.mutate((store) => {
      const entity: Account = { ...base(), ...input };
      store.accounts.push(entity);
      return entity;
    }),
    updateAccount: (accountId: string, patch: Partial<AccountInput>) => this.mutate((store) => {
      const entity = store.accounts.find((item) => item.id === accountId);
      if (!entity) throw new Error('未找到该账户');
      return this.touch(entity, patch);
    }),
    removeAccount: (accountId: string) => this.mutate((store) => {
      if (store.transactions.some((item) => item.accountId === accountId)) throw new Error('已有账单使用该账户，无法删除');
      store.accounts = store.accounts.filter((item) => item.id !== accountId);
    }),
    listTransactions: (filter: TransactionFilter = {}) => this.query((store) => store.transactions
      .filter((item) => !filter.type || item.type === filter.type)
      .filter((item) => !filter.categoryId || item.categoryId === filter.categoryId)
      .filter((item) => !filter.accountId || item.accountId === filter.accountId)
      .filter((item) => !filter.from || item.date >= filter.from)
      .filter((item) => !filter.to || item.date <= filter.to)
      .filter((item) => !filter.tags?.length || filter.tags.some((tag) => item.tags.includes(tag)))
      .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt))),
    createTransaction: (input: TransactionInput) => this.mutate((store) => {
      const entity: Transaction = { ...base(), ...input };
      store.transactions.push(entity);
      return entity;
    }),
    updateTransaction: (transactionId: string, patch: Partial<TransactionInput>) => this.mutate((store) => {
      const entity = store.transactions.find((item) => item.id === transactionId);
      if (!entity) throw new Error('未找到该账单');
      return this.touch(entity, patch);
    }),
    removeTransaction: (transactionId: string) => this.mutate((store) => {
      store.transactions = store.transactions.filter((item) => item.id !== transactionId);
    }),
    getBudget: (period: string) => this.query((store) => store.budgets.find((item) => item.period === period) ?? null),
    saveBudget: (input: BudgetInput) => this.mutate((store) => {
      const existing = store.budgets.find((item) => item.period === input.period);
      if (existing) return this.touch(existing, input);
      const entity: Budget = { ...base(), ...input };
      store.budgets.push(entity);
      return entity;
    }),
  };

  assets = {
    list: (kind?: Asset['kind']) => this.query((store) => store.assets.filter((item) => !kind || item.kind === kind)),
    create: (input: AssetInput) => this.mutate((store) => {
      const entity: Asset = { ...base(), ...input };
      store.assets.push(entity);
      return entity;
    }),
    update: (assetId: string, patch: Partial<AssetInput>) => this.mutate((store) => {
      const entity = store.assets.find((item) => item.id === assetId);
      if (!entity) throw new Error('未找到该资产');
      return this.touch(entity, patch);
    }),
    remove: (assetId: string) => this.mutate((store) => {
      store.assets = store.assets.filter((item) => item.id !== assetId);
    }),
  };

  moments = {
    list: (filter: MomentFilter = {}) => this.query((store) => store.moments
      .filter((item) => !filter.from || item.createdAt.slice(0, 10) >= filter.from)
      .filter((item) => !filter.to || item.createdAt.slice(0, 10) <= filter.to)
      .filter((item) => !filter.tags?.length || filter.tags.some((tag) => item.tags.includes(tag)))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, filter.limit ?? Number.POSITIVE_INFINITY)),
    create: (input: MomentInput) => this.mutate((store) => {
      const entity: Moment = { ...base(), ...input };
      store.moments.push(entity);
      return entity;
    }),
    update: (momentId: string, patch: Partial<MomentInput>) => this.mutate((store) => {
      const entity = store.moments.find((item) => item.id === momentId);
      if (!entity) throw new Error('未找到该记录');
      return this.touch(entity, patch);
    }),
    remove: (momentId: string) => this.mutate((store) => {
      store.moments = store.moments.filter((item) => item.id !== momentId);
    }),
  };

  settings = {
    get: () => this.query((store) => store.settings),
    update: (patch: Partial<SettingsInput>) => this.mutate((store) => this.touch(store.settings, patch)),
  };

  stats = {
    dashboard: (today: ISODate = dateToday()) => this.query((store) => {
      const todayPlans = store.plans.filter((item) => item.level === 'day' && item.period === today);
      const completedPlans = todayPlans.filter((item) => item.status === 'completed').length;
      const completedHabits = store.habits.filter((habit) => store.habitCheckIns.some((checkIn) => checkIn.habitId === habit.id && checkIn.date === today)).length;
      const month = today.slice(0, 7);
      const expenses = store.transactions.filter((item) => item.type === 'expense');
      const total = (items: Transaction[]) => items.reduce((sum, item) => sum + item.amount, 0);
      const currentBudget = store.budgets.find((item) => item.period === month);
      const daysUntil = (value: string) => Math.ceil((Date.parse(`${value}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86_400_000);
      const expiringAssets = store.assets
        .filter((item) => Boolean(item.expireDate ?? item.warrantyUntil))
        .map((asset) => ({ asset, daysUntil: daysUntil(asset.expireDate ?? asset.warrantyUntil as string) }))
        .filter((item) => item.daysUntil <= 30)
        .sort((a, b) => a.daysUntil - b.daysUntil);
      return {
        today,
        plan: { completed: completedPlans, total: todayPlans.length },
        habits: { completed: completedHabits, total: store.habits.filter((item) => !item.archived).length },
        finance: {
          todayExpense: total(expenses.filter((item) => item.date === today)),
          monthExpense: total(expenses.filter((item) => item.date.startsWith(month))),
          budget: currentBudget,
          budgetSpent: total(expenses.filter((item) => item.date.startsWith(month))),
        },
        expiringAssets,
        recentMoments: [...store.moments].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 3),
      };
    }),
    finance: (month = monthToday()) => this.query((store) => {
      const transactions = store.transactions.filter((item) => item.date.startsWith(month));
      const sum = (items: Transaction[]) => items.reduce((total, item) => total + item.amount, 0);
      const income = sum(transactions.filter((item) => item.type === 'income'));
      const expense = sum(transactions.filter((item) => item.type === 'expense'));
      return {
        month,
        income,
        expense,
        balanceByAccount: store.accounts.map((account) => ({
          account,
          balance: account.initialBalance + sum(store.transactions.filter((item) => item.accountId === account.id && item.type === 'income')) - sum(store.transactions.filter((item) => item.accountId === account.id && item.type === 'expense')),
        })),
        expenseByCategory: store.categories.filter((category) => category.type === 'expense').map((category) => ({
          category,
          amount: sum(transactions.filter((item) => item.categoryId === category.id && item.type === 'expense')),
        })).filter((item) => item.amount > 0),
        monthlyTrend: Array.from({ length: 12 }, (_, index) => shiftMonth(month, index - 11)).map((period) => ({
          period,
          income: sum(store.transactions.filter((item) => item.type === 'income' && item.date.startsWith(period))),
          expense: sum(store.transactions.filter((item) => item.type === 'expense' && item.date.startsWith(period))),
        })),
      };
    }),
  };
}

export const resetMockData = () => {
  if (typeof window !== 'undefined') window.localStorage.removeItem(STORAGE_KEY);
};
