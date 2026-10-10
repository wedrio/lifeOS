import type { PrismaClient, Prisma } from '@prisma/client';
import type { Settings } from '@lifeos/shared';
import type { SettingsRepository, SettingsWrite } from './settingsRepository';
import { mapSettings } from './mappers';

const toData = (data: SettingsWrite): Prisma.SettingsUpdateInput => ({
  ...(data.currency !== undefined ? { currency: data.currency } : {}),
  ...(data.theme !== undefined ? { theme: data.theme } : {}),
  ...(data.weekStartsOn !== undefined ? { weekStartsOn: data.weekStartsOn } : {}),
  ...(data.autoRollOverIncompletePlans !== undefined ? { autoRollOverIncompletePlans: data.autoRollOverIncompletePlans } : {}),
  ...(data.annualReadingTarget !== undefined ? { annualReadingTarget: data.annualReadingTarget } : {}),
  ...(data.mealBudget !== undefined ? { mealBudget: data.mealBudget as unknown as Prisma.InputJsonValue } : {}),
  ...(data.makeupCardBalance !== undefined ? { makeupCardBalance: data.makeupCardBalance } : {}),
  ...(data.makeupCardMonth !== undefined ? { makeupCardMonth: data.makeupCardMonth } : {}),
});

export class PrismaSettingsRepository implements SettingsRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async find(userId: string): Promise<Settings | null> {
    const row = await this.prisma.settings.findUnique({ where: { userId } });
    return row ? mapSettings(row) : null;
  }

  async create(userId: string): Promise<Settings> {
    return mapSettings(await this.prisma.settings.create({ data: { userId } }));
  }

  async update(userId: string, data: SettingsWrite): Promise<Settings> {
    return mapSettings(await this.prisma.settings.update({ where: { userId }, data: toData(data) }));
  }
}
