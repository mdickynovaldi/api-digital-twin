import { z } from 'zod';

const optionalFormString = (schema: z.ZodString) =>
  z.preprocess(
    (value) => {
      if (typeof value !== 'string') return undefined;
      const trimmed = value.trim();
      return trimmed === '' ? undefined : trimmed;
    },
    schema.optional()
  );

export const uploadScreenshotFieldsSchema = z.object({
  asset_node_id: optionalFormString(z.string().uuid()),
  title: optionalFormString(z.string().max(255)),
  description: optionalFormString(z.string()),
  captured_at: optionalFormString(z.string().datetime({ offset: true })),
  uploaded_by: optionalFormString(z.string().max(255)),
  metadata: z.record(z.unknown()).optional(),
});

export type UploadScreenshotFieldsInput = z.infer<
  typeof uploadScreenshotFieldsSchema
>;

export const listScreenshotsQuerySchema = z.object({
  asset_node_id: optionalFormString(z.string().uuid()),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export type ListScreenshotsQueryInput = z.infer<
  typeof listScreenshotsQuerySchema
>;
