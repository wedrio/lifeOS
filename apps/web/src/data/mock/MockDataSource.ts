import type {
  Account,
  AccountInput,
  Asset,
  AssetInput,
  BackupImportMode,
  BackupPayload,
  BaseEntity,
  Book,
  BookFilter,
  BookInput,
  BookNote,
  BookNoteInput,
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
  ReadingLog,
  ReadingLogInput,
  Settings,
  SettingsInput,
  Transaction,
  TransactionFilter,
  TransactionInput,
} from '@lifeos/shared';
import { isHabitDue, today as localToday } from '../../lib/dates';

const STORAGE_KEY = 'lifeos:mock-data:v1';
const USER_ID = 'mock-user';

interface MockStore {
  habits: Habit[];
  habitCheckIns: HabitCheckIn[];
  plans: Plan[];
  books: Book[];
  readingLogs: ReadingLog[];
  bookNotes: BookNote[];
  categories: Category[];
  accounts: Account[];
  transactions: Transaction[];
  budgets: Budget[];
  assets: Asset[];
  moments: Moment[];
  settings: Settings;
}

const timestamp = () => new Date().toISOString();
const dateToday = (): ISODate => localToday();
const monthToday = () => dateToday().slice(0, 7);
const yearToday = () => Number(dateToday().slice(0, 4));
const id = () => globalThis.crypto?.randomUUID?.() ?? `mock-${Date.now()}-${Math.random().toString(16).slice(2)}`;
const clone = <T,>(value: T): T => value === undefined ? value : JSON.parse(JSON.stringify(value)) as T;

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
    books: [],
    readingLogs: [],
    bookNotes: [],
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
      autoRollOverIncompletePlans: true,
      annualReadingTarget: 12,
      makeupCardBalance: 2,
      makeupCardMonth: now.slice(0, 7),
    },
  };
}

const MAKEUP_CARDS_PER_MONTH = 2;

