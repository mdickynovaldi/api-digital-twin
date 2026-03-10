import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

// ─── Allowed MIME Types ──────────────────────────────────────────────
const ALLOWED_TYPES: Record<string, { exts: string[]; folder: string }> = {
  'application/pdf': { exts: ['pdf'], folder: 'pdfs' },
  'image/jpeg': { exts: ['jpg'], folder: 'images' },
  'image/png': { exts: ['png'], folder: 'images' },
  'image/webp': { exts: ['webp'], folder: 'images' },
  'image/gif': { exts: ['gif'], folder: 'images' },
  'video/mp4': { exts: ['mp4'], folder: 'videos' },
  'video/webm': { exts: ['webm'], folder: 'videos' },
  'video/quicktime': { exts: ['mov'], folder: 'videos' },
};

// Max file sizes
const MAX_SIZE: Record<string, number> = {
  pdfs: 20 * 1024 * 1024,    // 20 MB
  images: 10 * 1024 * 1024,  // 10 MB
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
 * Saves a File object to disk under public/uploads/{folder}/{uuid}.{ext}
 * Returns the public URL path.
 */
export async function saveUploadedFile(
  file: File
): Promise<UploadResult> {
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

  // Ensure directory exists
  const uploadDir = path.join(process.cwd(), 'public', 'uploads', config.folder);
  if (!existsSync(uploadDir)) {
    await mkdir(uploadDir, { recursive: true });
  }

  // Generate unique filename
  const ext = config.exts[0];
  const filename = `${uuidv4()}.${ext}`;
  const filePath = path.join(uploadDir, filename);

  // Write file to disk
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(filePath, buffer);

  const url = `/uploads/${config.folder}/${filename}`;

  return { url, folder: config.folder as 'pdfs' | 'images' | 'videos' };
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
    // Support both "pdfs" and "pdfs[]" field names for Unity/curl compatibility
    const files = formData.getAll(fieldName) as File[];
    const filesAlt = formData.getAll(`${fieldName}[]`) as File[];
    const allFiles = [...files, ...filesAlt].filter(
      (f): f is File => f instanceof File && f.size > 0
    );

    for (const file of allFiles) {
      try {
        const result = await saveUploadedFile(file);
        if (result.folder === 'pdfs') pdfs.push(result.url);
        else if (result.folder === 'images') images.push(result.url);
        else if (result.folder === 'videos') videos.push(result.url);
      } catch (err) {
        errors.push({
          field: fieldName,
          filename: file.name,
          message: err instanceof Error ? err.message : 'Unknown error',
        });
      }
    }
  }

  return { pdfs, images, videos, errors };
}

/**
 * Delete a physical file from disk given its public URL path.
 * Silently ignores if the file doesn't exist.
 */
export async function deleteFileFromDisk(publicUrl: string): Promise<void> {
  try {
    // Only delete files under /uploads/ to prevent path traversal
    if (!publicUrl.startsWith('/uploads/')) return;

    const filePath = path.join(process.cwd(), 'public', publicUrl);
    const { unlink } = await import('fs/promises');
    await unlink(filePath);
  } catch {
    // Silently ignore — file may already be deleted
  }
}
