import type { FastifyInstance } from 'fastify';
import { clientToday, resolveToday } from '../lib/today';
import type { StatsService } from '../services/statsService';

export async function registerStatsRoutes(app: FastifyInstance, service: StatsService, timezone?: string) {
  app.get('/dashboard', { onRequest: [app.authenticate] }, async (request) => {
    const query = request.query as { today?: string };
    const today = resolveToday(query.today ?? clientToday(request), timezone);
    return service.dashboard(request.user.sub, today);
  });
}