/** 补签卡按月发放（每月 2 张，不累积）；旧数据缺字段时在此兜底 */
function ensureMakeupCards(store: MockStore): number {
  const month = monthToday();
  if (store.settings.makeupCardMonth !== month || typeof store.settings.makeupCardBalance !== 'number') {
    store.settings.makeupCardMonth = month;
    store.settings.makeupCardBalance = MAKEUP_CARDS_PER_MONTH;
  }
  return store.settings.makeupCardBalance;
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

function migrateStore(store: MockStore): boolean {
  let changed = migrateFinanceDefaults(store);
  if (typeof store.settings.autoRollOverIncompletePlans !== 'boolean') {
    store.settings.autoRollOverIncompletePlans = true;
    changed = true;
  }
  if (!store.settings.annualReadingTarget) {
    store.settings.annualReadingTarget = 12;
    changed = true;
  }
  if (!Array.isArray(store.books)) {
    store.books = [];
    changed = true;
  }
  if (!Array.isArray(store.readingLogs)) {
    store.readingLogs = [];
    changed = true;
  }
  if (!Array.isArray(store.bookNotes)) {
    store.bookNotes = [];
    changed = true;
  }
  return changed;
}

function shiftMonth(period: string, offset: number): string {
  const [year, month] = period.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1 + offset, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

function dateInMonth(period: string, day: number): ISODate {
  return `${period}-${String(day).padStart(2, '0')}`;
}

function shiftDate(date: ISODate, offset: number): ISODate {
  return new Date(Date.parse(`${date}T12:00:00Z`) + offset * 86_400_000).toISOString().slice(0, 10);
}

function currentWeekPeriod(date: ISODate): string {
  const value = new Date(`${date}T12:00:00Z`);
  const weekday = value.getUTCDay() || 7;
  value.setUTCDate(value.getUTCDate() + 4 - weekday);
  const yearStart = new Date(Date.UTC(value.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((value.getTime() - yearStart.getTime()) / 86_400_000) + 1) / 7);
  return `${value.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
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

function demoDisciplineStore(store: MockStore): number {
  if (store.habits.length > 0 || store.plans.length > 0) return 0;
  const habits: Habit[] = [
    { ...base(), id: 'demo-habit-read', name: '阅读 30 分钟', icon: '📚', color: '#5b5ce2', frequency: 'daily', timesPerPeriod: 1, reminderTime: '21:00', allowBackfillDays: 2, archived: false },
    { ...base(), id: 'demo-habit-exercise', name: '运动', icon: '🏃', color: '#e76f8a', frequency: 'weekly', timesPerPeriod: 3, reminderTime: '18:30', allowBackfillDays: 1, archived: false },
    { ...base(), id: 'demo-habit-water', name: '喝够水（每日 3 次）', icon: '💧', color: '#53a8ff', frequency: 'daily', timesPerPeriod: 3, allowBackfillDays: 0, archived: false },
    { ...base(), id: 'demo-habit-stretch', name: '颈部拉伸', icon: '🧘', color: '#2f9c67', frequency: 'custom', timesPerPeriod: 1, weekdays: [1, 3, 5], allowBackfillDays: 0, archived: false },
  ];
  const reference = dateToday();
  const checkIns: HabitCheckIn[] = [];
  for (let offset = 0; offset < 180; offset += 1) {
    const date = shiftDate(reference, -offset);
    if (offset % 9 !== 0) checkIns.push({ ...base(), habitId: 'demo-habit-read', date });
    if (offset % 2 === 0 || offset % 5 === 0) checkIns.push({ ...base(), habitId: 'demo-habit-exercise', date });
    if (offset % 6 !== 0) checkIns.push({ ...base(), habitId: 'demo-habit-water', date, count: (offset % 3) + 1 });
    if ([1, 3, 5].includes(new Date(`${date}T12:00:00Z`).getUTCDay() || 7) && offset % 7 !== 3) checkIns.push({ ...base(), habitId: 'demo-habit-stretch', date });
  }
  const year = reference.slice(0, 4);
  const month = reference.slice(0, 7);
  const plans: Plan[] = [
    { ...base(), id: 'demo-plan-year', title: '成为更有能量的自己', description: '建立稳定的学习、运动与休息节奏。', level: 'year', period: year, status: 'in_progress', progress: 55, priority: 'high', order: 0 },
    { ...base(), id: 'demo-plan-month', title: '九月习惯养成', description: '完成阅读与运动目标。', level: 'month', period: month, parentId: 'demo-plan-year', status: 'in_progress', progress: 62, priority: 'high', order: 0 },
    { ...base(), id: 'demo-plan-week', title: '本周复盘与训练', level: 'week', period: currentWeekPeriod(reference), parentId: 'demo-plan-month', status: 'in_progress', progress: 50, priority: 'medium', order: 0 },
    { ...base(), id: 'demo-plan-day-1', title: '完成 30 分钟阅读', level: 'day', period: reference, parentId: 'demo-plan-week', status: 'not_started', progress: 0, priority: 'high', order: 0 },
    { ...base(), id: 'demo-plan-day-2', title: '下班后慢跑 3 公里', level: 'day', period: reference, parentId: 'demo-plan-week', status: 'in_progress', progress: 40, priority: 'medium', order: 1 },
  ];
  store.habits.push(...habits);
  store.habitCheckIns.push(...checkIns);
  store.plans.push(...plans);
  return habits.length + checkIns.length + plans.length;
}

function demoReadingStore(store: MockStore): number {
  if (store.books.length > 0) return 0;
  const reference = dateToday();
  const books: Book[] = [
    {
      ...base(),
      id: 'demo-book-naval',
      title: '纳瓦尔宝典',
      author: '埃里克·乔根森',
      totalPages: 240,
      currentPage: 156,
      status: 'reading',
      category: '财富与认知',
      coverTheme: 'emerald',
      startDate: shiftDate(reference, -14),
    },
    {
      ...base(),
      id: 'demo-book-inside',
      title: '置身事内：中国政府与经济发展',
      author: '兰小欢',
      totalPages: 344,
      currentPage: 344,
      status: 'finished',
      category: '经济与社会',
      coverTheme: 'chestnut',
      rating: 5,
      review: '从地方政府激励机制理解中国经济发展，结构清晰，视角极其务实接地气。',
      takeaways: [
        '理解中国经济，必须理解地方政府在土地财政与招商引资中的双重角色。',
        '分税制改革重塑了中央与地方的财政激励格局。',
        '经济发展的关键在于理顺激励机制并顺应产业演化规律。',
      ],
      startDate: shiftDate(reference, -45),
      finishDate: shiftDate(reference, -12),
    },
    {
      ...base(),
      id: 'demo-book-principles',
      title: '原则',
      author: '瑞·达利欧',
      totalPages: 560,
      currentPage: 218,
      status: 'reading',
      category: '思维模型',
      coverTheme: 'obsidian',
      startDate: shiftDate(reference, -28),
    },
    {
      ...base(),
      id: 'demo-book-courage',
      title: '被讨厌的勇气',
      author: '岸见一郎 / 古贺史健',
      totalPages: 260,
      currentPage: 260,
      status: 'finished',
      category: '心理学',
      coverTheme: 'sage',
      rating: 5,
      review: '课题分离是获得自由与幸福的第一步，一切烦恼皆源于人际关系。',
      takeaways: ['人际关系是烦恼的根源，也是幸福的源泉。', '把别人的课题与自己的课题彻底分开。'],
      startDate: shiftDate(reference, -90),
      finishDate: shiftDate(reference, -65),
    },
    {
      ...base(),
      id: 'demo-book-flow',
      title: '心流：最优体验心理学',
      author: '米哈里·契克森米哈赖',
      totalPages: 388,
      currentPage: 0,
      status: 'queue',
      category: '心理学',
      coverTheme: 'ocean',
    },
  ];

  const logs: ReadingLog[] = [
    { ...base(), bookId: 'demo-book-naval', page: 45, pagesRead: 45, note: '建立清晰的杠杆意识', date: shiftDate(reference, -12) },
    { ...base(), bookId: 'demo-book-naval', page: 92, pagesRead: 47, note: '专长、责任感与杠杆效应', date: shiftDate(reference, -8) },
    { ...base(), bookId: 'demo-book-naval', page: 135, pagesRead: 43, note: '判断力是最高价值的技能', date: shiftDate(reference, -3) },
    { ...base(), bookId: 'demo-book-naval', page: 156, pagesRead: 21, note: '幸福是一种选择与习惯', date: reference },
    { ...base(), bookId: 'demo-book-principles', page: 120, pagesRead: 60, note: '极度求真与极度透明', date: shiftDate(reference, -18) },
    { ...base(), bookId: 'demo-book-principles', page: 218, pagesRead: 98, note: '五步流程实现愿望', date: shiftDate(reference, -5) },
  ];

  const notes: BookNote[] = [
    {
      ...base(),
      bookId: 'demo-book-naval',
      pageNumber: 38,
      quote: '依靠出租自己的时间是无法致富的。你必须拥有产权（企业的股份），才能实现财务自由。',
      thoughts: '纸上得来终觉浅，核心是要把时间和精力沉淀在可积累资产上。',
      tags: ['财富', '思维'],
    },
    {
      ...base(),
      bookId: 'demo-book-naval',
      pageNumber: 74,
      quote: '用头脑赚钱，而不是用时间赚钱。',
      thoughts: '判断力与决策质量远比单纯的时间消耗重要。',
      tags: ['杠杆', '认知'],
    },
    {
      ...base(),
      bookId: 'demo-book-principles',
      pageNumber: 158,
      quote: '痛苦 + 反思 = 进步。',
      thoughts: '面对错误时不要防御，每一次刺痛都是升级认知模型最好的契机。',
      tags: ['复盘', '心智'],
    },
    {
      ...base(),
      bookId: 'demo-book-inside',
      pageNumber: 112,
      quote: '地方政府在发展经济中所扮演的角色，不仅是制度制定者，更像是一家超级投资公司。',
      thoughts: '非常震撼的剖析，看清城市基础设施与财政运行的内在逻辑。',
      tags: ['经济', '宏观'],
    },
  ];

  store.books.push(...books);
  store.readingLogs.push(...logs);
  store.bookNotes.push(...notes);
  return books.length + logs.length + notes.length;
}

function demoAssetsStore(store: MockStore): number {
  if (store.assets.length > 0) return 0;
  const reference = dateToday();
  const assets: Asset[] = [
    { ...base(), id: 'demo-asset-phone', kind: 'physical', name: 'iPhone 15 Pro', icon: '📱', category: '手机', brand: 'Apple', model: 'iPhone 15 Pro 256GB', serialNo: 'DEMO-IP15-2026', purchaseDate: shiftDate(reference, -260), purchasePrice: 899900, warrantyUntil: shiftDate(reference, 8), estimatedValue: 650000, status: 'in_use' },
    { ...base(), id: 'demo-asset-laptop', kind: 'physical', name: 'MacBook Air', icon: '💻', category: '电脑', brand: 'Apple', model: 'M3 16GB', purchaseDate: shiftDate(reference, -410), purchasePrice: 1099900, warrantyUntil: shiftDate(reference, 120), estimatedValue: 780000, status: 'in_use' },
    { ...base(), id: 'demo-asset-camera', kind: 'physical', name: 'Sony ZV-E10', icon: '📷', category: '数码', brand: 'Sony', model: 'ZV-E10', purchaseDate: shiftDate(reference, -770), purchasePrice: 449900, warrantyUntil: shiftDate(reference, -40), estimatedValue: 285000, status: 'idle' },
    { ...base(), id: 'demo-asset-music', kind: 'subscription', name: 'Apple Music', icon: '🎵', category: '音乐', price: 1100, billingCycle: 'monthly', startDate: shiftDate(reference, -320), expireDate: shiftDate(reference, 3), autoRenew: true, accountNote: '家庭共享主账号' },
    { ...base(), id: 'demo-asset-cloud', kind: 'subscription', name: 'iCloud+', icon: '☁️', category: '云盘', price: 2100, billingCycle: 'monthly', startDate: shiftDate(reference, -210), expireDate: shiftDate(reference, 18), autoRenew: true, accountNote: '200GB 存储空间' },
    { ...base(), id: 'demo-asset-tool', kind: 'subscription', name: 'Raycast Pro', icon: '⚡', category: '工具', price: 9600, billingCycle: 'yearly', startDate: shiftDate(reference, -340), expireDate: shiftDate(reference, -2), autoRenew: false, accountNote: '到期后评估是否续订' },
  ];
  store.assets.push(...assets);
  return assets.length;
}

function demoImage(left: string, right: string, label: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800" viewBox="0 0 1200 800"><defs><linearGradient id="g" x1="0" x2="1" y1="0" y2="1"><stop stop-color="${left}"/><stop offset="1" stop-color="${right}"/></linearGradient></defs><rect width="1200" height="800" fill="url(#g)"/><circle cx="1000" cy="140" r="120" fill="white" fill-opacity=".16"/><text x="80" y="675" fill="white" font-family="sans-serif" font-size="72" font-weight="600">${label}</text></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

function demoMomentsStore(store: MockStore): number {
  if (store.moments.length > 0) return 0;
  const reference = dateToday();
  const moments: Moment[] = [
    { ...base(), id: 'demo-moment-today', createdAt: `${reference}T20:15:00.000Z`, updatedAt: `${reference}T20:15:00.000Z`, content: '傍晚散步的时候，天空是很温柔的蓝。把今天完成的小事记下来，明天继续。', imageUrls: [demoImage('#5b5ce2', '#79c8e8', 'Evening walk')], mood: '😊', weather: '☀️', location: '家附近', tags: ['散步', '日常'], links: store.assets.slice(0, 1).map((asset) => ({ type: 'asset' as const, id: asset.id })) },
    { ...base(), id: 'demo-moment-yesterday', createdAt: `${shiftDate(reference, -1)}T12:20:00.000Z`, updatedAt: `${shiftDate(reference, -1)}T12:20:00.000Z`, content: '午休翻阅《纳瓦尔宝典》，读到那句“用头脑赚钱，而不是用时间赚钱”，深有感触。', imageUrls: [], mood: '😌', weather: '☁️', location: '办公室', tags: ['阅读', '纸质书'], links: store.books.slice(0, 1).map((book) => ({ type: 'book' as const, id: book.id })) },
    { ...base(), id: 'demo-moment-weekend', createdAt: `${shiftDate(reference, -4)}T10:00:00.000Z`, updatedAt: `${shiftDate(reference, -4)}T10:00:00.000Z`, content: '周末的早晨，给自己做了一顿慢早餐。', imageUrls: [demoImage('#f4a261', '#e9c46a', 'Slow morning'), demoImage('#54c5a1', '#53a8ff', 'Weekend')], mood: '🥳', weather: '🌤️', location: '家', tags: ['周末', '美食'], links: store.transactions.slice(0, 1).map((transaction) => ({ type: 'transaction' as const, id: transaction.id })) },
  ];
  store.moments.push(...moments);
  return moments.length;
}

const backupArrayKeys = ['habits', 'habitCheckIns', 'plans', 'books', 'readingLogs', 'bookNotes', 'categories', 'accounts', 'transactions', 'budgets', 'assets', 'moments'] as const;

function isBackupPayload(value: unknown): value is BackupPayload {
  if (!value || typeof value !== 'object') return false;
  const payload = value as Partial<BackupPayload>;
  if (payload.version !== 1 || !payload.data || typeof payload.data !== 'object') return false;
  const data = payload.data as Record<string, unknown>;
  const hasBaseEntity = (item: unknown) => Boolean(item && typeof item === 'object' && typeof (item as BaseEntity).id === 'string' && typeof (item as BaseEntity).userId === 'string' && typeof (item as BaseEntity).createdAt === 'string' && typeof (item as BaseEntity).updatedAt === 'string');
  return backupArrayKeys.every((key) => !data[key] || (Array.isArray(data[key]) && (data[key] as unknown[]).every(hasBaseEntity))) && hasBaseEntity(data.settings);
}

function mergeById<T extends BaseEntity>(current: T[], incoming: T[]): T[] {
  const map = new Map(current.map((item) => [item.id, item]));
  incoming.forEach((item) => map.set(item.id, item));
  return [...map.values()];
}

/**
 * Browser-local implementation of the stable DataSource contract.
 * It deliberately persists the same entity shapes that the remote API will use.
 */
export class MockDataSource implements DataSource {
  private memory: MockStore | null = null;
  private memoryOnly = false;

  constructor(private readonly delayMs = 250) {}

  private async wait() {
    if (this.delayMs > 0) await new Promise<void>((resolve) => globalThis.setTimeout(resolve, this.delayMs));
  }

  private read(): MockStore {
    if (typeof window === 'undefined' || this.memoryOnly) return this.memory ?? (this.memory = initialStore());
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const store = JSON.parse(raw) as MockStore;
        if (migrateStore(store)) this.write(store);
        return store;
      }
    } catch {
      this.memoryOnly = true;
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
      this.memoryOnly = true;
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

  async generateDemoData(): Promise<number> {
    return this.mutate((store) => {
      if (store.transactions.length > 0) return 0;
      ensureFinanceCatalog(store);
      const transactions = demoTransactions();
      store.transactions.push(...transactions);
      return transactions.length;
    });
  }

  async generateDisciplineDemoData(): Promise<number> {
    return this.mutate((store) => demoDisciplineStore(store));
  }

  async generateReadingDemoData(): Promise<number> {
    return this.mutate((store) => demoReadingStore(store));
  }

  async generateAssetsDemoData(): Promise<number> {
    return this.mutate((store) => demoAssetsStore(store));
  }

  async generateMomentsDemoData(): Promise<number> {
    return this.mutate((store) => demoMomentsStore(store));
  }

  async generateAllDemoData(): Promise<number> {
    return this.mutate((store) => {
      let created = 0;
      if (store.transactions.length === 0) {
        ensureFinanceCatalog(store);
        const transactions = demoTransactions();
        store.transactions.push(...transactions);
        created += transactions.length;
      }
      created += demoDisciplineStore(store);
      created += demoReadingStore(store);
      created += demoAssetsStore(store);
      created += demoMomentsStore(store);
      return created;
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
    checkIn: (habitId: string, date: ISODate, note?: string, options?: { useMakeupCard?: boolean }) => this.mutate((store) => {
      const habit = store.habits.find((item) => item.id === habitId);
      if (!habit) throw new Error('未找到该习惯');
      if (habit.archived) throw new Error('已归档习惯不能打卡');
      const today = dateToday();
      const targetTime = Date.parse(`${date}T12:00:00Z`);
      const todayTime = Date.parse(`${today}T12:00:00Z`);
      if (!Number.isFinite(targetTime)) throw new Error('日期格式应为 YYYY-MM-DD');
      if (targetTime > todayTime) throw new Error('不能为未来日期打卡');
      const daysAgo = Math.round((todayTime - targetTime) / 86_400_000);
      if (daysAgo > habit.allowBackfillDays) {
        // 超出补打窗口：消耗 1 张补签卡（每月发放、不累积、取消不返还）
        const balance = ensureMakeupCards(store);
        if (!options?.useMakeupCard) {
          throw new Error('超出允许补打天数，可使用 1 张补签卡补打');
        }
        if (balance <= 0) throw new Error('本月补签卡已用完，下月再来');
        store.settings.makeupCardBalance = balance - 1;
      }
      const dailyTarget = habit.frequency === 'daily' ? habit.timesPerPeriod : 1;
      const existing = store.habitCheckIns.find((item) => item.habitId === habitId && item.date === date);
      if (existing) {
        if (existing.state === 'skip') {
          // 休息日直接打卡 = 转为完成
          delete existing.state;
          return this.touch(existing, { count: 1 });
        }
        const count = existing.count ?? 1;
        if (count >= dailyTarget) throw new Error('今日目标次数已完成，再点将逐次取消打卡');
        return this.touch(existing, { count: count + 1 });
      }
      const entity: HabitCheckIn = { ...base(), habitId, date, count: 1, ...(note ? { note } : {}) };
      store.habitCheckIns.push(entity);
      return entity;
    }),
    uncheck: (habitId: string, date: ISODate) => this.mutate((store) => {
      const habit = store.habits.find((item) => item.id === habitId);
      if (habit?.archived) throw new Error('已归档习惯不能修改打卡');
      const existing = store.habitCheckIns.find((item) => item.habitId === habitId && item.date === date);
      if (!existing) return;
      if (existing.state === 'skip') {
        store.habitCheckIns = store.habitCheckIns.filter((item) => !(item.habitId === habitId && item.date === date));
        return;
      }
      const count = existing.count ?? 1;
      if (count > 1) this.touch(existing, { count: count - 1 });
      else store.habitCheckIns = store.habitCheckIns.filter((item) => !(item.habitId === habitId && item.date === date));
    }),
    skipDay: (habitId: string, date: ISODate) => this.mutate((store) => {
      const habit = store.habits.find((item) => item.id === habitId);
      if (!habit) throw new Error('未找到该习惯');
      if (habit.archived) throw new Error('已归档习惯不能修改打卡');
      const existing = store.habitCheckIns.find((item) => item.habitId === habitId && item.date === date);
      if (existing?.state === 'skip') return existing;
      if (existing && (existing.count ?? 1) > 0) throw new Error('今日已完成，无需休息');
      if (existing) return this.touch(existing, { state: 'skip' as const });
      const entity: HabitCheckIn = { ...base(), habitId, date, count: 0, state: 'skip' };
      store.habitCheckIns.push(entity);
      return entity;
    }),
    unskipDay: (habitId: string, date: ISODate) => this.mutate((store) => {
      store.habitCheckIns = store.habitCheckIns.filter((item) => !(item.habitId === habitId && item.date === date && item.state === 'skip'));
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
    rollOverIncompleteDayPlans: (from: ISODate, to: ISODate) => this.mutate((store) => {
      if (from >= to) return 0;
      const pending = store.plans.filter((item) => item.level === 'day' && item.period === from && !['completed', 'cancelled'].includes(item.status));
      const nextOrder = store.plans.filter((item) => item.level === 'day' && item.period === to).length;
      pending.forEach((plan, index) => this.touch(plan, { period: to, order: nextOrder + index }));
      return pending.length;
    }),
  };

  books = {
    list: (filter: BookFilter = {}) => this.query((store) => {
      return store.books
        .filter((item) => !filter.status || item.status === filter.status)
        .filter((item) => !filter.category || item.category === filter.category)
        .filter((item) => !filter.keyword || item.title.toLowerCase().includes(filter.keyword.toLowerCase()) || (item.author && item.author.toLowerCase().includes(filter.keyword.toLowerCase())))
        .sort((a, b) => (b.status === 'reading' ? 1 : 0) - (a.status === 'reading' ? 1 : 0) || b.updatedAt.localeCompare(a.updatedAt));
    }),
    get: (bookId: string) => this.query((store) => store.books.find((item) => item.id === bookId) ?? null),
    create: (input: BookInput) => this.mutate((store) => {
      const entity: Book = { ...base(), ...input };
      store.books.push(entity);
      return entity;
    }),
    update: (bookId: string, patch: Partial<BookInput>) => this.mutate((store) => {
      const entity = store.books.find((item) => item.id === bookId);
      if (!entity) throw new Error('未找到该书籍');
      return this.touch(entity, patch);
    }),
    remove: (bookId: string) => this.mutate((store) => {
      store.books = store.books.filter((item) => item.id !== bookId);
      store.readingLogs = store.readingLogs.filter((item) => item.bookId !== bookId);
      store.bookNotes = store.bookNotes.filter((item) => item.bookId !== bookId);
    }),
    logProgress: (bookId: string, input: ReadingLogInput) => this.mutate((store) => {
      const book = store.books.find((item) => item.id === bookId);
      if (!book) throw new Error('未找到该书籍');
      const page = Math.min(input.page, book.totalPages);
      const prevPage = book.currentPage || 0;
      const pagesRead = Math.max(0, page - prevPage);
      const log: ReadingLog = { ...base(), ...input, page, pagesRead: input.pagesRead ?? pagesRead };
      store.readingLogs.push(log);

      const patch: Partial<Book> = { currentPage: page };
      if (page >= book.totalPages && book.status !== 'finished') {
        patch.status = 'finished';
        patch.finishDate = input.date || dateToday();
      } else if (page > 0 && book.status === 'queue') {
        patch.status = 'reading';
        patch.startDate = book.startDate || input.date || dateToday();
      }
      this.touch(book, patch);
      return log;
    }),
    listLogs: (bookId?: string) => this.query((store) => {
      return store.readingLogs
        .filter((item) => !bookId || item.bookId === bookId)
        .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
    }),
    createNote: (bookId: string, input: BookNoteInput) => this.mutate((store) => {
      const entity: BookNote = { ...base(), ...input, bookId };
      store.bookNotes.push(entity);
      return entity;
    }),
    listNotes: (bookId?: string) => this.query((store) => {
      return store.bookNotes
        .filter((item) => !bookId || item.bookId === bookId)
        .sort((a, b) => (a.pageNumber ?? 0) - (b.pageNumber ?? 0) || b.createdAt.localeCompare(a.createdAt));
    }),
    removeNote: (noteId: string) => this.mutate((store) => {
      store.bookNotes = store.bookNotes.filter((item) => item.id !== noteId);
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
    get: () => this.query((store) => {
      // 展示口径：跨月未使用时按「已重新发放」返回（持久化在下次 mutate 时落盘）
      const settings = { ...store.settings };
      if (settings.makeupCardMonth !== monthToday() || typeof settings.makeupCardBalance !== 'number') {
        settings.makeupCardMonth = monthToday();
        settings.makeupCardBalance = MAKEUP_CARDS_PER_MONTH;
      }
      return settings;
    }),
    update: (patch: Partial<SettingsInput>) => this.mutate((store) => this.touch(store.settings, patch)),
  };

  backup = {
    exportData: () => this.query((store) => ({ version: 1 as const, exportedAt: timestamp(), data: clone(store) })),
    importData: (payload: BackupPayload, mode: BackupImportMode) => this.mutate((store) => {
      if (!isBackupPayload(payload)) throw new Error('备份文件格式无效或版本不受支持');
      const incoming = clone(payload.data);
      if (mode === 'replace') {
        Object.assign(store, incoming);
      } else {
        store.habits = mergeById(store.habits, incoming.habits || []);
        store.habitCheckIns = mergeById(store.habitCheckIns, incoming.habitCheckIns || []);
        store.plans = mergeById(store.plans, incoming.plans || []);
        store.books = mergeById(store.books, incoming.books || []);
        store.readingLogs = mergeById(store.readingLogs, incoming.readingLogs || []);
        store.bookNotes = mergeById(store.bookNotes, incoming.bookNotes || []);
        store.categories = mergeById(store.categories, incoming.categories || []);
        store.accounts = mergeById(store.accounts, incoming.accounts || []);
        store.transactions = mergeById(store.transactions, incoming.transactions || []);
        store.budgets = mergeById(store.budgets, incoming.budgets || []);
        store.assets = mergeById(store.assets, incoming.assets || []);
        store.moments = mergeById(store.moments, incoming.moments || []);
        store.settings = incoming.settings;
      }
      migrateStore(store);
    }),
    clear: () => this.mutate((store) => {
      Object.assign(store, initialStore());
    }),
  };

  stats = {
    dashboard: (today: ISODate = dateToday()) => this.query((store) => {
      const todayPlans = store.plans.filter((item) => item.level === 'day' && item.period === today).sort((a, b) => a.order - b.order);
      const overduePlans = store.plans.filter((item) => item.level === 'day' && item.period < today && !['completed', 'cancelled'].includes(item.status)).sort((a, b) => b.period.localeCompare(a.period) || a.order - b.order);
      const completedPlans = todayPlans.filter((item) => item.status === 'completed').length;
      const activeHabits = store.habits.filter((item) => !item.archived);
      // 今日打卡进度只统计「今天需要打卡」的习惯（custom 频率非调度日不计入分母）；休息日视为已安顿
      const dueHabits = activeHabits.filter((habit) => isHabitDue(habit, today));
      const completedHabits = dueHabits.filter((habit) => store.habitCheckIns.some((checkIn) => checkIn.habitId === habit.id && checkIn.date === today && (checkIn.state === 'skip' || (checkIn.count ?? 1) > 0))).length;
      const month = today.slice(0, 7);
      const year = today.slice(0, 4);
      const expenses = store.transactions.filter((item) => item.type === 'expense');
      const total = (items: Transaction[]) => items.reduce((sum, item) => sum + item.amount, 0);
      const currentBudget = store.budgets.find((item) => item.period === month);
      const daysUntil = (value: string) => Math.ceil((Date.parse(`${value}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86_400_000);
      const expiringAssets = store.assets
        .filter((item) => Boolean(item.expireDate ?? item.warrantyUntil))
        .map((asset) => ({ asset, daysUntil: daysUntil(asset.expireDate ?? asset.warrantyUntil as string) }))
        .filter((item) => item.daysUntil <= 30)
        .sort((a, b) => a.daysUntil - b.daysUntil);

      const activeBooks = store.books.filter((item) => item.status === 'reading');
      const finishedThisYear = store.books.filter((item) => item.status === 'finished' && (item.finishDate ? item.finishDate.startsWith(year) : true)).length;
      const totalPagesRead = store.readingLogs.reduce((sum, item) => sum + item.pagesRead, 0);

      return {
        today,
        plan: { completed: completedPlans, total: todayPlans.length },
        habits: { completed: completedHabits, total: dueHabits.length },
        finance: {
          todayExpense: total(expenses.filter((item) => item.date === today)),
          monthExpense: total(expenses.filter((item) => item.date.startsWith(month))),
          budget: currentBudget,
          budgetSpent: total(expenses.filter((item) => item.date.startsWith(month))),
        },
        expiringAssets,
        overduePlans,
        todayPlans,
        recentMoments: [...store.moments].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 3),
        reading: {
          currentBook: activeBooks[0],
          activeBooks,
          annualTarget: store.settings.annualReadingTarget || 12,
          finishedThisYear,
          totalPagesRead,
        },
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
    reading: (targetYear = yearToday()) => this.query((store) => {
      const yearStr = String(targetYear);
      const activeBooks = store.books.filter((item) => item.status === 'reading');
      const finishedBooks = store.books.filter((item) => item.status === 'finished');
      const finishedThisYear = finishedBooks.filter((item) => item.finishDate ? item.finishDate.startsWith(yearStr) : true).length;
      const totalPagesRead = store.readingLogs.reduce((sum, item) => sum + item.pagesRead, 0);

      const months = Array.from({ length: 12 }, (_, i) => `${yearStr}-${String(i + 1).padStart(2, '0')}`);
      const readingTrend = months.map((period) => ({
        period,
        pagesRead: store.readingLogs.filter((item) => item.date.startsWith(period)).reduce((sum, item) => sum + item.pagesRead, 0),
        booksFinished: finishedBooks.filter((item) => item.finishDate && item.finishDate.startsWith(period)).length,
      }));

      const categoryCounts: Record<string, number> = {};
      store.books.forEach((b) => {
        const cat = b.category || '未分类';
        categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
      });
      const categoryDistribution = Object.entries(categoryCounts).map(([category, count]) => ({ category, count }));

      return {
        currentReadingCount: activeBooks.length,
        finishedThisYear,
        totalPagesRead,
        annualTarget: store.settings.annualReadingTarget || 12,
        readingTrend,
        categoryDistribution,
      };
    }),
  };
}

export const resetMockData = () => {
  if (typeof window !== 'undefined') window.localStorage.removeItem(STORAGE_KEY);
};
