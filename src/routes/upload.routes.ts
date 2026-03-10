import { Hono } from 'hono';
import { z } from 'zod';
import { nodeService } from '@/src/services/node.service';
import { processFormFiles, deleteFileFromDisk } from '@/src/utils/upload';
import { successResponse, errorResponse } from '@/src/utils/response';
import { AppError } from '@/src/middleware';

const uploadRoutes = new Hono();

// ─── POST /nodes/:id/files ────────────────────────────────────────────
// Upload multiple files (pdfs, images, videos) and append their URLs to the node.
//
// Content-Type: multipart/form-data
// Fields (all optional, all accept multiple files):
//   pdfs    or pdfs[]    → PDF files  (max 20MB each)
//   images  or images[]  → Image files (max 10MB each, JPEG/PNG/WebP/GIF)
//   videos  or videos[]  → Video files (max 200MB each, MP4/WebM/MOV)
//
// Unity Example (C#):
//   var form = new WWWForm();
//   form.AddBinaryData("pdfs[]", pdfBytes, "manual.pdf", "application/pdf");
//   form.AddBinaryData("images[]", imgBytes, "photo.jpg", "image/jpeg");
//   var req = UnityWebRequest.Post($"{baseUrl}/api/nodes/{nodeId}/files", form);
//
uploadRoutes.post('/:id/files', async (c) => {
  const id = c.req.param('id');

  // Parse multipart form
  let formData: FormData;
  try {
    formData = await c.req.formData();
  } catch {
    return c.json(errorResponse('Request must be multipart/form-data', 'INVALID_CONTENT_TYPE'), 400);
  }

  // Process and save files
  const { pdfs, images, videos, errors } = await processFormFiles(formData);

  if (pdfs.length === 0 && images.length === 0 && videos.length === 0) {
    const msg = errors.length > 0
      ? `No files were saved. Errors: ${errors.map(e => e.message).join('; ')}`
      : 'No valid files were provided. Use field names: pdfs[], images[], videos[]';
    return c.json(errorResponse(msg, 'NO_FILES'), 400);
  }

  // Append newly uploaded URLs to the node
  const result = await nodeService.addFiles(id, { pdfs, images, videos });

  return c.json(
    successResponse(result, {
      uploaded: { pdfs, images, videos },
      ...(errors.length > 0 && { warnings: errors }),
    }),
    200
  );
});

// ─── DELETE /nodes/:id/files ──────────────────────────────────────────
// Remove specific file URLs from a node and optionally delete from disk.
//
// Content-Type: application/json
// Body:
//   {
//     "pdfs":   ["/uploads/pdfs/xxx.pdf"],
//     "images": ["/uploads/images/xxx.jpg"],
//     "videos": ["/uploads/videos/xxx.mp4"]
//   }
//
// Unity Example (C#):
//   var body = JsonUtility.ToJson(new { pdfs = new[] { url } });
//   var req = new UnityWebRequest($"{baseUrl}/api/nodes/{nodeId}/files", "DELETE");
//   req.uploadHandler = new UploadHandlerRaw(Encoding.UTF8.GetBytes(body));
//   req.SetRequestHeader("Content-Type", "application/json");
//
const deleteFilesSchema = z.object({
  pdfs: z.array(z.string()).optional().default([]),
  images: z.array(z.string()).optional().default([]),
  videos: z.array(z.string()).optional().default([]),
}).refine((d) => d.pdfs.length > 0 || d.images.length > 0 || d.videos.length > 0, {
  message: 'At least one file URL must be provided',
});

uploadRoutes.delete('/:id/files', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  const parsed = deleteFilesSchema.parse(body);

  // Remove from node record
  const result = await nodeService.removeFiles(id, {
    pdfs: parsed.pdfs,
    images: parsed.images,
    videos: parsed.videos,
  });

  // Delete physical files from disk
  const allUrls = [...parsed.pdfs, ...parsed.images, ...parsed.videos];
  await Promise.all(allUrls.map(deleteFileFromDisk));

  return c.json(
    successResponse(result, {
      deleted: { pdfs: parsed.pdfs, images: parsed.images, videos: parsed.videos },
    })
  );
});

// ─── GET /nodes/:id/files ─────────────────────────────────────────────
// Convenience endpoint — returns only the file arrays for a node.
// Useful for Unity to quickly fetch media URLs without full node data.
// Accepts optional `type` query param (`pdf`, `image`, `video`) to filter results.
//
uploadRoutes.get('/:id/files', async (c) => {
  const id = c.req.param('id');
  const typeFilter = c.req.query('type'); // 'pdf' | 'image' | 'video'

  try {
    const node = await nodeService.getNode(id);

    const result: Record<string, unknown> = { id: node.id };

    if (typeFilter === 'pdf') {
      result.pdfs = node.pdfs;
    } else if (typeFilter === 'image') {
      result.images = node.images;
    } else if (typeFilter === 'video') {
      result.videos = node.videos;
    } else {
      // Default: return all types
      result.pdfs = node.pdfs;
      result.images = node.images;
      result.videos = node.videos;
    }

    return c.json(successResponse(result));
  } catch (err) {
    if (err instanceof AppError) {
      return c.json(errorResponse(err.message, err.code), err.statusCode as 404);
    }
    throw err;
  }
});

export default uploadRoutes;
