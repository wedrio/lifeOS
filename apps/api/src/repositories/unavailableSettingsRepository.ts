import type { Settings } from '@lifeos/shared';
import { ApiError } from '../lib/ApiError';
import type { SettingsRepository } from './settingsRepository';

const unavailable = () => new ApiError('PERSISTENCE_UNAVAILABLE', '数据库暂不可用，请稍后再试', 503);

export class UnavailableSettingsRepository implements SettingsRepository {
  async find(): Promise<Settings | null> { throw unavailable(); }
  async create(): Promise<Settings> { throw unavailable(); }
  async update(): Promise<Settings> { throw unavailable(); }
}
