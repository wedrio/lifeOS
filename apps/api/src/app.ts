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
import type { HabitRepository } from './repositories/habitRepository';
import { PrismaHabitRepository } from './repositories/prismaHabitRepository';
import { UnavailableHabitRepository } from './repositories/unavailableHabitRepository';
import type { SettingsRepository } from './repositories/settingsRepository';
import { PrismaSettingsRepository } from './repositories/prismaSettingsRepository';
import { UnavailableSettingsRepository } from './repositories/unavailableSettingsRepository';
import type { StatsRepository } from './repositories/statsRepository';
import { PrismaStatsRepository } from './repositories/prismaStatsRepository';
import { UnavailableStatsRepository } from './repositories/unavailableStatsRepository';
import { registerAuthRoutes } from './routes/authRoutes';
import { registerHabitRoutes } from './routes/habitRoutes';
import { registerSettingsRoutes } from './routes/settingsRoutes';
import { registerStatsRoutes } from './routes/statsRoutes';
import { AuthService } from './services/authService';
import { HabitService } from './services/habitService';
import { SettingsService } from './services/settingsService';
import { StatsService } from './services/statsService';

export interface BuildAppOptions {
  config?: AppConfig;
  prisma?: PrismaClient;
  authRepository?: AuthRepository;
  habitRepository?: HabitRepository;
  settingsRepository?: SettingsRepository;
  statsRepository?: StatsRepository;
}

/** Creates the API shell; persistence is injected to keep routes/services independently testable. */
export async function buildApp(options: BuildAppOptions = {}): Promise<FastifyInstance> {
  const config = options.config ?? loadConfig();
  const app = Fastify({ logger: config.nodeEnv !== 'test' });
  let prisma = options.prisma;

  let authRepository = options.authRepository;
  let habitRepository = options.habitRepository;
  let settingsRepository = options.settingsRepository;
  let statsRepository = options.statsRepository;
  let persistenceReady = Boolean(authRepository || prisma);

  if (!authRepository) {
    try {
      prisma ??= new PrismaClient({ datasources: { db: { url: config.databaseUrl } } });
      authRepository = new PrismaAuthRepository(prisma);
      habitRepository ??= new PrismaHabitRepository(prisma);
      settingsRepository ??= new PrismaSettingsRepository(prisma);
      statsRepository ??= new PrismaStatsRepository(prisma);
      persistenceReady = true;
    } catch (error) {
      if (config.nodeEnv === 'production') throw error;
      app.log.warn('Prisma Client is unavailable. Health checks remain online; data routes will return 503 until prisma generate succeeds.');
      authRepository = new UnavailableAuthRepository();
    }
  }
  habitRepository ??= new UnavailableHabitRepository();
  settingsRepository ??= new UnavailableSettingsRepository();
  statsRepository ??= new UnavailableStatsRepository();

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

  const auth = new AuthService(authRepository, (user) => app.jwt.sign({ sub: user.id, email: user.email }, { expiresIn: config.accessTokenTtl }));
  const settingsService = new SettingsService(settingsRepository, config.timezone);
  const habitService = new HabitService(habitRepository, settingsService);
  const statsService = new StatsService(statsRepository);

  await app.register(async (instance) => registerAuthRoutes(instance, auth, config.nodeEnv === 'production'), { prefix: '/api/auth' });
  await app.register(async (instance) => registerHabitRoutes(instance, habitService, config.timezone), { prefix: '/api/habits' });
  await app.register(async (instance) => registerSettingsRoutes(instance, settingsService), { prefix: '/api/settings' });
  await app.register(async (instance) => registerStatsRoutes(instance, statsService, config.timezone), { prefix: '/api/stats' });

  app.addHook('onClose', async () => { if (prisma) await prisma.$disconnect(); });
  return app;
}
