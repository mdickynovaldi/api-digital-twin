import { UserRole, type Prisma } from '@prisma/client';
import { prisma } from '@/src/lib/prisma';
import { AppError } from '@/src/middleware';
import type {
  ListNotificationsQueryInput,
  NotificationRole,
  UnreadCountQueryInput,
} from '@/src/schemas/notification.schema';

const roleByApi: Record<NotificationRole, UserRole> = {
  maintenance: UserRole.MAINTENANCE,
  operator: UserRole.OPERATOR,
  admin: UserRole.ADMIN,
};

const apiRoleByPrisma: Partial<Record<UserRole, NotificationRole>> = {
  [UserRole.MAINTENANCE]: 'maintenance',
  [UserRole.OPERATOR]: 'operator',
  [UserRole.ADMIN]: 'admin',
};

const notificationSelect = {
  id: true,
  userRole: true,
  anomalyId: true,
  assetNodeId: true,
  type: true,
  title: true,
  message: true,
  isRead: true,
  createdAt: true,
  readAt: true,
} satisfies Prisma.NotificationSelect;

type NotificationPayload = Prisma.NotificationGetPayload<{
  select: typeof notificationSelect;
}>;

function transformNotification(
  notification: NotificationPayload
): Record<string, unknown> {
  return {
    id: notification.id,
    user_role: apiRoleByPrisma[notification.userRole] ?? 'maintenance',
    anomaly_id: notification.anomalyId,
    asset_node_id: notification.assetNodeId,
    type: notification.type,
    title: notification.title,
    message: notification.message,
    is_read: notification.isRead,
    created_at: notification.createdAt.toISOString(),
    read_at: notification.readAt?.toISOString() ?? null,
  };
}

export const notificationService = {
  async listNotifications(
    options: ListNotificationsQueryInput
  ): Promise<{
    notifications: Record<string, unknown>[];
    total: number;
    page: number;
    limit: number;
  }> {
    const where: Prisma.NotificationWhereInput = {
      userRole: roleByApi[options.role],
    };
    if (options.is_read !== undefined) {
      where.isRead = options.is_read;
    }

    const skip = (options.page - 1) * options.limit;
    const [notifications, total] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: options.limit,
        select: notificationSelect,
      }),
      prisma.notification.count({ where }),
    ]);

    return {
      notifications: notifications.map(transformNotification),
      total,
      page: options.page,
      limit: options.limit,
    };
  },

  async markRead(
    id: string,
    options: { actorRole: string }
  ): Promise<Record<string, unknown>> {
    const where: Prisma.NotificationWhereInput = { id };
    if (options.actorRole !== 'admin') {
      where.userRole = UserRole.MAINTENANCE;
    }

    const existing = await prisma.notification.findFirst({
      where,
      select: { id: true },
    });
    if (!existing) {
      throw new AppError('Notification not found', 404, 'NOTIFICATION_NOT_FOUND');
    }

    const updated = await prisma.notification.update({
      where: { id },
      data: {
        isRead: true,
        readAt: new Date(),
      },
      select: notificationSelect,
    });

    return transformNotification(updated);
  },

  async unreadCount(
    options: UnreadCountQueryInput
  ): Promise<{ count: number }> {
    const count = await prisma.notification.count({
      where: {
        userRole: roleByApi[options.role],
        isRead: false,
      },
    });

    return { count };
  },
};
