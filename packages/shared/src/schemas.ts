import { z } from 'zod';

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '日期格式应为 YYYY-MM-DD');
const money = z.number().int().nonnegative('金额不能为负数');

export const habitInputSchema = z.object({
  name: z.string().trim().min(1).max(80),
  icon: z.string().min(1).max(8),
  color: z.string().regex(/^#(?:[\dA-Fa-f]{3}){1,2}$/),
  frequency: z.enum(['daily', 'weekly', 'custom']),
  timesPerPeriod: z.number().int().min(1).max(365),
  reminderTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  allowBackfillDays: z.number().int().min(0).max(365),
  archived: z.boolean().optional(),
});

export const planInputSchema = z.object({
  title: z.string().trim().min(1).max(160),
  description: z.string().max(5000).optional(),
  level: z.enum(['year', 'month', 'week', 'day']),
  period: z.string().min(4).max(12),
  parentId: z.string().min(1).optional(),
  status: z.enum(['not_started', 'in_progress', 'completed', 'cancelled']),
  progress: z.number().int().min(0).max(100),
  priority: z.enum(['low', 'medium', 'high']),
  order: z.number().int().min(0).optional(),
});

export const categoryInputSchema = z.object({
  name: z.string().trim().min(1).max(40),
  icon: z.string().min(1).max(8),
  color: z.string().regex(/^#(?:[\dA-Fa-f]{3}){1,2}$/),
  type: z.enum(['expense', 'income']),
  parentId: z.string().min(1).optional(),
  isSystem: z.boolean().optional(),
});

export const accountInputSchema = z.object({
  name: z.string().trim().min(1).max(60),
  icon: z.string().min(1).max(8),
  initialBalance: money,
  archived: z.boolean(),
});

export const transactionInputSchema = z.object({
  type: z.enum(['expense', 'income']),
  amount: money.positive('金额必须大于 0'),
  categoryId: z.string().min(1),
  accountId: z.string().min(1),
  date,
  note: z.string().max(1000).optional(),
  tags: z.array(z.string().trim().min(1).max(30)).max(20),
});

export const budgetInputSchema = z.object({
  period: z.string().regex(/^\d{4}-\d{2}$/),
  total: money,
  byCategory: z.record(money),
});

export const assetInputSchema = z.object({
  kind: z.enum(['physical', 'subscription']),
  name: z.string().trim().min(1).max(120),
  icon: z.string().min(1).max(8),
  category: z.string().trim().min(1).max(40),
  brand: z.string().max(80).optional(),
  model: z.string().max(120).optional(),
  serialNo: z.string().max(160).optional(),
  purchaseDate: date.optional(),
  purchasePrice: money.optional(),
  warrantyUntil: date.optional(),
  estimatedValue: money.optional(),
  status: z.enum(['in_use', 'idle', 'sold']).optional(),
  price: money.optional(),
  billingCycle: z.enum(['monthly', 'quarterly', 'yearly']).optional(),
  startDate: date.optional(),
  expireDate: date.optional(),
  autoRenew: z.boolean().optional(),
  accountNote: z.string().max(500).optional(),
});

export const momentInputSchema = z.object({
  content: z.string().trim().min(1).max(10000),
  imageUrls: z.array(z.string().url()).max(9),
  mood: z.string().max(16).optional(),
  weather: z.string().max(16).optional(),
  location: z.string().max(120).optional(),
  tags: z.array(z.string().trim().min(1).max(30)).max(20),
  links: z.array(z.object({ type: z.enum(['habit_checkin', 'transaction', 'asset']), id: z.string().min(1) })).max(30),
});

export const settingsInputSchema = z.object({
  currency: z.string().trim().min(1).max(6),
  theme: z.enum(['light', 'dark', 'system']),
  weekStartsOn: z.union([z.literal(0), z.literal(1)]),
});
