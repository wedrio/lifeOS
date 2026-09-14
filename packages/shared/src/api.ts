import { z } from 'zod';

/** Shared HTTP-envelope contract. Every API error follows this shape. */
export const apiErrorSchema = z.object({
  code: z.string().min(1),
  message: z.string().min(1),
  details: z.unknown().optional(),
});
export type ApiError = z.infer<typeof apiErrorSchema>;

export const emailSchema = z.string().trim().toLowerCase().email('请输入有效的邮箱地址').max(254);
export const passwordSchema = z.string().min(8, '密码至少需要 8 位').max(128, '密码不能超过 128 位');

export const registerInputSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  name: z.string().trim().min(1).max(80).optional(),
});
export const loginInputSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});
export type RegisterInput = z.infer<typeof registerInputSchema>;
export type LoginInput = z.infer<typeof loginInputSchema>;

export const authenticatedUserSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  name: z.string().nullable(),
  avatarUrl: z.string().url().nullable(),
});
export const authSessionSchema = z.object({
  accessToken: z.string().min(1),
  user: authenticatedUserSchema,
});
export type AuthenticatedUser = z.infer<typeof authenticatedUserSchema>;
export type AuthSession = z.infer<typeof authSessionSchema>;
