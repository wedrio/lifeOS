import type { AuthenticatedUser } from '@lifeos/shared';

export interface AuthUser extends AuthenticatedUser {
  passwordHash: string;
}

export interface RefreshTokenWithUser {
  id: string;
  user: AuthUser;
}

/**
 * Persistence port for identity only. Services depend on this contract rather
 * than Prisma, so a test adapter or alternate database can be substituted.
 */
export interface AuthRepository {
  findUserByEmail(email: string): Promise<AuthUser | null>;
  findUserById(id: string): Promise<AuthUser | null>;
  createUser(input: { email: string; passwordHash: string; name?: string }): Promise<AuthUser>;
  createRefreshToken(input: { userId: string; tokenHash: string; expiresAt: Date }): Promise<void>;
  findActiveRefreshToken(tokenHash: string): Promise<RefreshTokenWithUser | null>;
  revokeRefreshToken(id: string): Promise<void>;
  revokeRefreshTokenByHash(tokenHash: string): Promise<void>;
}
