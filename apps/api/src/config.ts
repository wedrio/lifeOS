import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65_535).default(3000),
  DATABASE_URL: z.string().min(1).default('postgresql://lifeos:lifeos_dev_password@localhost:5432/lifeos?schema=public'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET 至少需要 32 个字符').default('lifeos-development-secret-change-before-production'),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
});

export type AppConfig = {
  nodeEnv: 'development' | 'test' | 'production';
  port: number;
  databaseUrl: string;
  jwtSecret: string;
  corsOrigins: string[];
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
  };
}
