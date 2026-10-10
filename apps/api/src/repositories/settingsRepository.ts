import type { MealBudget, Settings } from '@lifeos/shared';

export interface SettingsWrite {
  currency?: string;
  theme?: string;
  weekStartsOn?: number;
  autoRollOverIncompletePlans?: boolean;
  annualReadingTarget?: number;
  mealBudget?: MealBudget;
  makeupCardBalance?: number;
  makeupCardMonth?: string;
}

/** 用户设置（单例）持久化端口。 */
export interface SettingsRepository {
  find(userId: string): Promise<Settings | null>;
  create(userId: string): Promise<Settings>;
  update(userId: string, data: SettingsWrite): Promise<Settings>;
}
