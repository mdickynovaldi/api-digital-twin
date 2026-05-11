import { prisma } from '@/src/lib/prisma';
import type { AssetNode, DigitalTwinScreenshot, Prisma } from '@prisma/client';

export type ScreenshotWithAssetNode = DigitalTwinScreenshot & {
  assetNode?: Pick<AssetNode, 'id' | 'name' | 'status'> | null;
};

/**
 * Repository layer for Unity digital twin screenshots.
 */
export const screenshotRepository = {
  async create(
    data: Prisma.DigitalTwinScreenshotUncheckedCreateInput
  ): Promise<ScreenshotWithAssetNode> {
    return prisma.digitalTwinScreenshot.create({
      data,
      include: {
        assetNode: {
          select: {
            id: true,
            name: true,
            status: true,
          },
        },
      },
    });
  },

  async findById(id: string): Promise<ScreenshotWithAssetNode | null> {
    return prisma.digitalTwinScreenshot.findUnique({
      where: { id },
      include: {
        assetNode: {
          select: {
            id: true,
            name: true,
            status: true,
          },
        },
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
        include: {
          assetNode: {
            select: {
              id: true,
              name: true,
              status: true,
            },
          },
        },
      }),
      prisma.digitalTwinScreenshot.count({ where }),
    ]);

    return { screenshots, total };
  },
};
