import { ApiError } from '../lib/ApiError';
import type { DashboardSnapshot, StatsRepository } from './statsRepository';

export class UnavailableStatsRepository implements StatsRepository {
  async loadDashboard(): Promise<DashboardSnapshot> {
    throw new ApiError('PERSISTENCE_UNAVAILABLE', '数据库暂不可用，请稍后再试', 503);
  }
}
