import { Hono } from 'hono';
import { anomalyService } from '@/src/services/anomaly.service';
import {
  acknowledgeAnomalySchema,
  createAnomalyFieldsSchema,
  listAnomaliesQuerySchema,
  resolveAnomalyFieldsSchema,
  updateAnomalyStatusSchema,
} from '@/src/schemas/anomaly.schema';
import { getAuthUser, requireRole } from '@/src/middleware/auth';
import { AppError } from '@/src/middleware';
import { listResponse, successResponse } from '@/src/utils/response';

const anomalyRoutes = new Hono();

function getRequiredParam(value: string | undefined, name: string): string {
  if (!value) {
    throw new AppError(`Missing path parameter: ${name}`, 400, 'MISSING_PATH_PARAM');
  }
  return value;
}

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
  return typeof value === 'string' ? value : undefined;
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

function assertMultipart(contentType: string | undefined) {
  if (!contentType?.toLowerCase().includes('multipart/form-data')) {
    throw new AppError(
      'Content-Type must be multipart/form-data',
      400,
      'INVALID_CONTENT_TYPE'
    );
  }
}

anomalyRoutes.post('/', requireRole('operator'), async (c) => {
  assertMultipart(c.req.header('content-type'));

  const formData = await c.req.formData();
  const screenshot = formData.get('screenshot') ?? formData.get('file');
  if (!isFile(screenshot)) {
    throw new AppError(
      'Screenshot image is required in form field "screenshot" or "file"',
      400,
      'FILE_REQUIRED'
    );
  }

  const parsed = createAnomalyFieldsSchema.parse({
    asset_node_id: getFormString(formData, 'asset_node_id'),
    title: getFormString(formData, 'title'),
    description: getFormString(formData, 'description'),
    anomaly_type: getFormString(formData, 'anomaly_type'),
    severity: getFormString(formData, 'severity'),
    captured_at: getFormString(formData, 'captured_at'),
    reported_by: getFormString(formData, 'reported_by'),
    metadata: parseMetadata(formData.get('metadata')),
  });

  const result = await anomalyService.createAnomaly(
    parsed,
    screenshot,
    getAuthUser(c)
  );
  return c.json(successResponse(result), 201);
});

anomalyRoutes.get('/', requireRole('operator', 'maintenance'), async (c) => {
  const parsed = listAnomaliesQuerySchema.parse({
    status: c.req.query('status'),
    severity: c.req.query('severity'),
    asset_node_id: c.req.query('asset_node_id'),
    assigned_to: c.req.query('assigned_to'),
    page: c.req.query('page'),
    limit: c.req.query('limit'),
    sort: c.req.query('sort'),
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

anomalyRoutes.patch(
  '/:id/acknowledge',
  requireRole('maintenance'),
  async (c) => {
    const body = await c.req.json();
    const parsed = acknowledgeAnomalySchema.parse(body);
    const result = await anomalyService.acknowledgeAnomaly(
      getRequiredParam(c.req.param('id'), 'id'),
      parsed,
      getAuthUser(c)
    );
    return c.json(successResponse(result));
  }
);

anomalyRoutes.patch(
  '/:id/status',
  requireRole('maintenance'),
  async (c) => {
    const body = await c.req.json();
    const parsed = updateAnomalyStatusSchema.parse(body);
    const result = await anomalyService.updateStatus(
      getRequiredParam(c.req.param('id'), 'id'),
      parsed,
      getAuthUser(c)
    );
    return c.json(successResponse(result));
  }
);

anomalyRoutes.post(
  '/:id/resolve',
  requireRole('maintenance'),
  async (c) => {
    assertMultipart(c.req.header('content-type'));

    const formData = await c.req.formData();
    const photo = formData.get('resolution_photo') ?? formData.get('file');
    if (!isFile(photo)) {
      throw new AppError(
        'Resolution photo is required in form field "resolution_photo" or "file"',
        400,
        'FILE_REQUIRED'
      );
    }

    const parsed = resolveAnomalyFieldsSchema.parse({
      resolution_note: getFormString(formData, 'resolution_note'),
      resolved_by: getFormString(formData, 'resolved_by'),
      metadata: parseMetadata(formData.get('metadata')),
    });
    const result = await anomalyService.resolveAnomaly(
      getRequiredParam(c.req.param('id'), 'id'),
      parsed,
      photo,
      getAuthUser(c)
    );
    return c.json(successResponse(result));
  }
);

anomalyRoutes.get('/:id', requireRole('operator', 'maintenance'), async (c) => {
  const result = await anomalyService.getAnomaly(
    getRequiredParam(c.req.param('id'), 'id'),
    getAuthUser(c)
  );
  return c.json(successResponse(result));
});

export default anomalyRoutes;
