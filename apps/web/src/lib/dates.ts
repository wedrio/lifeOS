import type { Habit, HabitCheckIn, ISODate, PlanLevel } from '@lifeos/shared';

const DAY = 86_400_000;

/** 按用户本地时区格式化为 YYYY-MM-DD（禁止 UTC 截断，见 docs/01 §2.1.1 时区约定） */
export const toISODate = (value: Date): ISODate => {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};
export const today = (): ISODate => toISODate(new Date());
/** 以正午锚点解析日期，仅用于日期差等比较，不承载时区语义 */
export const parseISODate = (value: string) => new Date(`${value}T12:00:00Z`);
export const addDays = (value: ISODate, amount: number): ISODate => toISODate(new Date(parseISODate(value).getTime() + amount * DAY));
export const daysBetween = (from: ISODate, to: ISODate) => Math.round((parseISODate(to).getTime() - parseISODate(from).getTime()) / DAY);

export const startOfWeek = (value: ISODate): ISODate => {
  const date = parseISODate(value);
  const weekday = date.getUTCDay() || 7;
  return addDays(value, 1 - weekday);
};

export const isoWeekPeriod = (value: ISODate): string => {
  const date = parseISODate(value);
  const weekday = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - weekday);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((date.getTime() - yearStart.getTime()) / DAY) + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
};

const dateFromISOWeek = (period: string): ISODate => {
  const match = /^(\d{4})-W(\d{2})$/.exec(period);
  if (!match) return today();
  const year = Number(match[1]);
  const week = Number(match[2]);
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const jan4Weekday = jan4.getUTCDay() || 7;
  const firstMonday = new Date(jan4.getTime() - (jan4Weekday - 1) * DAY);
  return toISODate(new Date(firstMonday.getTime() + (week - 1) * 7 * DAY));
};

export const defaultPeriod = (level: PlanLevel): string => {
  const date = today();
  if (level === 'year') return date.slice(0, 4);
  if (level === 'month') return date.slice(0, 7);
  if (level === 'week') return isoWeekPeriod(date);
  return date;
};

export const periodInputType = (level: PlanLevel) => ({ year: 'number', month: 'month', week: 'week', day: 'date' }[level]);

export const shiftPlanPeriod = (level: PlanLevel, period: string, amount: number): string => {
  if (level === 'year') return String(Number(period) + amount);
  if (level === 'month') {
    const [year, month] = period.split('-').map(Number);
    const date = new Date(Date.UTC(year, month - 1 + amount, 1));
    return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
  }
  if (level === 'week') return isoWeekPeriod(addDays(dateFromISOWeek(period), amount * 7));
  return addDays(period, amount);
};

export const periodLabel = (level: PlanLevel, period: string) => {
  if (level === 'year') return `${period} 年`;
  if (level === 'month') return `${period.replace('-', ' 年 ')} 月`;
  if (level === 'week') return `${period.replace('-W', ' 年第 ')} 周`;
  const date = parseISODate(period);
  return date.toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'long', timeZone: 'UTC' });
};

export interface HabitStats {
  currentStreak: number;
  longestStreak: number;
  streakUnit: 'day' | 'week';
  totalCheckIns: number;
  recent30Rate: number;
}

/** ISO 星期几：1=周一 … 7=周日 */
export const isoWeekday = (value: ISODate): number => parseISODate(value).getUTCDay() || 7;

/** 该习惯在 date 这天是否需要打卡（调度日） */
export function isHabitDue(habit: Pick<Habit, 'frequency' | 'weekdays'>, date: ISODate): boolean {
  if (habit.frequency === 'custom') return (habit.weekdays ?? []).includes(isoWeekday(date));
  return true; // daily / weekly（弹性）每天都出现在今日列表
}

export const WEEKDAY_OPTIONS = [
  { label: '一', value: 1 }, { label: '二', value: 2 }, { label: '三', value: 3 }, { label: '四', value: 4 },
  { label: '五', value: 5 }, { label: '六', value: 6 }, { label: '日', value: 7 },
];

export const habitWeekdayLabel = (habit: Pick<Habit, 'frequency' | 'weekdays'>): string => {
  if (habit.frequency !== 'custom') return '';
  const map = ['一', '二', '三', '四', '五', '六', '日'];
  return (habit.weekdays ?? []).slice().sort().map((day) => `周${map[day - 1]}`).join('、') || '未选择星期';
};

/** habit 今天的打卡记录（含次数） */
const doneCountByDate = (checkIns: HabitCheckIn[]) => {
  const map = new Map<ISODate, number>();
  checkIns.forEach((item) => map.set(item.date, item.count ?? 1));
  return map;
};

/** 一周（周一为起点）内的完成次数 */
const weekDoneCount = (done: Map<ISODate, number>, weekStart: ISODate): number => {
  let sum = 0;
  for (let index = 0; index < 7; index += 1) sum += done.get(addDays(weekStart, index)) ?? 0;
  return sum;
};

/** 最近 30 天（含 reference）内的期望完成次数，按频率精确计算 */
export function habitExpectedCount(habit: Habit, reference: ISODate): number {
  if (habit.frequency === 'daily') return 30 * habit.timesPerPeriod;
  if (habit.frequency === 'weekly') return Math.round((30 / 7) * habit.timesPerPeriod);
  let scheduled = 0;
  for (let index = 0; index < 30; index += 1) if (isHabitDue(habit, addDays(reference, -index))) scheduled += 1;
  return scheduled;
}

