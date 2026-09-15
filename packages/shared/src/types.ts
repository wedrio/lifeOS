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
  timesPerPeriod: number;
  reminderTime?: string;
  allowBackfillDays: number;
  archived: boolean;
}
export type HabitInput = Omit<Habit, keyof BaseEntity | 'archived'> & { archived?: boolean };
export interface HabitCheckIn extends BaseEntity {
  habitId: string;
  date: ISODate;
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

export type TransactionType = 'expense' | 'income';
export interface Category extends BaseEntity {
  name: string;
  icon: string;
  color: string;
  type: TransactionType;
  parentId?: string;
  isSystem: boolean;
}
export type CategoryInput = Omit<Category, keyof BaseEntity | 'isSystem'> & { isSystem?: boolean };
export interface Account extends BaseEntity {
  name: string;
  icon: string;
  initialBalance: number;
  archived: boolean;
}
export type AccountInput = Omit<Account, keyof BaseEntity>;
export interface Transaction extends BaseEntity {
  type: TransactionType;
  /** Amount in cents. */
  amount: number;
  categoryId: string;
  accountId: string;
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
}
export type SettingsInput = Pick<Settings, 'currency' | 'theme' | 'weekStartsOn' | 'autoRollOverIncompletePlans' | 'annualReadingTarget'>;

export interface ExpiringAsset {
  asset: Asset;
  daysUntil: number;
}
export interface DashboardStats {
  today: ISODate;
  plan: { completed: number; total: number };
  habits: { completed: number; total: number };
  finance: { todayExpense: number; monthExpense: number; budget?: Budget; budgetSpent: number };
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
