import type {
  Account as AccountRow, Asset as AssetRow, Book as BookRow, BookNote as BookNoteRow, Budget as BudgetRow,
  Category as CategoryRow, Habit as HabitRow, HabitCheckIn as CheckInRow, Moment as MomentRow, Plan as PlanRow,
  Prisma, ReadingLog as ReadingLogRow, Seed as SeedRow, Settings as SettingsRow, Transaction as TransactionRow,
} from '@prisma/client';
import type {
  Account, Asset, Book, BookNote, Budget, Category, EntityLink, Habit, HabitCheckIn, MealBudget, Moment, Plan, ReadingLog, Seed, Settings, Transaction,
} from '@lifeos/shared';

const iso = (value: Date) => value.toISOString();
const arr = <T>(value: Prisma.JsonValue | null): T[] => (Array.isArray(value) ? (value as T[]) : []);
const obj = (value: Prisma.JsonValue | null): Record<string, unknown> => (value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {});

export const mapHabit = (row: HabitRow): Habit => ({
  id: row.id, userId: row.userId, createdAt: iso(row.createdAt), updatedAt: iso(row.updatedAt),
  name: row.name, icon: row.icon, color: row.color, frequency: row.frequency,
  timesPerPeriod: row.timesPerPeriod, weekdays: row.weekdays, reminderTime: row.reminderTime ?? undefined,
  allowBackfillDays: row.allowBackfillDays, archived: row.archived,
});

export const mapCheckIn = (row: CheckInRow, userId: string): HabitCheckIn => ({
  id: row.id, userId, habitId: row.habitId, date: row.date,
  count: row.count, state: (row.state as HabitCheckIn['state']) ?? undefined, note: row.note ?? undefined,
  createdAt: iso(row.createdAt), updatedAt: iso(row.updatedAt),
});

export const mapPlan = (row: PlanRow): Plan => ({
  id: row.id, userId: row.userId, createdAt: iso(row.createdAt), updatedAt: iso(row.updatedAt),
  title: row.title, description: row.description ?? undefined, level: row.level, period: row.period,
  parentId: row.parentId ?? undefined, status: row.status, progress: row.progress, priority: row.priority, order: row.order,
});

export const mapCategory = (row: CategoryRow): Category => ({
  id: row.id, userId: row.userId, createdAt: iso(row.createdAt), updatedAt: iso(row.updatedAt),
  name: row.name, icon: row.icon, color: row.color, type: row.type as Category['type'], parentId: row.parentId ?? undefined, isSystem: row.isSystem,
});

export const mapAccount = (row: AccountRow): Account => ({
  id: row.id, userId: row.userId, createdAt: iso(row.createdAt), updatedAt: iso(row.updatedAt),
  name: row.name, icon: row.icon, initialBalance: row.initialBalance, archived: row.archived,
  kind: (row.kind as Account['kind']) ?? undefined,
});

export const mapTransaction = (row: TransactionRow): Transaction => ({
  id: row.id, userId: row.userId, createdAt: iso(row.createdAt), updatedAt: iso(row.updatedAt),
  type: row.type, amount: row.amount, categoryId: row.categoryId, accountId: row.accountId,
  toAccountId: row.toAccountId ?? undefined, date: row.date, note: row.note ?? undefined, tags: arr<string>(row.tags),
});

export const mapBudget = (row: BudgetRow): Budget => ({
  id: row.id, userId: row.userId, createdAt: iso(row.createdAt), updatedAt: iso(row.updatedAt),
  period: row.period, total: row.total, byCategory: obj(row.byCategory) as Record<string, number>,
});

export const mapAsset = (row: AssetRow): Asset => ({
  id: row.id, userId: row.userId, createdAt: iso(row.createdAt), updatedAt: iso(row.updatedAt),
  kind: row.kind, name: row.name, icon: row.icon, category: row.category,
  brand: row.brand ?? undefined, model: row.model ?? undefined, serialNo: row.serialNo ?? undefined,
  purchaseDate: row.purchaseDate ?? undefined, purchasePrice: row.purchasePrice ?? undefined,
  warrantyUntil: row.warrantyUntil ?? undefined, estimatedValue: row.estimatedValue ?? undefined,
  status: row.status ?? undefined, price: row.price ?? undefined, billingCycle: row.billingCycle ?? undefined,
  startDate: row.startDate ?? undefined, expireDate: row.expireDate ?? undefined,
  autoRenew: row.autoRenew ?? undefined, accountNote: row.accountNote ?? undefined,
});

export const mapMoment = (row: MomentRow): Moment => ({
  id: row.id, userId: row.userId, createdAt: iso(row.createdAt), updatedAt: iso(row.updatedAt),
  content: row.content, imageUrls: arr<string>(row.imageUrls), mood: row.mood ?? undefined,
  weather: row.weather ?? undefined, location: row.location ?? undefined,
  tags: arr<string>(row.tags), links: arr<EntityLink>(row.links),
});

export const mapBook = (row: BookRow): Book => ({
  id: row.id, userId: row.userId, createdAt: iso(row.createdAt), updatedAt: iso(row.updatedAt),
  title: row.title, author: row.author ?? undefined, totalPages: row.totalPages, currentPage: row.currentPage,
  status: row.status as Book['status'], category: row.category ?? undefined, coverUrl: row.coverUrl ?? undefined,
  coverTheme: row.coverTheme ?? undefined, rating: row.rating ?? undefined, review: row.review ?? undefined,
  takeaways: arr<string>(row.takeaways), startDate: row.startDate ?? undefined, finishDate: row.finishDate ?? undefined,
});

export const mapReadingLog = (row: ReadingLogRow): ReadingLog => ({
  id: row.id, userId: row.userId, createdAt: iso(row.createdAt), updatedAt: iso(row.updatedAt),
  bookId: row.bookId, page: row.page, pagesRead: row.pagesRead, note: row.note ?? undefined, date: row.date,
});

export const mapBookNote = (row: BookNoteRow): BookNote => ({
  id: row.id, userId: row.userId, createdAt: iso(row.createdAt), updatedAt: iso(row.updatedAt),
  bookId: row.bookId, pageNumber: row.pageNumber ?? undefined, quote: row.quote,
  thoughts: row.thoughts ?? undefined, tags: arr<string>(row.tags),
});

export const mapSeed = (row: SeedRow): Seed => ({
  id: row.id, userId: row.userId, createdAt: iso(row.createdAt), updatedAt: iso(row.updatedAt),
  title: row.title, url: row.url ?? undefined, kind: row.kind as Seed['kind'], note: row.note ?? undefined,
  effort: row.effort as Seed['effort'], status: row.status as Seed['status'], settledAt: row.settledAt ?? undefined,
});

export const mapMeal = (value: Prisma.JsonValue | null): MealBudget => {
  const record = obj(value);
  return { breakfast: Number(record.breakfast ?? 0), lunch: Number(record.lunch ?? 0), dinner: Number(record.dinner ?? 0) };
};

export const mapSettings = (row: SettingsRow): Settings => ({
  id: row.userId, userId: row.userId, createdAt: iso(row.createdAt), updatedAt: iso(row.updatedAt),
  currency: row.currency, theme: row.theme as Settings['theme'],
  weekStartsOn: (row.weekStartsOn === 0 ? 0 : 1) as Settings['weekStartsOn'],
  autoRollOverIncompletePlans: row.autoRollOverIncompletePlans,
  annualReadingTarget: row.annualReadingTarget, makeupCardBalance: row.makeupCardBalance,
  makeupCardMonth: row.makeupCardMonth ?? '', mealBudget: mapMeal(row.mealBudget),
});
