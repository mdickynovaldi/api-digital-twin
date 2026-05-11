import { Hono } from 'hono';
import { anomalyService } from '@/src/services/anomaly.service';
import {
  createAnomalySchema,
  listAnomaliesQuerySchema,
} from '@/src/schemas/anomaly.schema';
import { getAuthUser, requireAuth, requireRole } from '@/src/middleware/auth';
import { AppError } from '@/src/middleware';
import { listResponse, successResponse } from '@/src/utils/response';

const anomalyRoutes = new Hono();

function getRequiredParam(value: string | undefined, name: string): string {
  if (!value) {
    throw new AppError(`Missing path parameter: ${name}`, 400, 'MISSING_PATH_PARAM');
  }
  return value;
}

anomalyRoutes.post('/', requireRole('operator'), async (c) => {
  const body = await c.req.json();
  const parsed = createAnomalySchema.parse(body);
  const result = await anomalyService.createAnomaly(parsed, getAuthUser(c));
  return c.json(successResponse(result), 201);
});

anomalyRoutes.get('/', requireAuth, async (c) => {
  const parsed = listAnomaliesQuerySchema.parse({
    status: c.req.query('status'),
    asset_node_id: c.req.query('asset_node_id'),
    screenshot_id: c.req.query('screenshot_id'),
    assigned_to_me: c.req.query('assigned_to_me'),
    reported_by_me: c.req.query('reported_by_me'),
    include_rejected: c.req.query('include_rejected'),
    page: c.req.query('page'),
    limit: c.req.query('limit'),
  });
  const result = await anomalyService.listAnomalies(parsed, getAuthUser(c));

  return c.json(
    listResponse(result.anomalies, {
      total: result.total,
      page: result.page,
      limit: result.limit,
    })
  );
});

anomalyRoutes.get('/:id', requireAuth, async (c) => {
  const result = await anomalyService.getAnomaly(
    getRequiredParam(c.req.param('id'), 'id')
  );
  return c.json(successResponse(result));
});

export default anomalyRoutes;
