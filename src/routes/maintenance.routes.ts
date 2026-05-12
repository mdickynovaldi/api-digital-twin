import { Hono } from 'hono';
import { anomalyService } from '@/src/services/anomaly.service';
import { requireRole } from '@/src/middleware/auth';

const maintenanceRoutes = new Hono();

maintenanceRoutes.get(
  '/photos/:id/file',
  requireRole('operator', 'maintenance', 'unity-client'),
  async (c) => {
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
        'Cache-Control': 'private, max-age=3600',
        'Content-Disposition': `inline; filename="${file.originalName.replaceAll('"', '')}"`,
      },
    });
  }
);

export default maintenanceRoutes;
