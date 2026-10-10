import type { ISODate } from '@lifeos/shared';
import { isISODate, todayInTz } from './dates';

/**
 * 解析「今天」：优先使用前端传来的 `X-Client-Today`（用户本地日期），
 * 否则回落到服务器配置时区的今天。避免云端 UTC 与用户本地日期错位。
 */
export function resolveToday(clientValue: unknown, timezone?: string): ISODate {
  if (isISODate(clientValue)) return clientValue;
  return todayInTz(timezone);
}

export function clientToday(request: { headers: Record<string, unknown> }): unknown {
  return request.headers['x-client-today'];
}
