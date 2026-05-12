import { Hono } from 'hono';
import { notificationService } from '@/src/services/notification.service';
import {
  listNotificationsQuerySchema,
  unreadCountQuerySchema,
} from '@/src/schemas/notification.schema';
import { getAuthUser, requireRole } from '@/src/middleware/auth';
import { AppError } from '@/src/middleware';
import { listResponse, successResponse } from '@/src/utils/response';

const notificationRoutes = new Hono();

function getRequiredParam(value: string | undefined, name: string): string {
  if (!value) {
    throw new AppError(`Missing path parameter: ${name}`, 400, 'MISSING_PATH_PARAM');
  }
  return value;
}

function assertRoleQueryAllowed(
  requestedRole: string,
  actorRole: string
) {
  if (actorRole !== 'admin' && requestedRole !== actorRole) {
    throw new AppError('Forbidden for this notification role', 403, 'FORBIDDEN');
  }
}

notificationRoutes.get('/', requireRole('maintenance'), async (c) => {
  const parsed = listNotificationsQuerySchema.parse({
    role: c.req.query('role'),
    is_read: c.req.query('is_read'),
    page: c.req.query('page'),
    limit: c.req.query('limit'),
  });
  assertRoleQueryAllowed(parsed.role, getAuthUser(c).role);

  const result = await notificationService.listNotifications(parsed);

  return c.json(
    listResponse(result.notifications, {
      total: result.total,
      page: result.page,
      limit: result.limit,
    })
  );
});

notificationRoutes.get('/unread-count', requireRole('maintenance'), async (c) => {
  const parsed = unreadCountQuerySchema.parse({
    role: c.req.query('role'),
  });
  assertRoleQueryAllowed(parsed.role, getAuthUser(c).role);

  const result = await notificationService.unreadCount(parsed);
  return c.json(successResponse(result));
});

notificationRoutes.patch('/:id/read', requireRole('maintenance'), async (c) => {
  const result = await notificationService.markRead(
    getRequiredParam(c.req.param('id'), 'id'),
    { actorRole: getAuthUser(c).role }
  );
  return c.json(successResponse(result));
});

export default notificationRoutes;
