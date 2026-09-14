import type { FastifyInstance } from 'fastify';
import { loginInputSchema, registerInputSchema } from '@lifeos/shared';
import { validationError } from '../lib/ApiError';
import type { AuthService } from '../services/authService';

const REFRESH_COOKIE = 'lifeos_refresh';
const REFRESH_MAX_AGE = 30 * 24 * 60 * 60;

export async function registerAuthRoutes(app: FastifyInstance, service: AuthService, secureCookie: boolean) {
  const cookieOptions = { httpOnly: true, secure: secureCookie, sameSite: 'lax' as const, path: '/api/auth', maxAge: REFRESH_MAX_AGE };

  app.post('/register', async (request, reply) => {
    const parsed = registerInputSchema.safeParse(request.body);
    if (!parsed.success) throw validationError(parsed.error.flatten());
    const result = await service.register(parsed.data);
    reply.setCookie(REFRESH_COOKIE, result.refreshToken, cookieOptions);
    return result.session;
  });

  app.post('/login', async (request, reply) => {
    const parsed = loginInputSchema.safeParse(request.body);
    if (!parsed.success) throw validationError(parsed.error.flatten());
    const result = await service.login(parsed.data);
    reply.setCookie(REFRESH_COOKIE, result.refreshToken, cookieOptions);
    return result.session;
  });

  app.post('/refresh', async (request, reply) => {
    const result = await service.refresh(request.cookies[REFRESH_COOKIE]);
    reply.setCookie(REFRESH_COOKIE, result.refreshToken, cookieOptions);
    return result.session;
  });

  app.post('/logout', async (request, reply) => {
    await service.logout(request.cookies[REFRESH_COOKIE]);
    reply.clearCookie(REFRESH_COOKIE, { path: '/api/auth' });
    return reply.status(204).send();
  });

  app.get('/me', { onRequest: [app.authenticate] }, async (request) => service.me(request.user.sub));
}
