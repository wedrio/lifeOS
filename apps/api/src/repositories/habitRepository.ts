import type { Habit, HabitCheckIn, HabitInput, ISODate } from '@lifeos/shared';

export interface CheckInWrite {
  date: ISODate;
  count: number;
  state?: 'skip' | null;
  note?: string;
}
export interface CheckInPatch {
  count?: number;
  state?: 'skip' | null;
  note?: string;
}

/** 习惯与打卡的持久化端口（services 依赖此契约，不直接依赖 Prisma）。 */
export interface HabitRepository {
  list(userId: string, includeArchived: boolean): Promise<Habit[]>;
  find(userId: string, id: string): Promise<Habit | null>;
  create(userId: string, input: HabitInput): Promise<Habit>;
  update(userId: string, id: string, patch: Partial<HabitInput>): Promise<Habit | null>;
  remove(userId: string, id: string): Promise<boolean>;
  listCheckIns(userId: string, habitId: string, from: ISODate, to: ISODate): Promise<HabitCheckIn[]>;
  findCheckIn(userId: string, habitId: string, date: ISODate): Promise<HabitCheckIn | null>;
  createCheckIn(userId: string, habitId: string, data: CheckInWrite): Promise<HabitCheckIn>;
  updateCheckIn(userId: string, habitId: string, date: ISODate, data: CheckInPatch): Promise<HabitCheckIn>;
  deleteCheckIn(userId: string, habitId: string, date: ISODate): Promise<void>;
}
