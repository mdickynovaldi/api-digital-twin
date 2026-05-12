import { Hono } from 'hono';
import { anomalyService } from '@/src/services/anomaly.service';
import { unitySyncQuerySchema } from '@/src/schemas/anomaly.schema';
import { requireRole } from '@/src/middleware/auth';
import { successResponse } from '@/src/utils/response';

const unityRoutes = new Hono();

unityRoutes.get('/anomalies/sync', requireRole('unity-client'), async (c) => {
  const parsed = unitySyncQuerySchema.parse({
    since: c.req.query('since'),
  });
  const result = await anomalyService.syncForUnity(parsed);

  return c.json(successResponse(result));
});

unityRoutes.get('/anomaly-markers', requireRole('unity-client'), async (c) => {
  const result = await anomalyService.syncForUnity({});
  return c.json(successResponse(result));
});

export default unityRoutes;
