import type { Prisma } from '@prisma/client';
import { prisma } from '@/src/lib/prisma';
import { AppError } from '@/src/middleware';
import type { ListNotificationsQueryInput } from '@/src/schemas/notification.schema';

const notificationSelect = {
  id: true,
  anomalyId: true,
  type: true,
  title: true,
  message: true,
  isRead: true,
  readAt: true,
  createdAt: true,
  anomaly: {
    select: {
      id: true,
      title: true,
      status: true,
      assetNodeId: true,
    },
  },
} satisfies Prisma.NotificationSelect;

type NotificationPayload = Prisma.NotificationGetPayload<{
  select: typeof notificationSelect;
}>;

function statusToApi(status: string): string {
  return status.toLowerCase();
}

function transformNotification(notification: NotificationPayload): Record<string, unknown> {
  return {
    id: notification.id,
    anomaly_id: notification.anomalyId,
    type: notification.type,
    title: notification.title,
    message: notification.message,
    is_read: notification.isRead,
    read_at: notification.readAt?.toISOString() ?? null,
    created_at: notification.createdAt.toISOString(),
    anomaly: notification.anomaly
      ? {
          id: notification.anomaly.id,
          title: notification.anomaly.title,
          status: statusToApi(notification.anomaly.status),
          asset_node_id: notification.anomaly.assetNodeId,
        }
      : null,
  };
}

export const notificationService = {
  async listNotifications(
    userId: string,
    options: ListNotificationsQueryInput
  ): Promise<{
    notifications: Record<string, unknown>[];
    total: number;
    page: number;
    limit: number;
  }> {
    const where: Prisma.NotificationWhereInput = {
      recipientId: userId,
    };
    if (options.unread_only) {
      where.isRead = false;
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
    userId: string
  ): Promise<Record<string, unknown>> {
    const existing = await prisma.notification.findFirst({
      where: {
        id,
        recipientId: userId,
      },
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
};
