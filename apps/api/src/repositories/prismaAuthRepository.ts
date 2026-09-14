import type { PrismaClient } from '@prisma/client';
import type { AuthRepository, AuthUser, RefreshTokenWithUser } from './authRepository';

const toAuthUser = (user: { id: string; email: string; passwordHash: string; name: string | null; avatarUrl: string | null }): AuthUser => ({ id: user.id, email: user.email, passwordHash: user.passwordHash, name: user.name, avatarUrl: user.avatarUrl });

export class PrismaAuthRepository implements AuthRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findUserByEmail(email: string): Promise<AuthUser | null> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    return user ? toAuthUser(user) : null;
  }

  async findUserById(id: string): Promise<AuthUser | null> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    return user ? toAuthUser(user) : null;
  }

  async createUser(input: { email: string; passwordHash: string; name?: string }): Promise<AuthUser> {
    const user = await this.prisma.user.create({ data: input });
    return toAuthUser(user);
  }

  async createRefreshToken(input: { userId: string; tokenHash: string; expiresAt: Date }): Promise<void> {
    await this.prisma.refreshToken.create({ data: input });
  }

  async findActiveRefreshToken(tokenHash: string): Promise<RefreshTokenWithUser | null> {
    const record = await this.prisma.refreshToken.findFirst({
      where: { tokenHash, revokedAt: null, expiresAt: { gt: new Date() } },
      include: { user: true },
    });
    return record ? { id: record.id, user: toAuthUser(record.user) } : null;
  }

  async revokeRefreshToken(id: string): Promise<void> {
    await this.prisma.refreshToken.update({ where: { id }, data: { revokedAt: new Date() } });
  }

  async revokeRefreshTokenByHash(tokenHash: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({ where: { tokenHash, revokedAt: null }, data: { revokedAt: new Date() } });
  }
}
