import type { FastifyInstance } from 'fastify';
import { settingsInputSchema } from '@lifeos/shared';
import { validationError } from '../lib/ApiError';
import type { SettingsService } from '../services/settingsService';

export async function registerSettingsRoutes(app: FastifyInstance, service: SettingsService) {
  const guard = { onRequest: [app.authenticate] };

  app.get('/', guard, async (request) => service.get(request.user.sub));

  app.patch('/', guard, async (request) => {
    const parsed = settingsInputSchema.partial().safeParse(request.body);
    if (!parsed.success) throw validationError(parsed.error.flatten());
    return service.update(request.user.sub, parsed.data);
  });
}
