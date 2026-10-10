import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65_535).default(3000),
  DATABASE_URL: z.string().min(1).default('postgresql://lifeos:lifeos_dev_password@localhost:5432/lifeos?schema=public'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET 至少需要 32 个字符').default('lifeos-development-secret-change-before-production'),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  APP_TIMEZONE: z.string().default('Asia/Shanghai'),
  // 桌面/手机端（Tauri WebView）与云域名跨站，SameSite=Lax 的 refresh cookie 不会被发送，
  // 因此生产环境需放长 access token 有效期（如 7d）以维持登录态
  ACCESS_TOKEN_TTL: z.string().regex(/^\d+[smhd]$/, '格式应为 15m / 30m / 7d 等').default('15m'),
});

export type AppConfig = {
  nodeEnv: 'development' | 'test' | 'production';
  port: number;
  databaseUrl: string;
  jwtSecret: string;
  corsOrigins: string[];
  timezone: string;
  accessTokenTtl: string;
};

export function loadConfig(environment = process.env): AppConfig {
  const parsed = envSchema.parse(environment);
  if (parsed.NODE_ENV === 'production' && parsed.JWT_SECRET === 'lifeos-development-secret-change-before-production') {
    throw new Error('生产环境必须配置安全的 JWT_SECRET');
  }
  return {
    nodeEnv: parsed.NODE_ENV,
    port: parsed.PORT,
    databaseUrl: parsed.DATABASE_URL,
    jwtSecret: parsed.JWT_SECRET,
    corsOrigins: parsed.CORS_ORIGIN.split(',').map((origin) => origin.trim()).filter(Boolean),
    timezone: parsed.APP_TIMEZONE,
    accessTokenTtl: parsed.ACCESS_TOKEN_TTL,
  };
}
