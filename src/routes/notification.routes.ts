import { Hono } from 'hono';
import { notificationService } from '@/src/services/notification.service';
import { listNotificationsQuerySchema } from '@/src/schemas/notification.schema';
import { getAuthUser, requireAuth } from '@/src/middleware/auth';
import { AppError } from '@/src/middleware';
import { listResponse, successResponse } from '@/src/utils/response';

const notificationRoutes = new Hono();

function getRequiredParam(value: string | undefined, name: string): string {
  if (!value) {
    throw new AppError(`Missing path parameter: ${name}`, 400, 'MISSING_PATH_PARAM');
  }
  return value;
}

notificationRoutes.get('/', requireAuth, async (c) => {
  const parsed = listNotificationsQuerySchema.parse({
    unread_only: c.req.query('unread_only'),
    page: c.req.query('page'),
    limit: c.req.query('limit'),
  });
  const user = getAuthUser(c);
  const result = await notificationService.listNotifications(user.id, parsed);

  return c.json(
    listResponse(result.notifications, {
      total: result.total,
      page: result.page,
      limit: result.limit,
    })
  );
});

notificationRoutes.patch('/:id/read', requireAuth, async (c) => {
  const user = getAuthUser(c);
  const result = await notificationService.markRead(
    getRequiredParam(c.req.param('id'), 'id'),
    user.id
  );
  return c.json(successResponse(result));
});

export default notificationRoutes;