export function calculateHabitStats(habit: Habit, checkIns: HabitCheckIn[], reference = today()): HabitStats {
  const done = doneCountByDate(checkIns);
  const isDone = (date: ISODate) => (done.get(date) ?? 0) > 0;
  const totalCheckIns = [...done.values()].reduce((sum, count) => sum + count, 0);

  if (habit.frequency === 'weekly') {
    // 按「达标周」连续：一周内完成次数 ≥ timesPerPeriod 即达标，中断周才清零
    const qualifies = (weekStart: ISODate) => weekDoneCount(done, weekStart) >= habit.timesPerPeriod;
    const thisWeek = startOfWeek(reference);
    const firstWeek = startOfWeek(checkIns.reduce<ISODate>((min, item) => (item.date < min ? item.date : min), reference));
    let longest = 0;
    let running = 0;
    for (let cursor = firstWeek; cursor <= thisWeek; cursor = addDays(cursor, 7)) {
      running = qualifies(cursor) ? running + 1 : 0;
      longest = Math.max(longest, running);
    }
    let current = 0;
    let cursor = qualifies(thisWeek) ? thisWeek : addDays(thisWeek, -7);
    while (cursor >= firstWeek && qualifies(cursor)) { current += 1; cursor = addDays(cursor, -7); }
    const last30Start = addDays(reference, -29);
    const completeIn30 = checkIns.filter((item) => item.date >= last30Start && item.date <= reference).reduce((sum, item) => sum + (item.count ?? 1), 0);
    return { currentStreak: current, longestStreak: longest, streakUnit: 'week', totalCheckIns, recent30Rate: Math.min(100, Math.round((completeIn30 / Math.max(habitExpectedCount(habit, reference), 1)) * 100)) };
  }

  if (habit.frequency === 'custom') {
    // 仅统计调度日：非调度日跳过且不断签
    const scheduledDone = (date: ISODate) => isHabitDue(habit, date) && isDone(date);
    // 从今天往回找：最近的调度日若已完成则从它起算，否则从上一个调度日起算
    let anchor = reference;
    if (isHabitDue(habit, anchor) && !scheduledDone(anchor)) anchor = addDays(anchor, -1);
    while (!isHabitDue(habit, anchor)) anchor = addDays(anchor, -1);
    let currentStreak = 0;
    let scan = anchor;
    while (isHabitDue(habit, scan)) {
      if (!scheduledDone(scan)) break;
      currentStreak += 1;
      do { scan = addDays(scan, -1); } while (!isHabitDue(habit, scan));
    }
    let longestStreak = 0;
    let running = 0;
    let previous: ISODate | undefined;
    [...done.keys()].sort().forEach((date) => {
      if (!isHabitDue(habit, date)) return;
      const consecutive = previous === undefined || (() => {
        let cursor = previous as ISODate;
        do { cursor = addDays(cursor, 1); } while (!isHabitDue(habit, cursor));
        return cursor === date;
      })();
      running = consecutive ? running + 1 : 1;
      longestStreak = Math.max(longestStreak, running);
      previous = date;
    });
    const last30Start = addDays(reference, -29);
    const completeIn30 = checkIns.filter((item) => item.date >= last30Start && item.date <= reference).reduce((sum, item) => sum + (item.count ?? 1), 0);
    return { currentStreak, longestStreak, streakUnit: 'day', totalCheckIns, recent30Rate: Math.min(100, Math.round((completeIn30 / Math.max(habitExpectedCount(habit, reference), 1)) * 100)) };
  }

  // daily：按自然日连续
  let cursor = isDone(reference) ? reference : addDays(reference, -1);
  let currentStreak = 0;
  while (isDone(cursor)) { currentStreak += 1; cursor = addDays(cursor, -1); }

  const ordered = [...done.keys()].sort();
  let longestStreak = 0;
  let running = 0;
  let previous: ISODate | undefined;
  ordered.forEach((date) => {
    running = previous && daysBetween(previous, date) === 1 ? running + 1 : 1;
    longestStreak = Math.max(longestStreak, running);
    previous = date;
  });

  const last30Start = addDays(reference, -29);
  const completeIn30 = checkIns.filter((item) => item.date >= last30Start && item.date <= reference).reduce((sum, item) => sum + (item.count ?? 1), 0);
  return { currentStreak, longestStreak, streakUnit: 'day', totalCheckIns, recent30Rate: Math.min(100, Math.round((completeIn30 / Math.max(habitExpectedCount(habit, reference), 1)) * 100)) };
}

/** 本周（截至今日）已完成次数，用于 weekly 弹性目标展示「本周还需 N 次」 */
export const habitWeekProgress = (habit: Habit, checkIns: HabitCheckIn[], reference = today()): { done: number; target: number } => {
  if (habit.frequency !== 'weekly') {
    const todayCount = (checkIns.find((item) => item.date === reference)?.count ?? 0);
    return { done: todayCount, target: habit.timesPerPeriod };
  }
  const done = doneCountByDate(checkIns);
  return { done: weekDoneCount(done, startOfWeek(reference)), target: habit.timesPerPeriod };
};

export interface HeatmapDay { date: ISODate; inRange: boolean; checked: boolean; }
export function buildHeatmap(reference = today(), count = 365): HeatmapDay[][] {
  const first = addDays(reference, -(count - 1));
  const gridStart = startOfWeek(first);
  const totalDays = daysBetween(gridStart, reference) + 1;
  return Array.from({ length: Math.ceil(totalDays / 7) }, (_, week) => Array.from({ length: 7 }, (_, day) => {
    const date = addDays(gridStart, week * 7 + day);
    return { date, inRange: date >= first && date <= reference, checked: false };
  }));
}
