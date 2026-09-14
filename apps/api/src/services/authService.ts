import { createHash, randomBytes } from 'node:crypto';
import bcrypt from 'bcryptjs';
import type { AuthSession, AuthenticatedUser, LoginInput, RegisterInput } from '@lifeos/shared';
import { ApiError } from '../lib/ApiError';
import type { AuthRepository, AuthUser } from '../repositories/authRepository';

const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const tokenHash = (token: string) => createHash('sha256').update(token).digest('hex');
const publicUser = (user: AuthUser): AuthenticatedUser => ({ id: user.id, email: user.email, name: user.name, avatarUrl: user.avatarUrl });

export interface AuthServiceResult { session: AuthSession; refreshToken: string; }

export class AuthService {
  constructor(private readonly repository: AuthRepository, private readonly issueAccessToken: (user: AuthenticatedUser) => string) {}

  async register(input: RegisterInput): Promise<AuthServiceResult> {
    if (await this.repository.findUserByEmail(input.email)) throw new ApiError('EMAIL_TAKEN', '该邮箱已注册，请直接登录', 409);
    try {
      const user = await this.repository.createUser({ email: input.email, passwordHash: await bcrypt.hash(input.password, 12), name: input.name });
      return this.createSession(user);
    } catch (error) {
      if (isUniqueConstraint(error)) throw new ApiError('EMAIL_TAKEN', '该邮箱已注册，请直接登录', 409);
      throw error;
    }
  }

  async login(input: LoginInput): Promise<AuthServiceResult> {
    const user = await this.repository.findUserByEmail(input.email);
    if (!user || !(await bcrypt.compare(input.password, user.passwordHash))) throw new ApiError('INVALID_CREDENTIALS', '邮箱或密码错误', 401);
    return this.createSession(user);
  }

  async refresh(rawToken?: string): Promise<AuthServiceResult> {
    if (!rawToken) throw new ApiError('UNAUTHENTICATED', '登录已过期，请重新登录', 401);
    const current = await this.repository.findActiveRefreshToken(tokenHash(rawToken));
    if (!current) throw new ApiError('UNAUTHENTICATED', '登录已过期，请重新登录', 401);
    await this.repository.revokeRefreshToken(current.id);
    return this.createSession(current.user);
  }

  async logout(rawToken?: string): Promise<void> {
    if (rawToken) await this.repository.revokeRefreshTokenByHash(tokenHash(rawToken));
  }

  async me(userId: string): Promise<AuthenticatedUser> {
    const user = await this.repository.findUserById(userId);
    if (!user) throw new ApiError('UNAUTHENTICATED', '当前用户不存在', 401);
    return publicUser(user);
  }

  private async createSession(user: AuthUser): Promise<AuthServiceResult> {
    const publicProfile = publicUser(user);
    const refreshToken = randomBytes(48).toString('base64url');
    await this.repository.createRefreshToken({ userId: user.id, tokenHash: tokenHash(refreshToken), expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS) });
    return { session: { accessToken: this.issueAccessToken(publicProfile), user: publicProfile }, refreshToken };
  }
}

function isUniqueConstraint(error: unknown) {
  return Boolean(error && typeof error === 'object' && 'code' in error && (error as { code?: string }).code === 'P2002');
}
