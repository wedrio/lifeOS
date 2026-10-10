import type { Habit, ISODate } from '@lifeos/shared';

const DAY = 86_400_000;

const pad = (value: number) => String(value).padStart(2, '0');
const toISODateUTC = (value: Date): ISODate => `${value.getUTCFullYear()}-${pad(value.getUTCMonth() + 1)}-${pad(value.getUTCDate())}`;

/** 指定时区（IANA 名，缺省用服务器本地时区）的今天，格式 YYYY-MM-DD */
export function todayInTz(timeZone?: string): ISODate {
  const now = new Date();
  if (!timeZone) return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}

/** 以正午 UTC 锚点解析，仅用于日期差/加减，不承载时区语义 */
export const parseISODate = (value: string) => new Date(`${value}T12:00:00Z`);
export const addDays = (value: ISODate, amount: number): ISODate => toISODateUTC(new Date(parseISODate(value).getTime() + amount * DAY));
export const daysBetween = (from: ISODate, to: ISODate) => Math.round((parseISODate(to).getTime() - parseISODate(from).getTime()) / DAY);
/** ISO 星期几：1=周一 … 7=周日 */
export const isoWeekday = (value: ISODate): number => parseISODate(value).getUTCDay() || 7;
export const startOfWeek = (value: ISODate): ISODate => addDays(value, 1 - isoWeekday(value));
export const isoWeekPeriod = (value: ISODate): string => {
  const date = parseISODate(value);
  const weekday = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - weekday);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((date.getTime() - yearStart.getTime()) / DAY + 1) / 7);
  return `${date.getUTCFullYear()}-W${pad(week)}`;
};
export const isISODate = (value: unknown): value is ISODate => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);

/** 该习惯在 date 这天是否需要打卡（调度日）；daily/weekly 每天都需要 */
export function isHabitDue(habit: Pick<Habit, 'frequency' | 'weekdays'>, date: ISODate): boolean {
  if (habit.frequency === 'custom') return (habit.weekdays ?? []).includes(isoWeekday(date));
  return true;
}
