import { z } from 'zod';

const optionalBooleanQuery = z.preprocess((value) => {
  if (value === undefined || value === null || value === '') return undefined;
  if (value === 'true' || value === true) return true;
  if (value === 'false' || value === false) return false;
  return value;
}, z.boolean().optional());

export const listNotificationsQuerySchema = z.object({
  unread_only: optionalBooleanQuery.default(false),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export type ListNotificationsQueryInput = z.infer<
  typeof listNotificationsQuerySchema
>;
