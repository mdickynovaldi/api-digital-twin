import { z } from 'zod';

const optionalBooleanQuery = z.preprocess((value) => {
  if (value === undefined || value === null || value === '') return undefined;
  if (value === 'true' || value === true) return true;
  if (value === 'false' || value === false) return false;
  return value;
}, z.boolean().optional());

export const notificationRoleSchema = z.enum([
  'maintenance',
  'operator',
  'admin',
]);

export type NotificationRole = z.infer<typeof notificationRoleSchema>;

export const listNotificationsQuerySchema = z.object({
  role: notificationRoleSchema.default('maintenance'),
  is_read: optionalBooleanQuery,
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export type ListNotificationsQueryInput = z.infer<
  typeof listNotificationsQuerySchema
>;

export const unreadCountQuerySchema = z.object({
  role: notificationRoleSchema.default('maintenance'),
});

export type UnreadCountQueryInput = z.infer<typeof unreadCountQuerySchema>;
