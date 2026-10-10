import type { Budget, DashboardStats, ISODate, MealBudgetStats, Transaction } from '@lifeos/shared';
import { isHabitDue } from '../lib/dates';
import type { StatsRepository } from '../repositories/statsRepository';

const DAY = 86_400_000;
const MEAL_CATEGORY = { breakfast: 'category-breakfast', lunch: 'category-lunch', dinner: 'category-dinner' } as const;

/** 统计聚合服务（语义与 MockDataSource.stats 等价）。 */
export class StatsService {
  constructor(private readonly repository: StatsRepository) {}

  async dashboard(userId: string, today: ISODate): Promise<DashboardStats> {
    const snapshot = await this.repository.loadDashboard(userId);
    const { plans, habits, checkIns, transactions, budgets, assets, moments, books, readingLogs, settings } = snapshot;

    const todayPlans = plans.filter((item) => item.level === 'day' && item.period === today).sort((a, b) => a.order - b.order);
    const overduePlans = plans
      .filter((item) => item.level === 'day' && item.period < today && !['completed', 'cancelled'].includes(item.status))
      .sort((a, b) => b.period.localeCompare(a.period) || a.order - b.order);
    const completedPlans = todayPlans.filter((item) => item.status === 'completed').length;

    const activeHabits = habits.filter((item) => !item.archived);
    const dueHabits = activeHabits.filter((habit) => isHabitDue(habit, today));
    const completedHabits = dueHabits.filter((habit) =>
      checkIns.some((checkIn) => checkIn.habitId === habit.id && checkIn.date === today && (checkIn.state === 'skip' || (checkIn.count ?? 1) > 0)),
    ).length;

    const month = today.slice(0, 7);
    const year = today.slice(0, 4);
    const expenses = transactions.filter((item) => item.type === 'expense');
    const total = (items: Transaction[]) => items.reduce((sum, item) => sum + item.amount, 0);

    const mealBudget = settings?.mealBudget ?? { breakfast: 0, lunch: 0, dinner: 0 };
    const dayOfMonth = Number(today.slice(8));
    const meal: MealBudgetStats = { breakfast: 0, lunch: 0, dinner: 0, monthSaved: 0, monthOverspent: 0 };
    (['breakfast', 'lunch', 'dinner'] as const).forEach((key) => {
      const categoryId = MEAL_CATEGORY[key];
      meal[key] = total(expenses.filter((item) => item.date === today && item.categoryId === categoryId));
      const budgetMonth = mealBudget[key] * dayOfMonth;
      const spentMonth = total(expenses.filter((item) => item.date.startsWith(month) && item.categoryId === categoryId));
      const diff = budgetMonth - spentMonth;
      if (diff > 0) meal.monthSaved += diff;
      else meal.monthOverspent += -diff;
    });

    const currentBudget: Budget | undefined = budgets.find((item) => item.period === month);
    const daysUntil = (value: string) => Math.ceil((Date.parse(`${value}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / DAY);
    const expiringAssets = assets
      .filter((item) => Boolean(item.expireDate ?? item.warrantyUntil))
      .map((asset) => ({ asset, daysUntil: daysUntil((asset.expireDate ?? asset.warrantyUntil) as string) }))
      .filter((item) => item.daysUntil <= 30)
      .sort((a, b) => a.daysUntil - b.daysUntil);

    const activeBooks = books.filter((item) => item.status === 'reading');
    const finishedThisYear = books.filter((item) => item.status === 'finished' && (item.finishDate ? item.finishDate.startsWith(year) : true)).length;
    const totalPagesRead = readingLogs.reduce((sum, item) => sum + item.pagesRead, 0);

    return {
      today,
      plan: { completed: completedPlans, total: todayPlans.length },
      habits: { completed: completedHabits, total: dueHabits.length },
      finance: {
        todayExpense: total(expenses.filter((item) => item.date === today)),
        monthExpense: total(expenses.filter((item) => item.date.startsWith(month))),
        budget: currentBudget,
        budgetSpent: total(expenses.filter((item) => item.date.startsWith(month))),
        meal,
      },
      expiringAssets,
      overduePlans,
      todayPlans,
      recentMoments: [...moments].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 3),
      reading: {
        currentBook: activeBooks[0],
        activeBooks,
        annualTarget: settings?.annualReadingTarget || 12,
        finishedThisYear,
        totalPagesRead,
      },
    };
  }
}
