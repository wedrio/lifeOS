export type ISODate = `${number}-${number}-${number}` | string;
export type ISODateTime = string;

export interface BaseEntity {
  id: string;
  userId: string;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

export type HabitFrequency = 'daily' | 'weekly' | 'custom';
export interface Habit extends BaseEntity {
  name: string;
  icon: string;
  color: string;
  frequency: HabitFrequency;
  /** daily: 每天完成 N 次；weekly: 每周完成 N 次（弹性）；custom: 固定 1 */
  timesPerPeriod: number;
  /** custom 专用：调度星期几（1=周一 … 7=周日），仅调度日需要打卡 */
  weekdays?: number[];
  reminderTime?: string;
  allowBackfillDays: number;
  archived: boolean;
}
export type HabitInput = Omit<Habit, keyof BaseEntity | 'archived'> & { archived?: boolean };
export type HabitCheckInState = 'done' | 'skip';
export interface HabitCheckIn extends BaseEntity {
  habitId: string;
  date: ISODate;
  /** 当日完成次数，默认 1，上限为 habit.timesPerPeriod（daily 多次打卡逐次累加） */
  count?: number;
  /** done=完成（默认）；skip=休息日，不清 streak、不计未完成 */
  state?: HabitCheckInState;
  note?: string;
}

export type PlanLevel = 'year' | 'month' | 'week' | 'day';
export type PlanStatus = 'not_started' | 'in_progress' | 'completed' | 'cancelled';
export type PlanPriority = 'low' | 'medium' | 'high';
export interface Plan extends BaseEntity {
  title: string;
  description?: string;
  level: PlanLevel;
  /** Year: 2026; Month: 2026-09; Week: 2026-W38; Day: 2026-09-14 */
  period: string;
  parentId?: string;
  status: PlanStatus;
  progress: number;
  priority: PlanPriority;
  order: number;
}
export type PlanInput = Omit<Plan, keyof BaseEntity | 'order'> & { order?: number };
export interface PlanFilter {
  level?: PlanLevel;
  period?: string;
  parentId?: string;
  includeCompleted?: boolean;
}

export type BookStatus = 'queue' | 'reading' | 'finished' | 'abandoned';
export type BookCoverTheme = 'emerald' | 'sage' | 'obsidian' | 'chestnut' | 'ocean' | 'crimson';

export interface Book extends BaseEntity {
  title: string;
  author?: string;
  totalPages: number;
  currentPage: number;
  status: BookStatus;
  category?: string;
  coverUrl?: string;
  coverTheme?: BookCoverTheme | string;
  rating?: number;
  review?: string;
  takeaways?: string[];
  startDate?: ISODate;
  finishDate?: ISODate;
}
export type BookInput = Omit<Book, keyof BaseEntity>;

export interface ReadingLog extends BaseEntity {
  bookId: string;
  page: number;
  pagesRead: number;
  note?: string;
  date: ISODate;
}
export type ReadingLogInput = Omit<ReadingLog, keyof BaseEntity>;

export interface BookNote extends BaseEntity {
  bookId: string;
  pageNumber?: number;
  quote: string;
  thoughts?: string;
  tags: string[];
}
export type BookNoteInput = Omit<BookNote, keyof BaseEntity>;

export interface BookFilter {
  status?: BookStatus;
  category?: string;
  keyword?: string;
}

export interface ReadingStats {
  currentReadingCount: number;
  finishedThisYear: number;
  totalPagesRead: number;
  annualTarget: number;
  readingTrend: Array<{ period: string; pagesRead: number; booksFinished: number }>;
  categoryDistribution: Array<{ category: string; count: number }>;
}

export type TransactionType = 'expense' | 'income' | 'repayment';
export type CategoryType = 'expense' | 'income';
export interface Category extends BaseEntity {
  name: string;
  icon: string;
  color: string;
  type: CategoryType;
  parentId?: string;
  isSystem: boolean;
}
export type CategoryInput = Omit<Category, keyof BaseEntity | 'isSystem'> & { isSystem?: boolean };
export interface Account extends BaseEntity {
  name: string;
  icon: string;
  initialBalance: number;
  archived: boolean;
  /** v2.12 信用账户（花呗/信用卡）：余额可为负，前端以「欠款」展示 */
  kind?: 'cash' | 'credit';
}
export type AccountInput = Omit<Account, keyof BaseEntity>;
export interface Transaction extends BaseEntity {
  type: TransactionType;
  /** Amount in cents. */
  amount: number;
  /** 支出/收入分类；还款（repayment）无分类 */
  categoryId?: string;
  accountId: string;
  /** 还款目标信用账户（仅 type='repayment'） */
  toAccountId?: string;
  date: ISODate;
  note?: string;
  tags: string[];
}
export type TransactionInput = Omit<Transaction, keyof BaseEntity>;
export interface TransactionFilter {
  type?: TransactionType;
  categoryId?: string;
  accountId?: string;
  tags?: string[];
  from?: ISODate;
  to?: ISODate;
}
export interface Budget extends BaseEntity {
  /** YYYY-MM */
  period: string;
  /** Amount in cents. */
  total: number;
  /** Category ID to budget amount in cents. */
  byCategory: Record<string, number>;
}
export type BudgetInput = Omit<Budget, keyof BaseEntity>;

export type AssetKind = 'physical' | 'subscription';
export type PhysicalAssetStatus = 'in_use' | 'idle' | 'sold';
export type BillingCycle = 'monthly' | 'quarterly' | 'yearly';
export interface Asset extends BaseEntity {
  kind: AssetKind;
  name: string;
  icon: string;
  category: string;
  brand?: string;
  model?: string;
  serialNo?: string;
  purchaseDate?: ISODate;
  purchasePrice?: number;
  warrantyUntil?: ISODate;
  estimatedValue?: number;
  status?: PhysicalAssetStatus;
  price?: number;
  billingCycle?: BillingCycle;
  startDate?: ISODate;
  expireDate?: ISODate;
  autoRenew?: boolean;
  accountNote?: string;
}
export type AssetInput = Omit<Asset, keyof BaseEntity>;

export interface EntityLink {
  type: 'habit_checkin' | 'transaction' | 'asset' | 'book' | 'book_note';
  id: string;
}
export interface Moment extends BaseEntity {
  content: string;
  imageUrls: string[];
  mood?: string;
  weather?: string;
  location?: string;
  tags: string[];
  links: EntityLink[];
}
export type MomentInput = Omit<Moment, keyof BaseEntity>;
export interface MomentFilter {
  from?: ISODate;
  to?: ISODate;
  tags?: string[];
  limit?: number;
}

export type ThemeMode = 'light' | 'dark' | 'system';
export interface Settings extends BaseEntity {
  currency: string;
  theme: ThemeMode;
  weekStartsOn: 0 | 1;
  /** When enabled, unfinished daily plans are moved forward on opening today's plan. */
  autoRollOverIncompletePlans: boolean;
  annualReadingTarget: number;
  /** 补签卡余额：每月 1 日发放 2 张，当月未用完不累积 */
  makeupCardBalance: number;
  /** 已发放月份 'YYYY-MM'，用于判断是否需要重新发放 */
  makeupCardMonth: string;
  /** v2.12 每日三餐额度（分），0 表示未启用该餐 */
  mealBudget: MealBudget;
}
export interface MealBudget { breakfast: number; lunch: number; dinner: number; }
export type SettingsInput = Pick<Settings, 'currency' | 'theme' | 'weekStartsOn' | 'autoRollOverIncompletePlans' | 'annualReadingTarget'> & { mealBudget?: MealBudget };

export interface ExpiringAsset {
  asset: Asset;
  daysUntil: number;
}
export interface DashboardStats {
  today: ISODate;
  plan: { completed: number; total: number };
  habits: { completed: number; total: number };
  finance: { todayExpense: number; monthExpense: number; budget?: Budget; budgetSpent: number; meal: MealBudgetStats };
  expiringAssets: ExpiringAsset[];
  overduePlans: Plan[];
  todayPlans: Plan[];
  recentMoments: Moment[];
  reading: {
    currentBook?: Book;
    activeBooks: Book[];
    annualTarget: number;
    finishedThisYear: number;
    totalPagesRead: number;
  };
}
/** v2.12 餐费预算统计：三餐今日已花（分）+ 本月累计节约/超支（分） */
export interface MealBudgetStats {
  breakfast: number;
  lunch: number;
  dinner: number;
  monthSaved: number;
  monthOverspent: number;
}

export type BackupImportMode = 'replace' | 'merge';
export interface BackupPayload {
  version: 1;
  exportedAt: ISODateTime;
  data: {
    habits: Habit[];
    habitCheckIns: HabitCheckIn[];
    plans: Plan[];
    books?: Book[];
    readingLogs?: ReadingLog[];
    bookNotes?: BookNote[];
    categories: Category[];
    accounts: Account[];
    transactions: Transaction[];
    budgets: Budget[];
    assets: Asset[];
    moments: Moment[];
    settings: Settings;
  };
}
export interface FinanceStats {
  month: string;
  income: number;
  expense: number;
  balanceByAccount: Array<{ account: Account; balance: number }>;
  expenseByCategory: Array<{ category: Category; amount: number }>;
  monthlyTrend: Array<{ period: string; income: number; expense: number }>;
}

export interface SharePayload {
  text?: string;
  images?: string[];
}
export interface PlatformCapabilities {
  notify(options: { title: string; body: string; at?: Date }): Promise<void>;
  pickImages(max: number): Promise<Blob[]>;
  saveFile(filename: string, blob: Blob): Promise<void>;
  share(content: SharePayload): Promise<void>;
  receiveShare(): Promise<SharePayload | null>;
  biometricUnlock(): Promise<boolean>;
  onShortcut(callback: (action: string) => void): void;
  updateCheck(): Promise<void>;
}
