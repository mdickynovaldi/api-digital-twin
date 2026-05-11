import { randomUUID } from 'node:crypto';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { Prisma } from '@prisma/client';
import { nodeRepository } from '@/src/repositories/node.repository';
import {
  screenshotRepository,
  type ScreenshotWithAssetNode,
} from '@/src/repositories/screenshot.repository';
import type { UploadScreenshotFieldsInput } from '@/src/schemas/screenshot.schema';
import { AppError } from '@/src/middleware';

const UPLOAD_DIRECTORY = path.join(
  process.cwd(),
  'public',
  'uploads',
  'digital-twin-screenshots'
);
const PUBLIC_URL_PREFIX = '/uploads/digital-twin-screenshots';
const DEFAULT_MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES: Record<string, string> = {
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
  'image/webp': '.webp',
};
const MIME_BY_EXTENSION: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
};

function getMaxUploadBytes(): number {
  const configured = Number.parseInt(
    process.env.MAX_SCREENSHOT_UPLOAD_BYTES || '',
    10
  );
  return Number.isFinite(configured) && configured > 0
    ? configured
    : DEFAULT_MAX_UPLOAD_BYTES;
}

function resolveImageType(file: File): { mimeType: string; extension: string } {
  const fileType = file.type.toLowerCase();
  if (ALLOWED_IMAGE_TYPES[fileType]) {
    return {
      mimeType: fileType === 'image/jpg' ? 'image/jpeg' : fileType,
      extension: ALLOWED_IMAGE_TYPES[fileType],
    };
  }

  const extension = path.extname(file.name).toLowerCase();
  const inferredMimeType = MIME_BY_EXTENSION[extension];
  if (inferredMimeType) {
    return {
      mimeType: inferredMimeType,
      extension: inferredMimeType === 'image/jpeg' ? '.jpg' : extension,
    };
  }

  throw new AppError(
    'Unsupported screenshot file type. Use PNG, JPG, or WebP.',
    400,
    'UNSUPPORTED_FILE_TYPE'
  );
}

function transformScreenshot(
  screenshot: ScreenshotWithAssetNode
): Record<string, unknown> {
  return {
    id: screenshot.id,
    asset_node_id: screenshot.assetNodeId,
    asset_node: screenshot.assetNode
      ? {
          id: screenshot.assetNode.id,
          name: screenshot.assetNode.name,
          status: screenshot.assetNode.status,
        }
      : null,
    title: screenshot.title,
    description: screenshot.description,
    file_name: screenshot.fileName,
    original_name: screenshot.originalName,
    mime_type: screenshot.mimeType,
    size_bytes: screenshot.sizeBytes,
    url: screenshot.url,
    captured_at: screenshot.capturedAt?.toISOString() ?? null,
    uploaded_by: screenshot.uploadedBy,
    metadata: screenshot.metadata ?? null,
    created_at: screenshot.createdAt.toISOString(),
    updated_at: screenshot.updatedAt.toISOString(),
  };
}

export const screenshotService = {
  async uploadScreenshot(
    file: File,
    fields: UploadScreenshotFieldsInput
  ): Promise<Record<string, unknown>> {
    if (file.size <= 0) {
      throw new AppError('Screenshot file is required', 400, 'FILE_REQUIRED');
    }

    const maxUploadBytes = getMaxUploadBytes();
    if (file.size > maxUploadBytes) {
      throw new AppError(
        `Screenshot file is too large. Maximum size is ${maxUploadBytes} bytes.`,
        413,
        'FILE_TOO_LARGE'
      );
    }

    if (fields.asset_node_id) {
      const nodeExists = await nodeRepository.exists(fields.asset_node_id);
      if (!nodeExists) {
        throw new AppError('Asset node not found', 404, 'NODE_NOT_FOUND');
      }
    }

    const { mimeType, extension } = resolveImageType(file);
    const fileName = `${randomUUID()}${extension}`;
    const storagePath = path.join(UPLOAD_DIRECTORY, fileName);
    const publicUrl = `${PUBLIC_URL_PREFIX}/${fileName}`;

    await mkdir(UPLOAD_DIRECTORY, { recursive: true });
    await writeFile(storagePath, Buffer.from(await file.arrayBuffer()));

    let created: ScreenshotWithAssetNode;
    try {
      created = await screenshotRepository.create({
        assetNodeId: fields.asset_node_id ?? null,
        title: fields.title ?? '',
        description: fields.description ?? '',
        fileName,
        originalName: path.basename(file.name || fileName),
        mimeType,
        sizeBytes: file.size,
        url: publicUrl,
        storagePath,
        capturedAt: fields.captured_at ? new Date(fields.captured_at) : null,
        uploadedBy: fields.uploaded_by ?? null,
        metadata: fields.metadata as Prisma.InputJsonValue | undefined,
      });
    } catch (error) {
      await unlink(storagePath).catch(() => undefined);
      throw error;
    }

    return transformScreenshot(created);
  },

  async listScreenshots(options?: {
    assetNodeId?: string;
    page?: number;
    limit?: number;
  }): Promise<{
    screenshots: Record<string, unknown>[];
    total: number;
    page: number;
    limit: number;
  }> {
    const page = options?.page ?? 1;
    const limit = options?.limit ?? 50;
    const skip = (page - 1) * limit;

    const { screenshots, total } = await screenshotRepository.findMany({
      assetNodeId: options?.assetNodeId,
      skip,
      take: limit,
    });

    return {
      screenshots: screenshots.map((screenshot) =>
        transformScreenshot(screenshot)
      ),
      total,
      page,
      limit,
    };
  },

  async getScreenshot(id: string): Promise<Record<string, unknown>> {
    const screenshot = await screenshotRepository.findById(id);
    if (!screenshot) {
      throw new AppError('Screenshot not found', 404, 'NOT_FOUND');
    }

    return transformScreenshot(screenshot);
  },
};
