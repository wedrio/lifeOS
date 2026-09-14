import type { Habit, HabitCheckIn, ISODate, PlanLevel } from '@lifeos/shared';

const DAY = 86_400_000;

export const today = (): ISODate => new Date().toISOString().slice(0, 10);
export const parseISODate = (value: string) => new Date(`${value}T12:00:00Z`);
export const toISODate = (value: Date): ISODate => value.toISOString().slice(0, 10);
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
  totalCheckIns: number;
  recent30Rate: number;
}

export function calculateHabitStats(habit: Habit, checkIns: HabitCheckIn[], reference = today()): HabitStats {
  const dates = new Set(checkIns.map((item) => item.date));
  let cursor = dates.has(reference) ? reference : addDays(reference, -1);
  let currentStreak = 0;
  while (dates.has(cursor)) { currentStreak += 1; cursor = addDays(cursor, -1); }

  const ordered = [...dates].sort();
  let longestStreak = 0;
  let running = 0;
  let previous: ISODate | undefined;
  ordered.forEach((date) => {
    running = previous && daysBetween(previous, date) === 1 ? running + 1 : 1;
    longestStreak = Math.max(longestStreak, running);
    previous = date;
  });

  const last30Start = addDays(reference, -29);
  const completeIn30 = checkIns.filter((item) => item.date >= last30Start && item.date <= reference).length;
  const expected = habit.frequency === 'daily' ? 30 : Math.ceil(30 / 7) * habit.timesPerPeriod;
  return { currentStreak, longestStreak, totalCheckIns: checkIns.length, recent30Rate: Math.min(100, Math.round(completeIn30 / Math.max(expected, 1) * 100)) };
}

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
