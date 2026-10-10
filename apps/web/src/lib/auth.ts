import type { AuthSession } from '@lifeos/shared';
import { ApiClientError, getAccessToken, publicRequest, setAccessToken } from './apiClient';

const EMAIL = import.meta.env.VITE_AUTO_LOGIN_EMAIL ?? 'owner@lifeos.dev';
const PASSWORD = import.meta.env.VITE_AUTO_LOGIN_PASSWORD ?? 'lifeos-dev-1234';

let loginPromise: Promise<void> | null = null;

async function doLogin(): Promise<void> {
  // 已有 token 时先验证，避免每次启动都重新登录
  if (getAccessToken()) {
    try {
      await publicRequest('/api/auth/me');
      return;
    } catch {
      setAccessToken(null);
    }
  }
  try {
    const session = await publicRequest<AuthSession>('/api/auth/login', { method: 'POST', body: JSON.stringify({ email: EMAIL, password: PASSWORD }) });
    setAccessToken(session.accessToken);
  } catch (error) {
    // 账号尚不存在 → 自动注册
    if (error instanceof ApiClientError && error.status === 401) {
      const session = await publicRequest<AuthSession>('/api/auth/register', { method: 'POST', body: JSON.stringify({ email: EMAIL, password: PASSWORD, name: 'Owner' }) });
      setAccessToken(session.accessToken);
      return;
    }
    throw error;
  }
}

/** 单账号自动登录（幂等，并发安全）。 */
export function ensureAuthenticated(): Promise<void> {
  loginPromise ??= doLogin().catch((error) => {
    loginPromise = null;
    throw error;
  });
  return loginPromise;
}
