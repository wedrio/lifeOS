import Fastify, { type FastifyInstance } from 'fastify';
import cookie from '@fastify/cookie';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import multipart from '@fastify/multipart';
import { PrismaClient } from '@prisma/client';
import { ApiError } from './lib/ApiError';
import { loadConfig, type AppConfig } from './config';
import type { AuthRepository } from './repositories/authRepository';
import { PrismaAuthRepository } from './repositories/prismaAuthRepository';
import { UnavailableAuthRepository } from './repositories/unavailableAuthRepository';
import { registerAuthRoutes } from './routes/authRoutes';
import { AuthService } from './services/authService';

export interface BuildAppOptions { config?: AppConfig; prisma?: PrismaClient; authRepository?: AuthRepository; }

/** Creates the API shell; persistence is injected to keep routes/services independently testable. */
export async function buildApp(options: BuildAppOptions = {}): Promise<FastifyInstance> {
  const config = options.config ?? loadConfig();
  const app = Fastify({ logger: config.nodeEnv !== 'test' });
  let prisma = options.prisma;
  let repository = options.authRepository;
  let persistenceReady = Boolean(repository || prisma);

  if (!repository) {
    try {
      prisma ??= new PrismaClient({ datasources: { db: { url: config.databaseUrl } } });
      repository = new PrismaAuthRepository(prisma);
      persistenceReady = true;
    } catch (error) {
      if (config.nodeEnv === 'production') throw error;
      app.log.warn('Prisma Client is unavailable. Health checks remain online; auth routes will return 503 until prisma generate succeeds.');
      repository = new UnavailableAuthRepository();
    }
  }

  await app.register(cors, {
    credentials: true,
    origin: (origin, callback) => {
      if (!origin || config.corsOrigins.includes(origin)) callback(null, true);
      else callback(new Error(`Origin ${origin} is not allowed`), false);
    },
  });
  await app.register(cookie);
  await app.register(jwt, { secret: config.jwtSecret });
  await app.register(multipart, { limits: { fileSize: 10 * 1024 * 1024, files: 9 } });

  app.decorate('authenticate', async (request) => {
    try { await request.jwtVerify(); }
    catch { throw new ApiError('UNAUTHENTICATED', '请先登录后再继续', 401); }
  });

  app.setErrorHandler((error, request, reply) => {
    if (error instanceof ApiError) return reply.status(error.statusCode).send({ code: error.code, message: error.message, ...(error.details === undefined ? {} : { details: error.details }) });
    request.log.error(error);
    return reply.status(500).send({ code: 'INTERNAL_ERROR', message: '服务器暂时无法处理请求' });
  });

  const health = () => ({ status: 'ok', service: 'lifeos-api', persistence: persistenceReady ? 'configured' : 'pending_prisma_generate' });
  app.get('/', async () => health());
  app.get('/health', async () => health());
  app.get('/api/health', async () => health());

  const auth = new AuthService(repository, (user) => app.jwt.sign({ sub: user.id, email: user.email }, { expiresIn: '15m' }));
  await app.register(async (instance) => registerAuthRoutes(instance, auth, config.nodeEnv === 'production'), { prefix: '/api/auth' });

  app.addHook('onClose', async () => { if (prisma) await prisma.$disconnect(); });
  return app;
}
