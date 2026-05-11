import { Hono } from 'hono';
import { anomalyService } from '@/src/services/anomaly.service';
import {
  listAnomaliesQuerySchema,
  rejectAnomalySchema,
  solveAnomalySchema,
  transitionNoteSchema,
} from '@/src/schemas/anomaly.schema';
import { getAuthUser, requireRole } from '@/src/middleware/auth';
import { AppError } from '@/src/middleware';
import { listResponse, successResponse } from '@/src/utils/response';

const maintenanceRoutes = new Hono();

function isFile(value: FormDataEntryValue | null): value is File {
  return (
    typeof value === 'object' &&
    value !== null &&
    'arrayBuffer' in value &&
    'name' in value &&
    'size' in value
  );
}

function getFormString(formData: FormData, key: string): string | undefined {
  const value = formData.get(key);
  return typeof value === 'string' && value.trim() !== ''
    ? value
    : undefined;
}

function parseMetadata(value: FormDataEntryValue | null): unknown {
  if (value === null || value === '') return undefined;
  if (typeof value !== 'string') {
    throw new AppError('metadata must be a JSON object string', 400, 'INVALID_METADATA');
  }

  try {
    const parsed = JSON.parse(value) as unknown;
    if (
      parsed === null ||
      typeof parsed !== 'object' ||
      Array.isArray(parsed)
    ) {
      throw new Error('metadata must be an object');
    }
    return parsed;
  } catch {
    throw new AppError('metadata must be a valid JSON object string', 400, 'INVALID_METADATA');
  }
}

maintenanceRoutes.get('/photos/:id/file', async (c) => {
  const file = await anomalyService.getMaintenancePhotoFile(c.req.param('id'));
  const body = file.fileData.buffer.slice(
    file.fileData.byteOffset,
    file.fileData.byteOffset + file.fileData.byteLength
  ) as ArrayBuffer;

  return new Response(body, {
    status: 200,
    headers: {
      'Content-Type': file.mimeType,
      'Content-Length': String(file.sizeBytes),
      'Cache-Control': 'public, max-age=31536000, immutable',
      'Content-Disposition': `inline; filename="${file.originalName.replaceAll('"', '')}"`,
    },
  });
});

maintenanceRoutes.get('/anomalies', requireRole('maintenance'), async (c) => {
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

maintenanceRoutes.patch(
  '/anomalies/:id/acknowledge',
  requireRole('maintenance'),
  async (c) => {
    const body = await c.req.json().catch(() => ({}));
    const parsed = transitionNoteSchema.parse(body);
    const result = await anomalyService.acknowledgeAnomaly(
      c.req.param('id'),
      parsed,
      getAuthUser(c)
    );
    return c.json(successResponse(result));
  }
);

maintenanceRoutes.patch(
  '/anomalies/:id/start',
  requireRole('maintenance'),
  async (c) => {
    const body = await c.req.json().catch(() => ({}));
    const parsed = transitionNoteSchema.parse(body);
    const result = await anomalyService.startAnomaly(
      c.req.param('id'),
      parsed,
      getAuthUser(c)
    );
    return c.json(successResponse(result));
  }
);

maintenanceRoutes.patch(
  '/anomalies/:id/reject',
  requireRole('maintenance'),
  async (c) => {
    const body = await c.req.json();
    const parsed = rejectAnomalySchema.parse(body);
    const result = await anomalyService.rejectAnomaly(
      c.req.param('id'),
      parsed,
      getAuthUser(c)
    );
    return c.json(successResponse(result));
  }
);

maintenanceRoutes.patch(
  '/anomalies/:id/solve',
  requireRole('maintenance'),
  async (c) => {
    const body = await c.req.json();
    const parsed = solveAnomalySchema.parse(body);
    const result = await anomalyService.solveAnomaly(
      c.req.param('id'),
      parsed,
      getAuthUser(c)
    );
    return c.json(successResponse(result));
  }
);

maintenanceRoutes.post(
  '/anomalies/:id/photos',
  requireRole('maintenance'),
  async (c) => {
    const contentType = c.req.header('content-type') || '';
    if (!contentType.toLowerCase().includes('multipart/form-data')) {
      throw new AppError(
        'Content-Type must be multipart/form-data',
        400,
        'INVALID_CONTENT_TYPE'
      );
    }

    const formData = await c.req.formData();
    const files = [
      ...formData.getAll('file'),
      ...formData.getAll('photo'),
      ...formData.getAll('photos'),
      ...formData.getAll('photos[]'),
    ].filter(isFile);

    const result = await anomalyService.uploadMaintenancePhotos(
      c.req.param('id'),
      files,
      {
        caption: getFormString(formData, 'caption'),
        metadata: parseMetadata(formData.get('metadata')),
      },
      getAuthUser(c)
    );

    return c.json(successResponse(result), 201);
  }
);

export default maintenanceRoutes;
