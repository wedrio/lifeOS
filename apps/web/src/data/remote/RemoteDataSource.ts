import type {
  DashboardStats, DataSource, Habit, HabitCheckIn, HabitInput, ISODate, Settings, SettingsInput,
} from '@lifeos/shared';
import { apiRequest } from '../../lib/apiClient';

/**
 * 远程数据源（渐进迁移）：已迁移的仓储（habits / settings / stats.dashboard）走 HTTP，
 * 其余仓储整体委托给传入的 fallback（本地 Mock），因此页面无需任何改动。
 * 后续每迁移一个仓储，只需把对应槽位改为远程实现。
 */
export class RemoteDataSource implements DataSource {
  constructor(private readonly fallback: DataSource) {}

  habits = {
    list: (includeArchived = false) => apiRequest<Habit[]>(`/api/habits${includeArchived ? '?includeArchived=1' : ''}`),
    create: (input: HabitInput) => apiRequest<Habit>('/api/habits', { method: 'POST', body: JSON.stringify(input) }),
    update: (id: string, patch: Partial<HabitInput>) => apiRequest<Habit>(`/api/habits/${id}`, { method: 'PATCH', body: JSON.stringify(patch) }),
    remove: (id: string) => apiRequest<void>(`/api/habits/${id}`, { method: 'DELETE' }),
    checkIn: (habitId: string, date: ISODate, note?: string, options?: { useMakeupCard?: boolean }) =>
      apiRequest<HabitCheckIn>(`/api/habits/${habitId}/check-ins`, { method: 'POST', body: JSON.stringify({ date, note, useMakeupCard: options?.useMakeupCard }) }),
    uncheck: (habitId: string, date: ISODate) => apiRequest<void>(`/api/habits/${habitId}/check-ins/${date}`, { method: 'DELETE' }),
    skipDay: (habitId: string, date: ISODate) => apiRequest<HabitCheckIn>(`/api/habits/${habitId}/skip`, { method: 'POST', body: JSON.stringify({ date }) }),
    unskipDay: (habitId: string, date: ISODate) => apiRequest<void>(`/api/habits/${habitId}/skip/${date}`, { method: 'DELETE' }),
    listCheckIns: (habitId: string, from: ISODate, to: ISODate) => apiRequest<HabitCheckIn[]>(`/api/habits/${habitId}/check-ins?from=${from}&to=${to}`),
  };

  settings = {
    get: () => apiRequest<Settings>('/api/settings'),
    update: (patch: Partial<SettingsInput>) => apiRequest<Settings>('/api/settings', { method: 'PATCH', body: JSON.stringify(patch) }),
  };

  stats = {
    dashboard: (today?: ISODate) => apiRequest<DashboardStats>(`/api/stats/dashboard${today ? `?today=${today}` : ''}`),
    finance: (month?: string) => this.fallback.stats.finance(month),
    reading: (year?: number) => this.fallback.stats.reading(year),
  };

  // 未迁移仓储：getter 惰性委托。
  // ⚠️ 不能写成类字段 `plans = this.fallback.plans` —— 原生 class fields 语义下
  // 字段初始化器先于 constructor body 执行，此时 this.fallback 还是 undefined（白屏根源）。
  get plans() { return this.fallback.plans; }
  get books() { return this.fallback.books; }
  get finance() { return this.fallback.finance; }
  get assets() { return this.fallback.assets; }
  get moments() { return this.fallback.moments; }
  get seeds() { return this.fallback.seeds; }
  get backup() { return this.fallback.backup; }
}
