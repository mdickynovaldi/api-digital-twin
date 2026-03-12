import { z } from 'zod';

// ─── Coordinate Schema ─────────────────────────────────────────────
export const coordinateSchema = z.object({
  x: z.number().default(0),
  y: z.number().default(0),
  z: z.number().default(0),
}).default({ x: 0, y: 0, z: 0 });

// ─── Base Node Fields (shared between create and update) ────────────
const nodeBaseFields = {
  name: z.string().min(1, 'Name is required').max(255),
  status: z.string().max(100).default('Machine').nullable(),
  company: z.string().max(255).default('').nullable(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Color must be a valid hex color (e.g. #000000)').default('#000000').nullable(),
  level: z.number().int().min(1).optional().nullable(),
  is_active: z.boolean().default(true).nullable(),
  icon: z.string().max(255).default('tabler:settings').nullable(),
  description: z.string().default('').nullable(),
  coordinate: coordinateSchema.nullable(),
  line_coordinate: coordinateSchema.nullable(),
  rotate_xyz: coordinateSchema.nullable(),
  size: z.number().min(0).default(1).nullable(),
  parent_id: z.string().uuid().nullable().optional(),
  tags: z.array(z.string()).default([]).nullable(),
  categories: z.array(z.string()).default([]).nullable(),
  dependent_category: z.array(z.string()).default([]).nullable(),
  // Optional file attachment URL arrays
  pdfs: z.array(z.string().url()).default([]).nullable(),
  images: z.array(z.string().url()).default([]).nullable(),
  videos: z.array(z.string().url()).default([]).nullable(),
};

// ─── Create Node Schema (with recursive children) ──────────────────
// We use z.lazy for the recursive children reference.
// The base schema is defined separately so it can reference itself.
const baseCreateNodeSchema = z.object({
  ...nodeBaseFields,
});

export const createNodeSchema: z.ZodType<unknown> = z.lazy(() =>
  baseCreateNodeSchema.extend({
    children: z.array(createNodeSchema).optional().default([]),
  })
);

// Inferred type for use in service layer
export type CreateNodeInput = z.infer<typeof baseCreateNodeSchema> & {
  children?: CreateNodeInput[];
};

// ─── Update Node Schema (all fields optional) ──────────────────────
export const updateNodeSchema = z.object({
  name: z.string().min(1).max(255).optional().nullable(),
  status: z.string().max(100).optional().nullable(),
  company: z.string().max(255).optional().nullable(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Color must be a valid hex color').optional().nullable(),
  is_active: z.boolean().optional().nullable(),
  icon: z.string().max(255).optional().nullable(),
  description: z.string().optional().nullable(),
  coordinate: z.object({
    x: z.number().optional().nullable(),
    y: z.number().optional().nullable(),
    z: z.number().optional().nullable(),
  }).optional().nullable(),
  line_coordinate: z.object({
    x: z.number().optional().nullable(),
    y: z.number().optional().nullable(),
    z: z.number().optional().nullable(),
  }).optional().nullable(),
  rotate_xyz: z.object({
    x: z.number().optional().nullable(),
    y: z.number().optional().nullable(),
    z: z.number().optional().nullable(),
  }).optional().nullable(),
  size: z.number().min(0).optional().nullable(),
  tags: z.array(z.string()).optional().nullable(),
  categories: z.array(z.string()).optional().nullable(),
  dependent_category: z.array(z.string()).optional().nullable(),
  // Optional file attachment URL arrays
  pdfs: z.array(z.string().url()).optional().nullable(),
  images: z.array(z.string().url()).optional().nullable(),
  videos: z.array(z.string().url()).optional().nullable(),
}).refine((data) => Object.keys(data).length > 0, {
  message: 'At least one field must be provided for update',
});

export type UpdateNodeInput = z.infer<typeof updateNodeSchema>;

// ─── Move Node Schema ──────────────────────────────────────────────
export const moveNodeSchema = z.object({
  new_parent_id: z.string().uuid().nullable(),
});

export type MoveNodeInput = z.infer<typeof moveNodeSchema>;

// ─── Add Children Schema ───────────────────────────────────────────
export const addChildrenSchema = z.object({
  children: z.array(createNodeSchema).min(1, 'At least one child is required'),
});

export type AddChildrenInput = {
  children: CreateNodeInput[];
};

// ─── Bulk Upsert Tree Schema ───────────────────────────────────────
const baseBulkUpsertNodeSchema = z.object({
  id: z.string().uuid().optional(),
  ...nodeBaseFields,
});

export const bulkUpsertNodeSchema: z.ZodType<unknown> = z.lazy(() =>
  baseBulkUpsertNodeSchema.extend({
    children: z.array(bulkUpsertNodeSchema).optional().default([]),
  })
);

export type BulkUpsertNodeInput = z.infer<typeof baseBulkUpsertNodeSchema> & {
  id?: string;
  children?: BulkUpsertNodeInput[];
};

export const bulkUpsertTreeSchema = z.object({
  nodes: z.array(bulkUpsertNodeSchema).min(1, 'At least one node is required'),
});

export type BulkUpsertTreeInput = {
  nodes: BulkUpsertNodeInput[];
};
