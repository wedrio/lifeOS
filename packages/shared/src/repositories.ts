import type {
  Account, AccountInput, Asset, AssetInput, Budget, BudgetInput,
  Category, CategoryInput, DashboardStats, FinanceStats, Habit, HabitCheckIn, HabitInput,
  ISODate, Moment, MomentFilter, MomentInput, Plan, PlanFilter, PlanInput, Settings,
  SettingsInput, Transaction, TransactionFilter, TransactionInput, BackupImportMode, BackupPayload,
  Book, BookInput, BookFilter, ReadingLog, ReadingLogInput, BookNote, BookNoteInput, ReadingStats,
} from './types';

export interface HabitRepository {
  list(includeArchived?: boolean): Promise<Habit[]>;
  create(input: HabitInput): Promise<Habit>;
  update(id: string, patch: Partial<HabitInput>): Promise<Habit>;
  remove(id: string): Promise<void>;
  checkIn(habitId: string, date: ISODate, note?: string): Promise<HabitCheckIn>;
  uncheck(habitId: string, date: ISODate): Promise<void>;
  listCheckIns(habitId: string, from: ISODate, to: ISODate): Promise<HabitCheckIn[]>;
}

export interface PlanRepository {
  list(filter?: PlanFilter): Promise<Plan[]>;
  create(input: PlanInput): Promise<Plan>;
  update(id: string, patch: Partial<PlanInput>): Promise<Plan>;
  remove(id: string): Promise<void>;
  reorder(ids: string[]): Promise<void>;
  rollOverIncompleteDayPlans(from: ISODate, to: ISODate): Promise<number>;
}

export interface BookRepository {
  list(filter?: BookFilter): Promise<Book[]>;
  get(id: string): Promise<Book | null>;
  create(input: BookInput): Promise<Book>;
  update(id: string, patch: Partial<BookInput>): Promise<Book>;
  remove(id: string): Promise<void>;
  logProgress(bookId: string, input: ReadingLogInput): Promise<ReadingLog>;
  listLogs(bookId?: string): Promise<ReadingLog[]>;
  createNote(bookId: string, input: BookNoteInput): Promise<BookNote>;
  listNotes(bookId?: string): Promise<BookNote[]>;
  removeNote(id: string): Promise<void>;
}

export interface FinanceRepository {
  listCategories(type?: 'expense' | 'income'): Promise<Category[]>;
  createCategory(input: CategoryInput): Promise<Category>;
  updateCategory(id: string, patch: Partial<CategoryInput>): Promise<Category>;
  removeCategory(id: string): Promise<void>;
  listAccounts(includeArchived?: boolean): Promise<Account[]>;
  createAccount(input: AccountInput): Promise<Account>;
  updateAccount(id: string, patch: Partial<AccountInput>): Promise<Account>;
  removeAccount(id: string): Promise<void>;
  listTransactions(filter?: TransactionFilter): Promise<Transaction[]>;
  createTransaction(input: TransactionInput): Promise<Transaction>;
  updateTransaction(id: string, patch: Partial<TransactionInput>): Promise<Transaction>;
  removeTransaction(id: string): Promise<void>;
  getBudget(period: string): Promise<Budget | null>;
  saveBudget(input: BudgetInput): Promise<Budget>;
}

export interface AssetRepository {
  list(kind?: Asset['kind']): Promise<Asset[]>;
  create(input: AssetInput): Promise<Asset>;
  update(id: string, patch: Partial<AssetInput>): Promise<Asset>;
  remove(id: string): Promise<void>;
}

export interface MomentRepository {
  list(filter?: MomentFilter): Promise<Moment[]>;
  create(input: MomentInput): Promise<Moment>;
  update(id: string, patch: Partial<MomentInput>): Promise<Moment>;
  remove(id: string): Promise<void>;
}

export interface SettingsRepository {
  get(): Promise<Settings>;
  update(patch: Partial<SettingsInput>): Promise<Settings>;
}

export interface StatsRepository {
  dashboard(today?: ISODate): Promise<DashboardStats>;
  finance(month?: string): Promise<FinanceStats>;
  reading(year?: number): Promise<ReadingStats>;
}

export interface BackupRepository {
  exportData(): Promise<BackupPayload>;
  importData(payload: BackupPayload, mode: BackupImportMode): Promise<void>;
  clear(): Promise<void>;
}

export interface DataSource {
  habits: HabitRepository;
  plans: PlanRepository;
  books: BookRepository;
  finance: FinanceRepository;
  assets: AssetRepository;
  moments: MomentRepository;
  settings: SettingsRepository;
  stats: StatsRepository;
  backup: BackupRepository;
}
