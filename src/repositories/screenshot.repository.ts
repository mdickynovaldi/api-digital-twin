import { prisma } from '@/src/lib/prisma';
import type { AssetNode, DigitalTwinScreenshot, Prisma } from '@prisma/client';

export type ScreenshotWithAssetNode = Omit<DigitalTwinScreenshot, 'fileData'> & {
  assetNode?: Pick<AssetNode, 'id' | 'name' | 'status'> | null;
};

const screenshotSelect = {
  id: true,
  assetNodeId: true,
  title: true,
  description: true,
  fileName: true,
  originalName: true,
  mimeType: true,
  sizeBytes: true,
  url: true,
  storagePath: true,
  capturedAt: true,
  uploadedBy: true,
  metadata: true,
  createdAt: true,
  updatedAt: true,
  assetNode: {
    select: {
      id: true,
      name: true,
      status: true,
    },
  },
} satisfies Prisma.DigitalTwinScreenshotSelect;

/**
 * Repository layer for Unity digital twin screenshots.
 */
export const screenshotRepository = {
  async create(
    data: Prisma.DigitalTwinScreenshotUncheckedCreateInput
  ): Promise<ScreenshotWithAssetNode> {
    return prisma.digitalTwinScreenshot.create({
      data,
      select: screenshotSelect,
    });
  },

  async findById(id: string): Promise<ScreenshotWithAssetNode | null> {
    return prisma.digitalTwinScreenshot.findUnique({
      where: { id },
      select: screenshotSelect,
    });
  },

  async findFileById(id: string): Promise<{
    fileData: Uint8Array;
    mimeType: string;
    originalName: string;
    sizeBytes: number;
  } | null> {
    return prisma.digitalTwinScreenshot.findUnique({
      where: { id },
      select: {
        fileData: true,
        mimeType: true,
        originalName: true,
        sizeBytes: true,
      },
    });
  },

  async findMany(options?: {
    assetNodeId?: string;
    skip?: number;
    take?: number;
  }): Promise<{ screenshots: ScreenshotWithAssetNode[]; total: number }> {
    const where: Prisma.DigitalTwinScreenshotWhereInput = {};

    if (options?.assetNodeId) {
      where.assetNodeId = options.assetNodeId;
    }

    const [screenshots, total] = await Promise.all([
      prisma.digitalTwinScreenshot.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: options?.skip,
        take: options?.take,
        select: screenshotSelect,
      }),
      prisma.digitalTwinScreenshot.count({ where }),
    ]);

    return { screenshots, total };
  },
};
