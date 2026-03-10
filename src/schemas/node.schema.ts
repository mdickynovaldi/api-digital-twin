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
  status: z.string().max(100).default('Machine'),
  company: z.string().max(255).default(''),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Color must be a valid hex color (e.g. #000000)').default('#000000'),
  level: z.number().int().min(1).optional(),
  is_active: z.boolean().default(true),
  icon: z.string().max(255).default('tabler:settings'),
  description: z.string().default(''),
  coordinate: coordinateSchema,
  line_coordinate: coordinateSchema,
  rotate_xyz: coordinateSchema,
  size: z.number().min(0).default(1),
  parent_id: z.string().uuid().nullable().optional(),
  tags: z.array(z.string()).default([]),
  categories: z.array(z.string()).default([]),
  dependent_category: z.array(z.string()).default([]),
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
  name: z.string().min(1).max(255).optional(),
  status: z.string().max(100).optional(),
  company: z.string().max(255).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Color must be a valid hex color').optional(),
  is_active: z.boolean().optional(),
  icon: z.string().max(255).optional(),
  description: z.string().optional(),
  coordinate: z.object({
    x: z.number().optional(),
    y: z.number().optional(),
    z: z.number().optional(),
  }).optional(),
  line_coordinate: z.object({
    x: z.number().optional(),
    y: z.number().optional(),
    z: z.number().optional(),
  }).optional(),
  rotate_xyz: z.object({
    x: z.number().optional(),
    y: z.number().optional(),
    z: z.number().optional(),
  }).optional(),
  size: z.number().min(0).optional(),
  tags: z.array(z.string()).optional(),
  categories: z.array(z.string()).optional(),
  dependent_category: z.array(z.string()).optional(),
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
