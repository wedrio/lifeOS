import { z } from 'zod';

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '日期格式应为 YYYY-MM-DD');
const money = z.number().int().nonnegative('金额不能为负数');

export const habitInputSchema = z.object({
  name: z.string().trim().min(1).max(80),
  icon: z.string().min(1).max(8),
  color: z.string().regex(/^#(?:[\dA-Fa-f]{3}){1,2}$/),
  frequency: z.enum(['daily', 'weekly', 'custom']),
  timesPerPeriod: z.number().int().min(1).max(365),
  weekdays: z.array(z.number().int().min(1).max(7)).max(7).optional(),
  reminderTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  allowBackfillDays: z.number().int().min(0).max(365),
  archived: z.boolean().optional(),
}).superRefine((value, ctx) => {
  if (value.frequency === 'custom' && (!value.weekdays || value.weekdays.length === 0)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['weekdays'], message: '请至少选择一个星期几' });
  }
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

export const bookInputSchema = z.object({
  title: z.string().trim().min(1, '请输入书名').max(200),
  author: z.string().trim().max(100).optional(),
  totalPages: z.number().int().positive('总页数必须大于 0'),
  currentPage: z.number().int().min(0).default(0),
  status: z.enum(['queue', 'reading', 'finished', 'abandoned']),
  category: z.string().trim().max(50).optional(),
  coverUrl: z.string().url('请输入有效的封面链接').optional().or(z.literal('')),
  coverTheme: z.string().max(30).optional(),
  rating: z.number().int().min(1).max(5).optional(),
  review: z.string().max(10000).optional(),
  takeaways: z.array(z.string().trim().min(1).max(500)).max(10).optional(),
  startDate: date.optional(),
  finishDate: date.optional(),
});

export const readingLogInputSchema = z.object({
  bookId: z.string().min(1),
  page: z.number().int().positive('读到的页码必须大于 0'),
  pagesRead: z.number().int().nonnegative(),
  note: z.string().trim().max(1000).optional(),
  date,
});

export const bookNoteInputSchema = z.object({
  bookId: z.string().min(1),
  pageNumber: z.number().int().positive().optional(),
  quote: z.string().trim().min(1, '请输入摘录内容').max(5000),
  thoughts: z.string().trim().max(5000).optional(),
  tags: z.array(z.string().trim().min(1).max(30)).max(20),
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
  kind: z.enum(['cash', 'credit']).optional(),
});

export const transactionInputSchema = z.object({
  type: z.enum(['expense', 'income', 'repayment']),
  amount: money.positive('金额必须大于 0'),
  categoryId: z.string().min(1).optional(),
  accountId: z.string().min(1),
  toAccountId: z.string().min(1).optional(),
  date,
  note: z.string().max(1000).optional(),
  tags: z.array(z.string().trim().min(1).max(30)).max(20),
}).superRefine((transaction, context) => {
  if (transaction.type === 'repayment') {
    if (!transaction.toAccountId) context.addIssue({ code: z.ZodIssueCode.custom, path: ['toAccountId'], message: '请选择还款的信用账户' });
    else if (transaction.toAccountId === transaction.accountId) context.addIssue({ code: z.ZodIssueCode.custom, path: ['toAccountId'], message: '付款账户与还款账户不能相同' });
  } else if (!transaction.categoryId) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['categoryId'], message: '请选择分类' });
  }
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
}).superRefine((asset, context) => {
  if (asset.kind !== 'subscription') return;
  if (asset.price === undefined) context.addIssue({ code: z.ZodIssueCode.custom, path: ['price'], message: '请填写订阅价格' });
  if (!asset.startDate) context.addIssue({ code: z.ZodIssueCode.custom, path: ['startDate'], message: '请填写订阅开始日期' });
  if (!asset.expireDate) context.addIssue({ code: z.ZodIssueCode.custom, path: ['expireDate'], message: '请填写订阅到期日期' });
});

export const momentInputSchema = z.object({
  content: z.string().trim().min(1).max(10000),
  imageUrls: z.array(z.string().url()).max(9),
  mood: z.string().max(16).optional(),
  weather: z.string().max(16).optional(),
  location: z.string().max(120).optional(),
  tags: z.array(z.string().trim().min(1).max(30)).max(20),
  links: z.array(z.object({ type: z.enum(['habit_checkin', 'transaction', 'asset', 'book', 'book_note']), id: z.string().min(1) })).max(30),
});

export const seedInputSchema = z.object({
  title: z.string().trim().min(1, '先给这棵草起个名字').max(120),
  url: z.string().url('请输入有效链接').optional().or(z.literal('')),
  kind: z.enum(['video', 'article', 'tool', 'tutorial']),
  note: z.string().trim().max(200).optional(),
  effort: z.enum(['m5', 'm15', 'm30', 'm60']),
  status: z.enum(['growing', 'pulled', 'abandoned']).optional(),
  settledAt: date.optional(),
});

export const settingsInputSchema = z.object({
  currency: z.string().trim().min(1).max(6),
  theme: z.enum(['light', 'dark', 'system']),
  weekStartsOn: z.union([z.literal(0), z.literal(1)]),
  autoRollOverIncompletePlans: z.boolean(),
  annualReadingTarget: z.number().int().min(1).max(500).default(12),
  mealBudget: z.object({ breakfast: money, lunch: money, dinner: money }).optional(),
});
