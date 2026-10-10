import type { PrismaClient, Prisma } from '@prisma/client';
import type { Habit, HabitCheckIn, HabitInput, ISODate } from '@lifeos/shared';
import type { CheckInPatch, CheckInWrite, HabitRepository } from './habitRepository';
import { mapCheckIn, mapHabit } from './mappers';

function createData(userId: string, input: HabitInput): Prisma.HabitUncheckedCreateInput {
  return {
    userId,
    name: input.name,
    icon: input.icon,
    color: input.color,
    frequency: input.frequency,
    timesPerPeriod: input.timesPerPeriod,
    weekdays: input.weekdays ?? [],
    reminderTime: input.reminderTime ?? null,
    allowBackfillDays: input.allowBackfillDays,
    archived: input.archived ?? false,
  };
}

function patchData(patch: Partial<HabitInput>): Prisma.HabitUpdateManyMutationInput {
  const data: Prisma.HabitUpdateManyMutationInput = {};
  if (patch.name !== undefined) data.name = patch.name;
  if (patch.icon !== undefined) data.icon = patch.icon;
  if (patch.color !== undefined) data.color = patch.color;
  if (patch.frequency !== undefined) data.frequency = patch.frequency;
  if (patch.timesPerPeriod !== undefined) data.timesPerPeriod = patch.timesPerPeriod;
  if (patch.weekdays !== undefined) data.weekdays = patch.weekdays;
  if (patch.reminderTime !== undefined) data.reminderTime = patch.reminderTime ?? null;
  if (patch.allowBackfillDays !== undefined) data.allowBackfillDays = patch.allowBackfillDays;
  if (patch.archived !== undefined) data.archived = patch.archived;
  return data;
}

export class PrismaHabitRepository implements HabitRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async list(userId: string, includeArchived: boolean): Promise<Habit[]> {
    const rows = await this.prisma.habit.findMany({
      where: { userId, ...(includeArchived ? {} : { archived: false }) },
      orderBy: { createdAt: 'asc' },
    });
    return rows.map(mapHabit);
  }

  async find(userId: string, id: string): Promise<Habit | null> {
    const row = await this.prisma.habit.findFirst({ where: { id, userId } });
    return row ? mapHabit(row) : null;
  }

  async create(userId: string, input: HabitInput): Promise<Habit> {
    return mapHabit(await this.prisma.habit.create({ data: createData(userId, input) }));
  }

  async update(userId: string, id: string, patch: Partial<HabitInput>): Promise<Habit | null> {
    const result = await this.prisma.habit.updateMany({ where: { id, userId }, data: patchData(patch) });
    if (result.count === 0) return null;
    return this.find(userId, id);
  }

  async remove(userId: string, id: string): Promise<boolean> {
    const result = await this.prisma.habit.deleteMany({ where: { id, userId } });
    return result.count > 0;
  }

  async listCheckIns(userId: string, habitId: string, from: ISODate, to: ISODate): Promise<HabitCheckIn[]> {
    const rows = await this.prisma.habitCheckIn.findMany({
      where: { habitId, habit: { userId }, date: { gte: from, lte: to } },
      orderBy: { date: 'asc' },
    });
    return rows.map((row) => mapCheckIn(row, userId));
  }

  async findCheckIn(userId: string, habitId: string, date: ISODate): Promise<HabitCheckIn | null> {
    const row = await this.prisma.habitCheckIn.findFirst({ where: { habitId, date, habit: { userId } } });
    return row ? mapCheckIn(row, userId) : null;
  }

  async createCheckIn(userId: string, habitId: string, data: CheckInWrite): Promise<HabitCheckIn> {
    const row = await this.prisma.habitCheckIn.create({
      data: { habitId, date: data.date, count: data.count, state: data.state ?? null, note: data.note ?? null },
    });
    return mapCheckIn(row, userId);
  }

  async updateCheckIn(userId: string, habitId: string, date: ISODate, data: CheckInPatch): Promise<HabitCheckIn> {
    await this.prisma.habitCheckIn.updateMany({
      where: { habitId, date },
      data: {
        ...(data.count !== undefined ? { count: data.count } : {}),
        ...(data.state !== undefined ? { state: data.state } : {}),
        ...(data.note !== undefined ? { note: data.note } : {}),
      },
    });
    const row = await this.prisma.habitCheckIn.findFirstOrThrow({ where: { habitId, date, habit: { userId } } });
    return mapCheckIn(row, userId);
  }

  async deleteCheckIn(userId: string, habitId: string, date: ISODate): Promise<void> {
    await this.prisma.habitCheckIn.deleteMany({ where: { habitId, date, habit: { userId } } });
  }
}
