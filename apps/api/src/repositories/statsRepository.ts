import type { Account, Asset, Book, Budget, Category, Habit, HabitCheckIn, Moment, Plan, ReadingLog, Settings, Transaction } from '@lifeos/shared';

/** 一次取齐 dashboard 聚合所需的所有集合（均按 userId 过滤）。 */
export interface DashboardSnapshot {
  habits: Habit[];
  checkIns: HabitCheckIn[];
  plans: Plan[];
  transactions: Transaction[];
  accounts: Account[];
  categories: Category[];
  budgets: Budget[];
  assets: Asset[];
  moments: Moment[];
  books: Book[];
  readingLogs: ReadingLog[];
  settings: Settings | null;
}

export interface StatsRepository {
  loadDashboard(userId: string): Promise<DashboardSnapshot>;
}
