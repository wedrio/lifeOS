import { ApiError } from '../lib/ApiError';
import type { AuthRepository, AuthUser, RefreshTokenWithUser } from './authRepository';

/** Keeps the transport skeleton observable when Prisma Client has not been generated yet. */
export class UnavailableAuthRepository implements AuthRepository {
  private unavailable(): never {
    throw new ApiError('PERSISTENCE_UNAVAILABLE', '数据库客户端尚未就绪，请先执行 prisma generate 并配置 PostgreSQL', 503);
  }

  async findUserByEmail(): Promise<AuthUser | null> { return this.unavailable(); }
  async findUserById(): Promise<AuthUser | null> { return this.unavailable(); }
  async createUser(): Promise<AuthUser> { return this.unavailable(); }
  async createRefreshToken(): Promise<void> { return this.unavailable(); }
  async findActiveRefreshToken(): Promise<RefreshTokenWithUser | null> { return this.unavailable(); }
  async revokeRefreshToken(): Promise<void> { return this.unavailable(); }
  async revokeRefreshTokenByHash(): Promise<void> { return this.unavailable(); }
}
