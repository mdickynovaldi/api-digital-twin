import { v2 as cloudinary } from 'cloudinary';

// ─── Cloudinary Config ────────────────────────────────────────────────
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ─── Allowed MIME Types ───────────────────────────────────────────────
const ALLOWED_TYPES: Record<string, { folder: string; resourceType: 'image' | 'video' | 'raw' }> = {
  'application/pdf': { folder: 'pdfs',   resourceType: 'raw' },
  'image/jpeg':      { folder: 'images', resourceType: 'image' },
  'image/png':       { folder: 'images', resourceType: 'image' },
  'image/webp':      { folder: 'images', resourceType: 'image' },
  'image/gif':       { folder: 'images', resourceType: 'image' },
  'video/mp4':       { folder: 'videos', resourceType: 'video' },
  'video/webm':      { folder: 'videos', resourceType: 'video' },
  'video/quicktime': { folder: 'videos', resourceType: 'video' },
};

// ─── Max file sizes ───────────────────────────────────────────────────
const MAX_SIZE: Record<string, number> = {
  pdfs:   20  * 1024 * 1024, // 20 MB
  images: 10  * 1024 * 1024, // 10 MB
  videos: 200 * 1024 * 1024, // 200 MB
};

export interface UploadResult {
  url: string;
  folder: 'pdfs' | 'images' | 'videos';
}

export interface UploadError {
  field: string;
  filename: string;
  message: string;
}

/**
 * Upload a File object to Cloudinary.
 * Returns the secure URL and folder type.
 */
export async function saveUploadedFile(file: File): Promise<UploadResult> {
  const mime = file.type;
  const config = ALLOWED_TYPES[mime];

  if (!config) {
    throw new Error(
      `File "${file.name}" has unsupported type "${mime}". ` +
      `Allowed: PDF, JPEG, PNG, WebP, GIF, MP4, WebM, MOV`
    );
  }

  const maxSize = MAX_SIZE[config.folder];
  if (file.size > maxSize) {
    const limitMb = maxSize / 1024 / 1024;
    throw new Error(
      `File "${file.name}" exceeds max size of ${limitMb}MB for ${config.folder}`
    );
  }

  // Convert File to Buffer, then encode as base64 data URI for serverless compatibility
  const buffer = Buffer.from(await file.arrayBuffer());
  const base64 = buffer.toString('base64');
  const dataUri = `data:${mime};base64,${base64}`;

  // Upload to Cloudinary using base64 data URI (works reliably in serverless/Vercel)
  const result = await cloudinary.uploader.upload(dataUri, {
    folder: `digital-twin/${config.folder}`,
    resource_type: config.resourceType,
  });

  return { url: result.secure_url, folder: config.folder as 'pdfs' | 'images' | 'videos' };
}

/**
 * Process multiple file fields from FormData.
 * Returns grouped URLs and any errors encountered.
 */
export async function processFormFiles(formData: FormData): Promise<{
  pdfs: string[];
  images: string[];
  videos: string[];
  errors: UploadError[];
}> {
  const pdfs: string[] = [];
  const images: string[] = [];
  const videos: string[] = [];
  const errors: UploadError[] = [];

  // Field names Unity can use: pdfs, images, videos (or pdfs[], images[], videos[])
  const fieldMappings = ['pdfs', 'images', 'videos'];

  for (const fieldName of fieldMappings) {
    const files    = formData.getAll(fieldName)        as File[];
    const filesAlt = formData.getAll(`${fieldName}[]`) as File[];
    const allFiles = [...files, ...filesAlt].filter(
      (f): f is File => f instanceof File && f.size > 0
    );

    for (const file of allFiles) {
      try {
        const result = await saveUploadedFile(file);
        if (result.folder === 'pdfs')        pdfs.push(result.url);
        else if (result.folder === 'images') images.push(result.url);
        else if (result.folder === 'videos') videos.push(result.url);
      } catch (err: unknown) {
        let message = 'Unknown error';
        if (err instanceof Error) {
          message = err.message;
        } else if (typeof err === 'object' && err !== null && 'message' in err) {
          message = String((err as Record<string, unknown>).message);
        } else if (typeof err === 'string') {
          message = err;
        }
        console.error(`[upload] Failed to upload "${file.name}":`, err);
        errors.push({ field: fieldName, filename: file.name, message });
      }
    }
  }

  return { pdfs, images, videos, errors };
}

/**
 * Delete a file from Cloudinary given its secure URL.
 * Silently ignores if the file doesn't exist.
 */
export async function deleteFileFromDisk(publicUrl: string): Promise<void> {
  try {
    // Extract public_id from Cloudinary URL
    // e.g. https://res.cloudinary.com/<cloud>/image/upload/v123/digital-twin/images/abc.jpg
    //   → digital-twin/images/abc
    const match = publicUrl.match(/\/upload\/(?:v\d+\/)?(.+?)(?:\.[^.]+)?$/);
    if (!match) return;

    const publicId = match[1];

    // Determine resource_type from path
    let resourceType: 'image' | 'video' | 'raw' = 'image';
    if (publicUrl.includes('/videos/'))   resourceType = 'video';
    else if (publicUrl.includes('/pdfs/')) resourceType = 'raw';

    await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
  } catch {
    // Silently ignore — file may already be deleted or URL format unrecognized
  }
}
