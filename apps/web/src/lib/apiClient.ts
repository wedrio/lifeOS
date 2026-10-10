import type { AuthSession } from '@lifeos/shared';
import { today } from './dates';

const BASE = import.meta.env.VITE_API_BASE_URL ?? '';

export class ApiClientError extends Error {
  constructor(public readonly code: string, message: string, public readonly status: number, public readonly details?: unknown) {
    super(message);
    this.name = 'ApiClientError';
  }
}

let accessToken: string | null = sessionStorage.getItem('lifeos:access') ?? null;
export const getAccessToken = () => accessToken;
export function setAccessToken(token: string | null) {
  accessToken = token;
  if (token) sessionStorage.setItem('lifeos:access', token);
  else sessionStorage.removeItem('lifeos:access');
}

/** 惰性触发自动登录（动态 import 打破与 auth 的循环依赖）。 */
let authReady: Promise<void> | null = null;
function ensureAuth(): Promise<void> {
  // 失败时复位，让下一次请求重试登录（否则 rejected promise 会永久卡死后续请求）
  authReady ??= import('./auth')
    .then((module) => module.ensureAuthenticated())
    .catch((error) => {
      authReady = null;
      throw error;
    });
  return authReady;
}

async function send(path: string, init: RequestInit): Promise<Response> {
  return fetch(`${BASE}${path}`, {
    ...init,
    credentials: 'include',
    headers: {
      // 仅在有 body 时声明 JSON，否则 Fastify 会因「空 body + json 头」报错
      ...(init.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      'X-Client-Today': today(),
      ...(init.headers ?? {}),
    },
  });
}

let refreshing: Promise<boolean> | null = null;
async function refreshOnce(): Promise<boolean> {
  refreshing ??= (async () => {
    try {
      const res = await fetch(`${BASE}/api/auth/refresh`, { method: 'POST', credentials: 'include' });
      if (!res.ok) return false;
      const session = (await res.json()) as AuthSession;
      setAccessToken(session.accessToken);
      return true;
    } catch {
      return false;
    } finally {
      refreshing = null;
    }
  })();
  return refreshing;
}

async function parse<T>(res: Response): Promise<T> {
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  const body = text ? (JSON.parse(text) as Record<string, unknown>) : null;
  if (!res.ok) {
    const error = (body ?? {}) as { code?: string; message?: string; details?: unknown };
    throw new ApiClientError(error.code ?? 'HTTP_ERROR', error.message ?? '请求失败', res.status, error.details);
  }
  return body as T;
}

/** 业务请求：自动确保已登录；遇 401 先尝试刷新一次再重放。 */
export async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  await ensureAuth();
  let res = await send(path, init);
  if (res.status === 401 && (await refreshOnce())) res = await send(path, init);
  return parse<T>(res);
}

/** 无需鉴权/自动登录的请求（登录、注册用）。 */
export async function publicRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    credentials: 'include',
    headers: { ...(init.body !== undefined ? { 'Content-Type': 'application/json' } : {}), ...(init.headers ?? {}) },
  });
  return parse<T>(res);
}
