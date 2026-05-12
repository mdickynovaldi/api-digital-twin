import { z } from 'zod';

export const apiAnomalyStatusSchema = z.enum([
  'open',
  'acknowledged',
  'in_progress',
  'resolved',
  'rejected',
]);

export const anomalyListStatusSchema = z.enum([
  'open',
  'acknowledged',
  'in_progress',
  'resolved',
]);

export const anomalyTypeSchema = z.enum([
  'temperature',
  'vibration',
  'leak',
  'noise',
  'visual',
  'electrical',
  'mechanical',
  'other',
]);

export const anomalySeveritySchema = z.enum([
  'low',
  'medium',
  'high',
  'critical',
]);

export type ApiAnomalyStatus = z.infer<typeof apiAnomalyStatusSchema>;
export type ApiAnomalyType = z.infer<typeof anomalyTypeSchema>;
export type ApiAnomalySeverity = z.infer<typeof anomalySeveritySchema>;

const optionalString = (max?: number) => {
  const schema = max ? z.string().trim().max(max) : z.string().trim();
  return z.preprocess((value) => {
    if (typeof value !== 'string') return undefined;
    const trimmed = value.trim();
    return trimmed === '' ? undefined : trimmed;
  }, schema.optional());
};

const requiredString = (field: string, max?: number) => {
  const schema = max ? z.string().trim().min(1).max(max) : z.string().trim().min(1);
  return z.preprocess((value) => {
    if (typeof value !== 'string') return value;
    return value.trim();
  }, schema.describe(`${field} is required`));
};

const optionalBooleanQuery = z.preprocess((value) => {
  if (value === undefined || value === null || value === '') return undefined;
  if (value === 'true' || value === true) return true;
  if (value === 'false' || value === false) return false;
  return value;
}, z.boolean().optional());

export const createAnomalyFieldsSchema = z.object({
  asset_node_id: requiredString('asset_node_id').pipe(z.string().uuid()),
  title: requiredString('title', 255),
  description: requiredString('description', 5000),
  anomaly_type: anomalyTypeSchema,
  severity: anomalySeveritySchema,
  captured_at: optionalString().pipe(z.string().datetime({ offset: true }).optional()),
  reported_by: optionalString(255),
  metadata: z.record(z.unknown()).optional(),
});

export type CreateAnomalyFieldsInput = z.infer<
  typeof createAnomalyFieldsSchema
>;

export const listAnomaliesQuerySchema = z.object({
  status: anomalyListStatusSchema.optional(),
  severity: anomalySeveritySchema.optional(),
  asset_node_id: optionalString().pipe(z.string().uuid().optional()),
  assigned_to: optionalString(255),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  sort: z.enum(['newest', 'oldest']).default('newest'),
});

export type ListAnomaliesQueryInput = z.infer<
  typeof listAnomaliesQuerySchema
>;

export const acknowledgeAnomalySchema = z.object({
  acknowledged_by: requiredString('acknowledged_by', 255),
  assigned_to: optionalString(255),
  note: optionalString(5000),
});

export type AcknowledgeAnomalyInput = z.infer<
  typeof acknowledgeAnomalySchema
>;

export const updateAnomalyStatusSchema = z.object({
  status: apiAnomalyStatusSchema,
  note: optionalString(5000),
  updated_by: requiredString('updated_by', 255),
});

export type UpdateAnomalyStatusInput = z.infer<
  typeof updateAnomalyStatusSchema
>;

export const resolveAnomalyFieldsSchema = z.object({
  resolution_note: requiredString('resolution_note', 5000),
  resolved_by: requiredString('resolved_by', 255),
  metadata: z.record(z.unknown()).optional(),
});

export type ResolveAnomalyFieldsInput = z.infer<
  typeof resolveAnomalyFieldsSchema
>;

export const unitySyncQuerySchema = z.object({
  since: optionalString().pipe(z.string().datetime({ offset: true }).optional()),
});

export type UnitySyncQueryInput = z.infer<typeof unitySyncQuerySchema>;

export const notificationQueryRoleSchema = z.enum([
  'maintenance',
  'operator',
  'admin',
]);

export const optionalReadQuerySchema = optionalBooleanQuery;
