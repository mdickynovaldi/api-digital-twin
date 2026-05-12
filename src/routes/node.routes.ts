import { Hono } from 'hono';
import { nodeService } from '@/src/services/node.service';
import { anomalyService } from '@/src/services/anomaly.service';
import {
  createNodeSchema,
  updateNodeSchema,
  moveNodeSchema,
  addChildrenSchema,
  bulkUpsertTreeSchema,
} from '@/src/schemas/node.schema';
import type {
  CreateNodeInput,
  UpdateNodeInput,
  MoveNodeInput,
  AddChildrenInput,
  BulkUpsertTreeInput,
} from '@/src/schemas/node.schema';
import { successResponse, listResponse, errorResponse } from '@/src/utils/response';
import uploadRoutes from '@/src/routes/upload.routes';
import { requireRole } from '@/src/middleware/auth';

/**
 * Node routes — all REST endpoints for AssetNode CRUD and tree operations.
 */
const nodeRoutes = new Hono();

// ─── File upload sub-routes (/nodes/:id/files) ──────────────────────
nodeRoutes.route('/', uploadRoutes);

// ─── POST /nodes — Create root node or node with nested children ────
nodeRoutes.post('/', async (c) => {
  const body = await c.req.json();
  const parsed = createNodeSchema.parse(body) as CreateNodeInput;
  const result = await nodeService.createNode(parsed);
  return c.json(successResponse(result), 201);
});

// ─── POST /nodes/bulk-upsert-tree — Bulk upsert recursive tree ─────
// NOTE: This must be BEFORE /:id routes to avoid matching "bulk-upsert-tree" as :id
nodeRoutes.post('/bulk-upsert-tree', async (c) => {
  const body = await c.req.json();
  const parsed = bulkUpsertTreeSchema.parse(body) as BulkUpsertTreeInput;
  const result = await nodeService.bulkUpsertTree(parsed.nodes);
  return c.json(successResponse(result), 200);
});

// ─── GET /nodes — List nodes ────────────────────────────────────────
nodeRoutes.get('/', async (c) => {
  const rootOnly = c.req.query('rootOnly') === 'true';
  const status = c.req.query('status');
  const company = c.req.query('company');
  const isActive = c.req.query('isActive')
    ? c.req.query('isActive') === 'true'
    : undefined;
  const page = parseInt(c.req.query('page') || '1', 10);
  const limit = parseInt(c.req.query('limit') || '50', 10);

  const result = await nodeService.listNodes({
    rootOnly,
    status: status || undefined,
    company: company || undefined,
    isActive,
    page,
    limit,
  });

  return c.json(
    listResponse(result.nodes, {
      total: result.total,
      page: result.page,
      limit: result.limit,
    })
  );
});

// ─── GET /nodes/:id/anomalies/active — Unity active anomalies ──────
nodeRoutes.get(
  '/:id/anomalies/active',
  requireRole('unity-client'),
  async (c) => {
    const id = c.req.param('id');
    const result = await anomalyService.listActiveByAsset(id);
    return c.json(successResponse(result));
  }
);

// ─── GET /nodes/:id/anomalies/latest — Unity latest anomaly state ──
nodeRoutes.get(
  '/:id/anomalies/latest',
  requireRole('unity-client'),
  async (c) => {
    const id = c.req.param('id');
    const result = await anomalyService.getLatestByAsset(id);
    return c.json(successResponse(result));
  }
);

// ─── GET /nodes/:id — Get single node detail ───────────────────────
nodeRoutes.get('/:id', async (c) => {
  const id = c.req.param('id');
  const typeFilter = c.req.query('type'); // optional: 'pdf' | 'image' | 'video'
  
  const result = await nodeService.getNode(id);
  
  // Conditionally strip out unrequested file types if typeFilter is used
  if (typeFilter === 'pdf') {
    result.images = [];
    result.videos = [];
  } else if (typeFilter === 'image') {
    result.pdfs = [];
    result.videos = [];
  } else if (typeFilter === 'video') {
    result.pdfs = [];
    result.images = [];
  }
  
  return c.json(successResponse(result));
});

// ─── GET /nodes/:id/tree — Get recursive tree ──────────────────────
nodeRoutes.get('/:id/tree', async (c) => {
  const id = c.req.param('id');
  const depthParam = c.req.query('depth');
  const maxDepth = depthParam ? parseInt(depthParam, 10) : undefined;
  const result = await nodeService.getNodeTree(id, maxDepth);
  return c.json(successResponse(result));
});

// ─── GET /nodes/:id/children — Get direct children ─────────────────
nodeRoutes.get('/:id/children', async (c) => {
  const id = c.req.param('id');
  const result = await nodeService.getDirectChildren(id);
  return c.json(successResponse(result));
});

// ─── POST /nodes/:id/children — Add children to node ───────────────
nodeRoutes.post('/:id/children', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  const parsed = addChildrenSchema.parse(body) as AddChildrenInput;
  const result = await nodeService.addChildren(id, parsed.children);
  return c.json(successResponse(result), 201);
});

// ─── PATCH /nodes/:id — Partial update ─────────────────────────────
nodeRoutes.patch('/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  const parsed = updateNodeSchema.parse(body) as UpdateNodeInput;
  const result = await nodeService.updateNode(id, parsed);
  return c.json(successResponse(result));
});

// ─── PATCH /nodes/:id/move — Move node to new parent ───────────────
nodeRoutes.patch('/:id/move', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  const parsed = moveNodeSchema.parse(body) as MoveNodeInput;
  const result = await nodeService.moveNode(id, parsed);
  return c.json(successResponse(result));
});

// ─── DELETE /nodes/:id — Delete node or subtree ─────────────────────
nodeRoutes.delete('/:id', async (c) => {
  const id = c.req.param('id');
  const mode = (c.req.query('mode') || 'subtree') as 'node' | 'subtree';

  if (mode !== 'node' && mode !== 'subtree') {
    return c.json(
      errorResponse('Invalid mode. Use "node" or "subtree"', 'INVALID_MODE'),
      400
    );
  }

  const result = await nodeService.deleteNode(id, mode);
  return c.json(successResponse(result));
});

export default nodeRoutes;
