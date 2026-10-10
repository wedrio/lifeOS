/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** 'mock'（默认，本地 localStorage）或 'remote'（走 Fastify API + PostgreSQL） */
  readonly VITE_DATA_SOURCE?: 'mock' | 'remote';
  /** API 基地址；留空则使用相对路径 /api（开发经 Vite proxy） */
  readonly VITE_API_BASE_URL?: string;
  /** 单账号自动登录的账号 */
  readonly VITE_AUTO_LOGIN_EMAIL?: string;
  readonly VITE_AUTO_LOGIN_PASSWORD?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
