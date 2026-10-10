import type { Settings, SettingsInput } from '@lifeos/shared';
import { todayInTz } from '../lib/dates';
import type { SettingsRepository } from '../repositories/settingsRepository';

const CARDS_PER_MONTH = 2;

/** 用户设置服务：单例读写 + 补签卡按月发放（每月 2 张，跨月重置不累积）。 */
export class SettingsService {
  constructor(private readonly repository: SettingsRepository, private readonly timezone?: string) {}

  get(userId: string): Promise<Settings> {
    return this.ensureMonth(userId);
  }

  async update(userId: string, patch: Partial<SettingsInput>): Promise<Settings> {
    await this.ensureMonth(userId);
    return this.repository.update(userId, {
      ...(patch.currency !== undefined ? { currency: patch.currency } : {}),
      ...(patch.theme !== undefined ? { theme: patch.theme } : {}),
      ...(patch.weekStartsOn !== undefined ? { weekStartsOn: patch.weekStartsOn } : {}),
      ...(patch.autoRollOverIncompletePlans !== undefined ? { autoRollOverIncompletePlans: patch.autoRollOverIncompletePlans } : {}),
      ...(patch.annualReadingTarget !== undefined ? { annualReadingTarget: patch.annualReadingTarget } : {}),
      ...(patch.mealBudget !== undefined ? { mealBudget: patch.mealBudget } : {}),
    });
  }

  /** 确保设置存在且补签卡为本月额度；返回最新设置。 */
  async ensureMonth(userId: string): Promise<Settings> {
    const month = todayInTz(this.timezone).slice(0, 7);
    let settings = await this.repository.find(userId);
    if (!settings) settings = await this.repository.create(userId);
    if (settings.makeupCardMonth !== month) {
      settings = await this.repository.update(userId, { makeupCardMonth: month, makeupCardBalance: CARDS_PER_MONTH });
    }
    return settings;
  }

  async consumeMakeupCard(userId: string): Promise<Settings> {
    const settings = await this.ensureMonth(userId);
    return this.repository.update(userId, { makeupCardBalance: Math.max(0, settings.makeupCardBalance - 1) });
  }
}
