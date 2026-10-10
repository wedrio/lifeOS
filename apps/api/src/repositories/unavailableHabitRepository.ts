import type { Habit, HabitCheckIn } from '@lifeos/shared';
import { ApiError } from '../lib/ApiError';
import type { HabitRepository } from './habitRepository';

const unavailable = () => new ApiError('PERSISTENCE_UNAVAILABLE', '数据库暂不可用，请稍后再试', 503);

/** Prisma Client 不可用时的降级实现：所有方法返回 503，保持健康检查在线。 */
export class UnavailableHabitRepository implements HabitRepository {
  async list(): Promise<Habit[]> { throw unavailable(); }
  async find(): Promise<Habit | null> { throw unavailable(); }
  async create(): Promise<Habit> { throw unavailable(); }
  async update(): Promise<Habit | null> { throw unavailable(); }
  async remove(): Promise<boolean> { throw unavailable(); }
  async listCheckIns(): Promise<HabitCheckIn[]> { throw unavailable(); }
  async findCheckIn(): Promise<HabitCheckIn | null> { throw unavailable(); }
  async createCheckIn(): Promise<HabitCheckIn> { throw unavailable(); }
  async updateCheckIn(): Promise<HabitCheckIn> { throw unavailable(); }
  async deleteCheckIn(): Promise<void> { throw unavailable(); }
}
