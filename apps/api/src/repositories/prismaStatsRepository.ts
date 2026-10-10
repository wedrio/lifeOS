import type { PrismaClient } from '@prisma/client';
import type { DashboardSnapshot, StatsRepository } from './statsRepository';
import { mapAccount, mapAsset, mapBook, mapBudget, mapCategory, mapCheckIn, mapHabit, mapMoment, mapPlan, mapReadingLog, mapSettings, mapTransaction } from './mappers';

export class PrismaStatsRepository implements StatsRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async loadDashboard(userId: string): Promise<DashboardSnapshot> {
    const [habits, checkIns, plans, transactions, accounts, categories, budgets, assets, moments, books, readingLogs, settings] = await Promise.all([
      this.prisma.habit.findMany({ where: { userId } }),
      this.prisma.habitCheckIn.findMany({ where: { habit: { userId } } }),
      this.prisma.plan.findMany({ where: { userId } }),
      this.prisma.transaction.findMany({ where: { userId } }),
      this.prisma.account.findMany({ where: { userId } }),
      this.prisma.category.findMany({ where: { userId } }),
      this.prisma.budget.findMany({ where: { userId } }),
      this.prisma.asset.findMany({ where: { userId } }),
      this.prisma.moment.findMany({ where: { userId } }),
      this.prisma.book.findMany({ where: { userId } }),
      this.prisma.readingLog.findMany({ where: { userId } }),
      this.prisma.settings.findUnique({ where: { userId } }),
    ]);
    return {
      habits: habits.map(mapHabit),
      checkIns: checkIns.map((row) => mapCheckIn(row, userId)),
      plans: plans.map(mapPlan),
      transactions: transactions.map(mapTransaction),
      accounts: accounts.map(mapAccount),
      categories: categories.map(mapCategory),
      budgets: budgets.map(mapBudget),
      assets: assets.map(mapAsset),
      moments: moments.map(mapMoment),
      books: books.map(mapBook),
      readingLogs: readingLogs.map(mapReadingLog),
      settings: settings ? mapSettings(settings) : null,
    };
  }
}
