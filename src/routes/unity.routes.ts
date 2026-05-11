import { Hono } from 'hono';
import { anomalyService } from '@/src/services/anomaly.service';
import { listUnityMarkersQuerySchema } from '@/src/schemas/anomaly.schema';
import { listResponse } from '@/src/utils/response';

const unityRoutes = new Hono();

unityRoutes.get('/anomaly-markers', async (c) => {
  const parsed = listUnityMarkersQuerySchema.parse({
    asset_node_id: c.req.query('asset_node_id'),
    status: c.req.query('status'),
    include_rejected: c.req.query('include_rejected'),
    page: c.req.query('page'),
    limit: c.req.query('limit'),
  });
  const result = await anomalyService.listUnityMarkers(parsed);

  return c.json(
    listResponse(result.markers, {
      total: result.total,
      page: result.page,
      limit: result.limit,
    })
  );
});

export default unityRoutes;
