import type { FastifyInstance, FastifyRequest } from 'fastify';
import type { ISODate } from '@lifeos/shared';
import { habitCheckInInputSchema, habitInputSchema, habitPatchSchema, habitSkipInputSchema } from '@lifeos/shared';
import { ApiError, validationError } from '../lib/ApiError';
import { isISODate } from '../lib/dates';
import { clientToday, resolveToday } from '../lib/today';
import type { HabitService } from '../services/habitService';

const dateOr = (value: unknown, fallback: string): ISODate => (isISODate(value) ? (value as ISODate) : (fallback as ISODate));

export async function registerHabitRoutes(app: FastifyInstance, service: HabitService, timezone?: string) {
  const guard = { onRequest: [app.authenticate] };
  const todayOf = (request: FastifyRequest) => resolveToday(clientToday(request), timezone);
  const idOf = (request: FastifyRequest) => (request.params as { id: string }).id;

  app.get('/', guard, async (request) => {
    const query = request.query as { includeArchived?: string };
    return service.list(request.user.sub, query.includeArchived === '1' || query.includeArchived === 'true');
  });

  app.post('/', guard, async (request, reply) => {
    const parsed = habitInputSchema.safeParse(request.body);
    if (!parsed.success) throw validationError(parsed.error.flatten());
    const habit = await service.create(request.user.sub, parsed.data);
    return reply.status(201).send(habit);
  });

  app.patch('/:id', guard, async (request) => {
    const parsed = habitPatchSchema.safeParse(request.body);
    if (!parsed.success) throw validationError(parsed.error.flatten());
    return service.update(request.user.sub, idOf(request), parsed.data);
  });

  app.delete('/:id', guard, async (request, reply) => {
    await service.remove(request.user.sub, idOf(request));
    return reply.status(204).send();
  });

  app.get('/:id/check-ins', guard, async (request) => {
    const query = request.query as { from?: string; to?: string };
    return service.listCheckIns(request.user.sub, idOf(request), dateOr(query.from, '1970-01-01'), dateOr(query.to, '9999-12-31'));
  });

  app.post('/:id/check-ins', guard, async (request, reply) => {
    const parsed = habitCheckInInputSchema.safeParse(request.body);
    if (!parsed.success) throw validationError(parsed.error.flatten());
    const result = await service.checkIn(request.user.sub, idOf(request), parsed.data.date, todayOf(request), parsed.data.note, parsed.data.useMakeupCard);
    return reply.status(201).send(result);
  });

  app.delete('/:id/check-ins/:date', guard, async (request, reply) => {
    const { date } = request.params as { date: string };
    if (!isISODate(date)) throw new ApiError('VALIDATION_ERROR', '日期格式应为 YYYY-MM-DD', 400);
    await service.uncheck(request.user.sub, idOf(request), date);
    return reply.status(204).send();
  });

  app.post('/:id/skip', guard, async (request) => {
    const parsed = habitSkipInputSchema.safeParse(request.body);
    if (!parsed.success) throw validationError(parsed.error.flatten());
    return service.skipDay(request.user.sub, idOf(request), parsed.data.date);
  });

  app.delete('/:id/skip/:date', guard, async (request, reply) => {
    const { date } = request.params as { date: string };
    if (!isISODate(date)) throw new ApiError('VALIDATION_ERROR', '日期格式应为 YYYY-MM-DD', 400);
    await service.unskipDay(request.user.sub, idOf(request), date);
    return reply.status(204).send();
  });
}
