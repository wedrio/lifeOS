import type { Habit, HabitCheckIn, HabitInput, ISODate } from '@lifeos/shared';
import { ApiError } from '../lib/ApiError';
import { parseISODate } from '../lib/dates';
import type { HabitRepository } from '../repositories/habitRepository';
import type { SettingsService } from './settingsService';

const DAY = 86_400_000;
const notFound = () => new ApiError('HABIT_NOT_FOUND', '未找到该习惯', 404);

/** 习惯服务：CRUD + 打卡/取消/休息日（语义与 MockDataSource 等价）。 */
export class HabitService {
  constructor(private readonly habits: HabitRepository, private readonly settings: SettingsService) {}

  list(userId: string, includeArchived: boolean): Promise<Habit[]> {
    return this.habits.list(userId, includeArchived);
  }

  create(userId: string, input: HabitInput): Promise<Habit> {
    return this.habits.create(userId, input);
  }

  async update(userId: string, id: string, patch: Partial<HabitInput>): Promise<Habit> {
    const habit = await this.habits.update(userId, id, patch);
    if (!habit) throw notFound();
    return habit;
  }

  async remove(userId: string, id: string): Promise<void> {
    if (!(await this.habits.remove(userId, id))) throw notFound();
  }

  listCheckIns(userId: string, habitId: string, from: ISODate, to: ISODate): Promise<HabitCheckIn[]> {
    return this.habits.listCheckIns(userId, habitId, from, to);
  }

  async checkIn(userId: string, habitId: string, date: ISODate, today: ISODate, note?: string, useMakeupCard?: boolean): Promise<HabitCheckIn> {
    const habit = await this.habits.find(userId, habitId);
    if (!habit) throw notFound();
    if (habit.archived) throw new ApiError('HABIT_ARCHIVED', '已归档习惯不能打卡', 400);

    const targetTime = parseISODate(date).getTime();
    if (!Number.isFinite(targetTime)) throw new ApiError('VALIDATION_ERROR', '日期格式应为 YYYY-MM-DD', 400);
    const todayTime = parseISODate(today).getTime();
    if (targetTime > todayTime) throw new ApiError('FUTURE_DATE', '不能为未来日期打卡', 400);

    const daysAgo = Math.round((todayTime - targetTime) / DAY);
    if (daysAgo > habit.allowBackfillDays) {
      const settings = await this.settings.ensureMonth(userId);
      if (!useMakeupCard) throw new ApiError('MAKEUP_CARD_REQUIRED', '超出允许补打天数，可使用 1 张补签卡补打', 400);
      if (settings.makeupCardBalance <= 0) throw new ApiError('MAKEUP_CARD_EXHAUSTED', '本月补签卡已用完，下月再来', 400);
      await this.settings.consumeMakeupCard(userId);
    }

    const dailyTarget = habit.frequency === 'daily' ? habit.timesPerPeriod : 1;
    const existing = await this.habits.findCheckIn(userId, habitId, date);
    if (existing) {
      if (existing.state === 'skip') return this.habits.updateCheckIn(userId, habitId, date, { state: null, count: 1 });
      const count = existing.count ?? 1;
      if (count >= dailyTarget) throw new ApiError('TARGET_REACHED', '今日目标次数已完成，再点将逐次取消打卡', 400);
      return this.habits.updateCheckIn(userId, habitId, date, { count: count + 1 });
    }
    return this.habits.createCheckIn(userId, habitId, { date, count: 1, ...(note ? { note } : {}) });
  }

  async uncheck(userId: string, habitId: string, date: ISODate): Promise<void> {
    const habit = await this.habits.find(userId, habitId);
    if (habit?.archived) throw new ApiError('HABIT_ARCHIVED', '已归档习惯不能修改打卡', 400);
    const existing = await this.habits.findCheckIn(userId, habitId, date);
    if (!existing) return;
    if (existing.state === 'skip') return this.habits.deleteCheckIn(userId, habitId, date);
    const count = existing.count ?? 1;
    if (count > 1) await this.habits.updateCheckIn(userId, habitId, date, { count: count - 1 });
    else await this.habits.deleteCheckIn(userId, habitId, date);
  }

  async skipDay(userId: string, habitId: string, date: ISODate): Promise<HabitCheckIn> {
    const habit = await this.habits.find(userId, habitId);
    if (!habit) throw notFound();
    if (habit.archived) throw new ApiError('HABIT_ARCHIVED', '已归档习惯不能修改打卡', 400);
    const existing = await this.habits.findCheckIn(userId, habitId, date);
    if (existing?.state === 'skip') return existing;
    if (existing && (existing.count ?? 1) > 0) throw new ApiError('DAY_ALREADY_DONE', '今日已完成，无需休息', 400);
    if (existing) return this.habits.updateCheckIn(userId, habitId, date, { state: 'skip' });
    return this.habits.createCheckIn(userId, habitId, { date, count: 0, state: 'skip' });
  }

  async unskipDay(userId: string, habitId: string, date: ISODate): Promise<void> {
    // 仅清除「休息日」记录，避免误删当天的完成打卡（与 Mock 语义一致）
    const existing = await this.habits.findCheckIn(userId, habitId, date);
    if (existing?.state !== 'skip') return;
    await this.habits.deleteCheckIn(userId, habitId, date);
  }
}
