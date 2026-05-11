import { Hono } from 'hono';
import { screenshotService } from '@/src/services/screenshot.service';
import {
  listScreenshotsQuerySchema,
  uploadScreenshotFieldsSchema,
} from '@/src/schemas/screenshot.schema';
import { successResponse, listResponse } from '@/src/utils/response';
import { AppError } from '@/src/middleware';

const screenshotRoutes = new Hono();

function isFile(value: FormDataEntryValue | null): value is File {
  return (
    typeof value === 'object' &&
    value !== null &&
    'arrayBuffer' in value &&
    'name' in value &&
    'size' in value
  );
}

function getFormString(
  formData: FormData,
  key: string
): string | undefined {
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

// ─── POST /screenshots — Upload Unity screenshot ───────────────────
screenshotRoutes.post('/', async (c) => {
  const contentType = c.req.header('content-type') || '';
  if (!contentType.toLowerCase().includes('multipart/form-data')) {
    throw new AppError(
      'Content-Type must be multipart/form-data',
      400,
      'INVALID_CONTENT_TYPE'
    );
  }

  const formData = await c.req.formData();
  const file = formData.get('file') ?? formData.get('screenshot');

  if (!isFile(file)) {
    throw new AppError(
      'Screenshot file is required in form field "file" or "screenshot"',
      400,
      'FILE_REQUIRED'
    );
  }

  const fields = uploadScreenshotFieldsSchema.parse({
    asset_node_id: getFormString(formData, 'asset_node_id'),
    title: getFormString(formData, 'title'),
    description: getFormString(formData, 'description'),
    captured_at: getFormString(formData, 'captured_at'),
    uploaded_by: getFormString(formData, 'uploaded_by'),
    metadata: parseMetadata(formData.get('metadata')),
  });

  const result = await screenshotService.uploadScreenshot(file, fields);
  return c.json(successResponse(result), 201);
});

// ─── GET /screenshots — List screenshots for maintenance views ─────
screenshotRoutes.get('/', async (c) => {
  const parsed = listScreenshotsQuerySchema.parse({
    asset_node_id: c.req.query('asset_node_id'),
    page: c.req.query('page'),
    limit: c.req.query('limit'),
  });

  const result = await screenshotService.listScreenshots({
    assetNodeId: parsed.asset_node_id,
    page: parsed.page,
    limit: parsed.limit,
  });

  return c.json(
    listResponse(result.screenshots, {
      total: result.total,
      page: result.page,
      limit: result.limit,
    })
  );
});

// ─── GET /screenshots/:id — Get screenshot detail ──────────────────
screenshotRoutes.get('/:id', async (c) => {
  const id = c.req.param('id');
  const result = await screenshotService.getScreenshot(id);
  return c.json(successResponse(result));
});

export default screenshotRoutes;
