import { z } from 'zod';

export const apiAnomalyStatusSchema = z.enum([
  'open',
  'acknowledged',
  'in_progress',
  'resolved',
  'rejected',
]);

export type ApiAnomalyStatus = z.infer<typeof apiAnomalyStatusSchema>;

const optionalString = (max?: number) => {
  const schema = max ? z.string().trim().max(max) : z.string().trim();
  return z.preprocess((value) => {
    if (typeof value !== 'string') return undefined;
    const trimmed = value.trim();
    return trimmed === '' ? undefined : trimmed;
  }, schema.optional());
};

const optionalBooleanQuery = z.preprocess((value) => {
  if (value === undefined || value === null || value === '') return undefined;
  if (value === 'true' || value === true) return true;
  if (value === 'false' || value === false) return false;
  return value;
}, z.boolean().optional());

export const createAnomalySchema = z.object({
  asset_node_id: z.string().uuid(),
  screenshot_id: optionalString().pipe(z.string().uuid().optional()),
  title: z.string().trim().min(1).max(255),
  description: z.string().trim().max(5000).optional().default(''),
  severity: z.string().trim().max(100).optional().default('medium'),
  metadata: z.record(z.unknown()).optional(),
});

export type CreateAnomalyInput = z.infer<typeof createAnomalySchema>;

export const listAnomaliesQuerySchema = z.object({
  status: apiAnomalyStatusSchema.optional(),
  asset_node_id: optionalString().pipe(z.string().uuid().optional()),
  screenshot_id: optionalString().pipe(z.string().uuid().optional()),
  assigned_to_me: optionalBooleanQuery,
  reported_by_me: optionalBooleanQuery,
  include_rejected: optionalBooleanQuery.default(true),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export type ListAnomaliesQueryInput = z.infer<typeof listAnomaliesQuerySchema>;

export const transitionNoteSchema = z.object({
  note: z.string().trim().max(5000).optional().default(''),
});

export type TransitionNoteInput = z.infer<typeof transitionNoteSchema>;

export const rejectAnomalySchema = z.object({
  reason: z.string().trim().min(1).max(5000),
});

export type RejectAnomalyInput = z.infer<typeof rejectAnomalySchema>;

export const solveAnomalySchema = z.object({
  field_notes: z.string().trim().max(5000).optional().default(''),
  actions_taken: z.array(z.string().trim().min(1).max(500)).optional().default([]),
  metadata: z.record(z.unknown()).optional(),
  solved_at: optionalString().pipe(z.string().datetime({ offset: true }).optional()),
});

export type SolveAnomalyInput = z.infer<typeof solveAnomalySchema>;

export const listUnityMarkersQuerySchema = z.object({
  asset_node_id: optionalString().pipe(z.string().uuid().optional()),
  status: apiAnomalyStatusSchema.optional(),
  include_rejected: optionalBooleanQuery.default(false),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(100),
});

export type ListUnityMarkersQueryInput = z.infer<
  typeof listUnityMarkersQuerySchema
>;
