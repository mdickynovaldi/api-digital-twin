import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { AnomalyStatus, UserRole, type Prisma } from '@prisma/client';
import { prisma } from '@/src/lib/prisma';
import { AppError } from '@/src/middleware';
import { nodeRepository } from '@/src/repositories/node.repository';
import type { AuthenticatedUser } from '@/src/services/auth.service';
import type {
  AcknowledgeAnomalyInput,
  ApiAnomalyStatus,
  CreateAnomalyFieldsInput,
  ListAnomaliesQueryInput,
  ResolveAnomalyFieldsInput,
  UnitySyncQueryInput,
  UpdateAnomalyStatusInput,
} from '@/src/schemas/anomaly.schema';

const SCREENSHOT_STORAGE_PREFIX = 'db://digital_twin_screenshots';
const RESOLUTION_PHOTO_STORAGE_PREFIX = 'db://maintenance_photos';
const DEFAULT_MAX_IMAGE_UPLOAD_BYTES = 10 * 1024 * 1024;

const apiStatusByPrisma: Record<AnomalyStatus, ApiAnomalyStatus> = {
  [AnomalyStatus.OPEN]: 'open',
  [AnomalyStatus.ACKNOWLEDGED]: 'acknowledged',
  [AnomalyStatus.IN_PROGRESS]: 'in_progress',
  [AnomalyStatus.RESOLVED]: 'resolved',
  [AnomalyStatus.REJECTED]: 'rejected',
};

const prismaStatusByApi: Record<ApiAnomalyStatus, AnomalyStatus> = {
  open: AnomalyStatus.OPEN,
  acknowledged: AnomalyStatus.ACKNOWLEDGED,
  in_progress: AnomalyStatus.IN_PROGRESS,
  resolved: AnomalyStatus.RESOLVED,
  rejected: AnomalyStatus.REJECTED,
};

const allowedImageTypes: Record<string, string> = {
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
  'image/webp': '.webp',
};

const mimeByExtension: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
};

const anomalySelect = {
  id: true,
  assetNodeId: true,
  assetNode: {
    select: {
      id: true,
      name: true,
      status: true,
    },
  },
  title: true,
  description: true,
  anomalyType: true,
  severity: true,
  status: true,
  screenshotUrl: true,
  capturedAt: true,
  reportedByName: true,
  reportedById: true,
  acknowledgedBy: true,
  acknowledgedAt: true,
  assignedTo: true,
  assignedMaintenanceId: true,
  resolutionNote: true,
  resolutionPhotoUrl: true,
  resolvedByName: true,
  solvedAt: true,
  metadata: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.AnomalyTicketSelect;

type AnomalyPayload = Prisma.AnomalyTicketGetPayload<{
  select: typeof anomalySelect;
}>;

function getMaxImageUploadBytes(): number {
  const configured = Number.parseInt(
    process.env.MAX_ANOMALY_IMAGE_UPLOAD_BYTES ||
      process.env.MAX_SCREENSHOT_UPLOAD_BYTES ||
      '',
    10
  );
  return Number.isFinite(configured) && configured > 0
    ? configured
    : DEFAULT_MAX_IMAGE_UPLOAD_BYTES;
}

function resolveImageType(file: File): { mimeType: string; extension: string } {
  const fileType = file.type.toLowerCase();
  if (allowedImageTypes[fileType]) {
    return {
      mimeType: fileType === 'image/jpg' ? 'image/jpeg' : fileType,
      extension: allowedImageTypes[fileType],
    };
  }

  const extension = path.extname(file.name).toLowerCase();
  const inferredMimeType = mimeByExtension[extension];
  if (inferredMimeType) {
    return {
      mimeType: inferredMimeType,
      extension: inferredMimeType === 'image/jpeg' ? '.jpg' : extension,
    };
  }

  throw new AppError(
    'Unsupported image type. Use PNG, JPG, or WebP.',
    400,
    'UNSUPPORTED_FILE_TYPE'
  );
}

async function buildImageInput(
  file: File,
  options: {
    urlPrefix: string;
    storagePrefix: string;
  }
): Promise<{
  id: string;
  fileName: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  fileData: Uint8Array<ArrayBuffer>;
  url: string;
  storagePath: string;
}> {
  if (file.size <= 0) {
    throw new AppError('Image file is required', 400, 'FILE_REQUIRED');
  }

  const maxBytes = getMaxImageUploadBytes();
  if (file.size > maxBytes) {
    throw new AppError(
      `Image file is too large. Maximum size is ${maxBytes} bytes.`,
      413,
      'FILE_TOO_LARGE'
    );
  }

  const { mimeType, extension } = resolveImageType(file);
  const id = randomUUID();
  const fileName = `${randomUUID()}${extension}`;

  return {
    id,
    fileName,
    originalName: path.basename(file.name || fileName),
    mimeType,
    sizeBytes: file.size,
    fileData: new Uint8Array(await file.arrayBuffer()) as Uint8Array<ArrayBuffer>,
    url: `${options.urlPrefix}/${id}/file`,
    storagePath: `${options.storagePrefix}/${id}`,
  };
}

function toApiStatus(status: AnomalyStatus): ApiAnomalyStatus {
  return apiStatusByPrisma[status];
}

function toMarkerState(
  status: AnomalyStatus
): 'none' | 'active_anomaly' | 'resolved' {
  if (
    status === AnomalyStatus.OPEN ||
    status === AnomalyStatus.ACKNOWLEDGED ||
    status === AnomalyStatus.IN_PROGRESS
  ) {
    return 'active_anomaly';
  }
  if (status === AnomalyStatus.RESOLVED) {
    return 'resolved';
  }
  return 'none';
}

function transformAnomaly(anomaly: AnomalyPayload): Record<string, unknown> {
  return {
    id: anomaly.id,
    asset_node_id: anomaly.assetNodeId,
    asset_node: anomaly.assetNode
      ? {
          id: anomaly.assetNode.id,
          name: anomaly.assetNode.name,
          status: anomaly.assetNode.status,
        }
      : null,
    title: anomaly.title,
    description: anomaly.description,
    anomaly_type: anomaly.anomalyType,
    severity: anomaly.severity,
    status: toApiStatus(anomaly.status),
    marker_state: toMarkerState(anomaly.status),
    screenshot_url: anomaly.screenshotUrl,
    captured_at: anomaly.capturedAt?.toISOString() ?? null,
    reported_by: anomaly.reportedByName,
    acknowledged_by: anomaly.acknowledgedBy,
    acknowledged_at: anomaly.acknowledgedAt?.toISOString() ?? null,
    assigned_to: anomaly.assignedTo,
    resolution_note: anomaly.resolutionNote,
    resolution_photo_url: anomaly.resolutionPhotoUrl,
    resolved_by: anomaly.resolvedByName,
    resolved_at: anomaly.solvedAt?.toISOString() ?? null,
    metadata: anomaly.metadata ?? null,
    created_at: anomaly.createdAt.toISOString(),
    updated_at: anomaly.updatedAt.toISOString(),
  };
}

function transformSyncItem(anomaly: AnomalyPayload): Record<string, unknown> {
  return {
    asset_node_id: anomaly.assetNodeId,
    anomaly_id: anomaly.id,
    status: toApiStatus(anomaly.status),
    severity: anomaly.severity,
    marker_state: toMarkerState(anomaly.status),
    updated_at: anomaly.updatedAt.toISOString(),
  };
}

async function findAnomalyOrThrow(id: string): Promise<AnomalyPayload> {
  const anomaly = await prisma.anomalyTicket.findUnique({
    where: { id },
    select: anomalySelect,
  });
  if (!anomaly) {
    throw new AppError('Anomaly not found', 404, 'ANOMALY_NOT_FOUND');
  }

  return anomaly;
}

function assertCanReadAnomaly(anomaly: AnomalyPayload, actor: AuthenticatedUser) {
  if (
    actor.role === 'admin' ||
    actor.role === 'maintenance' ||
    actor.role === 'unity-client'
  ) {
    return;
  }

  if (actor.role === 'operator' && anomaly.reportedById === actor.id) {
    return;
  }

  throw new AppError('Forbidden for this anomaly', 403, 'FORBIDDEN');
}

export const anomalyService = {
  async createAnomaly(
    fields: CreateAnomalyFieldsInput,
    screenshot: File,
    actor: AuthenticatedUser
  ): Promise<Record<string, unknown>> {
    const nodeExists = await nodeRepository.exists(fields.asset_node_id);
    if (!nodeExists) {
      throw new AppError('Asset node not found', 404, 'NODE_NOT_FOUND');
    }

    const capturedAt = fields.captured_at ? new Date(fields.captured_at) : null;
    const reportedBy =
      fields.reported_by || actor.display_name || actor.username || null;
    const screenshotInput = await buildImageInput(screenshot, {
      urlPrefix: '/api/screenshots',
      storagePrefix: SCREENSHOT_STORAGE_PREFIX,
    });

    const created = await prisma.$transaction(async (tx) => {
      const screenshotRow = await tx.digitalTwinScreenshot.create({
        data: {
          id: screenshotInput.id,
          assetNodeId: fields.asset_node_id,
          title: fields.title,
          description: fields.description,
          fileName: screenshotInput.fileName,
          originalName: screenshotInput.originalName,
          mimeType: screenshotInput.mimeType,
          sizeBytes: screenshotInput.sizeBytes,
          fileData: screenshotInput.fileData,
          url: screenshotInput.url,
          storagePath: screenshotInput.storagePath,
          capturedAt,
          uploadedBy: reportedBy,
          metadata: fields.metadata as Prisma.InputJsonValue | undefined,
        },
      });

      const anomaly = await tx.anomalyTicket.create({
        data: {
          assetNodeId: fields.asset_node_id,
          screenshotId: screenshotRow.id,
          title: fields.title,
          description: fields.description,
          anomalyType: fields.anomaly_type,
          severity: fields.severity,
          status: AnomalyStatus.OPEN,
          screenshotUrl: screenshotRow.url,
          capturedAt,
          reportedByName: reportedBy,
          reportedById: actor.id,
          unityMarkerVisible: true,
          unityResolvedCheckVisible: false,
          metadata: fields.metadata as Prisma.InputJsonValue | undefined,
        },
        select: { id: true },
      });

      await tx.notification.create({
        data: {
          userRole: UserRole.MAINTENANCE,
          anomalyId: anomaly.id,
          assetNodeId: fields.asset_node_id,
          type: 'anomaly_created',
          title: `New anomaly: ${fields.title}`,
          message: fields.description,
        },
      });

      await tx.anomalyAuditLog.create({
        data: {
          anomalyId: anomaly.id,
          actorId: actor.id,
          action: 'anomaly_created',
          toStatus: AnomalyStatus.OPEN,
          note: fields.description,
        },
      });

      return tx.anomalyTicket.findUniqueOrThrow({
        where: { id: anomaly.id },
        select: anomalySelect,
      });
    });

    return transformAnomaly(created);
  },

  async listAnomalies(
    options: ListAnomaliesQueryInput,
    actor: AuthenticatedUser
  ): Promise<{
    anomalies: Record<string, unknown>[];
    total: number;
    page: number;
    limit: number;
  }> {
    const where: Prisma.AnomalyTicketWhereInput = {};

    if (options.status) {
      where.status = prismaStatusByApi[options.status];
    }
    if (options.severity) {
      where.severity = options.severity;
    }
    if (options.asset_node_id) {
      where.assetNodeId = options.asset_node_id;
    }
    if (options.assigned_to) {
      where.assignedTo = options.assigned_to;
    }
    if (actor.role === 'operator') {
      where.reportedById = actor.id;
    }

    const skip = (options.page - 1) * options.limit;
    const [anomalies, total] = await Promise.all([
      prisma.anomalyTicket.findMany({
        where,
        orderBy: {
          createdAt: options.sort === 'oldest' ? 'asc' : 'desc',
        },
        skip,
        take: options.limit,
        select: anomalySelect,
      }),
      prisma.anomalyTicket.count({ where }),
    ]);

    return {
      anomalies: anomalies.map(transformAnomaly),
      total,
      page: options.page,
      limit: options.limit,
    };
  },

  async getAnomaly(
    id: string,
    actor: AuthenticatedUser
  ): Promise<Record<string, unknown>> {
    const anomaly = await findAnomalyOrThrow(id);
    assertCanReadAnomaly(anomaly, actor);
    return transformAnomaly(anomaly);
  },

  async acknowledgeAnomaly(
    id: string,
    input: AcknowledgeAnomalyInput,
    actor: AuthenticatedUser
  ): Promise<Record<string, unknown>> {
    const existing = await findAnomalyOrThrow(id);

    const updated = await prisma.$transaction(async (tx) => {
      await tx.anomalyTicket.update({
        where: { id },
        data: {
          status: AnomalyStatus.ACKNOWLEDGED,
          acknowledgedBy: input.acknowledged_by,
          acknowledgedAt: new Date(),
          assignedTo: input.assigned_to ?? input.acknowledged_by,
          assignedMaintenanceId:
            actor.role === 'maintenance' || actor.role === 'admin'
              ? actor.id
              : undefined,
          unityMarkerVisible: true,
          unityResolvedCheckVisible: false,
        },
      });

      await tx.notification.create({
        data: {
          userRole: UserRole.MAINTENANCE,
          anomalyId: id,
          assetNodeId: existing.assetNodeId,
          type: 'anomaly_acknowledged',
          title: `Anomaly acknowledged: ${existing.title}`,
          message: input.note || input.acknowledged_by,
        },
      });

      await tx.anomalyAuditLog.create({
        data: {
          anomalyId: id,
          actorId: actor.id,
          action: 'anomaly_acknowledged',
          fromStatus: existing.status,
          toStatus: AnomalyStatus.ACKNOWLEDGED,
          note: input.note ?? '',
        },
      });

      return tx.anomalyTicket.findUniqueOrThrow({
        where: { id },
        select: anomalySelect,
      });
    });

    return transformAnomaly(updated);
  },

  async updateStatus(
    id: string,
    input: UpdateAnomalyStatusInput,
    actor: AuthenticatedUser
  ): Promise<Record<string, unknown>> {
    const existing = await findAnomalyOrThrow(id);
    const nextStatus = prismaStatusByApi[input.status];
    const statusData: Prisma.AnomalyTicketUncheckedUpdateInput = {
      status: nextStatus,
      unityMarkerVisible: toMarkerState(nextStatus) === 'active_anomaly',
      unityResolvedCheckVisible: toMarkerState(nextStatus) === 'resolved',
    };

    if (nextStatus === AnomalyStatus.ACKNOWLEDGED) {
      statusData.acknowledgedBy = input.updated_by;
      statusData.acknowledgedAt = existing.acknowledgedAt ?? new Date();
    }
    if (nextStatus === AnomalyStatus.RESOLVED) {
      statusData.resolvedByName = input.updated_by;
      statusData.solvedById =
        actor.role === 'maintenance' || actor.role === 'admin'
          ? actor.id
          : undefined;
      statusData.solvedAt = existing.solvedAt ?? new Date();
    }
    if (nextStatus === AnomalyStatus.REJECTED) {
      statusData.rejectedAt = new Date();
    }

    const updated = await prisma.$transaction(async (tx) => {
      await tx.anomalyTicket.update({
        where: { id },
        data: statusData,
      });

      await tx.anomalyAuditLog.create({
        data: {
          anomalyId: id,
          actorId: actor.id,
          action: 'status_updated',
          fromStatus: existing.status,
          toStatus: nextStatus,
          note: input.note ?? '',
          metadata: {
            updated_by: input.updated_by,
          },
        },
      });

      return tx.anomalyTicket.findUniqueOrThrow({
        where: { id },
        select: anomalySelect,
      });
    });

    return transformAnomaly(updated);
  },

  async resolveAnomaly(
    id: string,
    fields: ResolveAnomalyFieldsInput,
    photo: File,
    actor: AuthenticatedUser
  ): Promise<Record<string, unknown>> {
    const existing = await findAnomalyOrThrow(id);
    const photoInput = await buildImageInput(photo, {
      urlPrefix: '/api/maintenance/photos',
      storagePrefix: RESOLUTION_PHOTO_STORAGE_PREFIX,
    });
    const resolvedAt = new Date();

    const updated = await prisma.$transaction(async (tx) => {
      await tx.maintenancePhoto.create({
        data: {
          id: photoInput.id,
          anomalyId: id,
          uploadedById:
            actor.role === 'maintenance' || actor.role === 'admin'
              ? actor.id
              : null,
          caption: fields.resolution_note,
          fileName: photoInput.fileName,
          originalName: photoInput.originalName,
          mimeType: photoInput.mimeType,
          sizeBytes: photoInput.sizeBytes,
          fileData: photoInput.fileData,
          url: photoInput.url,
          storagePath: photoInput.storagePath,
          metadata: fields.metadata as Prisma.InputJsonValue | undefined,
        },
      });

      await tx.maintenanceResult.upsert({
        where: { anomalyId: id },
        create: {
          anomalyId: id,
          submittedById:
            actor.role === 'maintenance' || actor.role === 'admin'
              ? actor.id
              : null,
          fieldNotes: fields.resolution_note,
          actionsTaken: [],
          metadata: fields.metadata as Prisma.InputJsonValue | undefined,
          submittedAt: resolvedAt,
        },
        update: {
          submittedById:
            actor.role === 'maintenance' || actor.role === 'admin'
              ? actor.id
              : null,
          fieldNotes: fields.resolution_note,
          metadata: fields.metadata as Prisma.InputJsonValue | undefined,
          submittedAt: resolvedAt,
        },
      });

      await tx.anomalyTicket.update({
        where: { id },
        data: {
          status: AnomalyStatus.RESOLVED,
          resolutionNote: fields.resolution_note,
          resolutionPhotoUrl: photoInput.url,
          resolvedByName: fields.resolved_by,
          solvedById:
            actor.role === 'maintenance' || actor.role === 'admin'
              ? actor.id
              : undefined,
          solvedAt: resolvedAt,
          unityMarkerVisible: false,
          unityResolvedCheckVisible: true,
        },
      });

      await tx.notification.create({
        data: {
          userRole: UserRole.MAINTENANCE,
          anomalyId: id,
          assetNodeId: existing.assetNodeId,
          type: 'anomaly_resolved',
          title: `Anomaly resolved: ${existing.title}`,
          message: fields.resolution_note,
        },
      });

      await tx.anomalyAuditLog.create({
        data: {
          anomalyId: id,
          actorId: actor.id,
          action: 'anomaly_resolved',
          fromStatus: existing.status,
          toStatus: AnomalyStatus.RESOLVED,
          note: fields.resolution_note,
          metadata: fields.metadata as Prisma.InputJsonValue | undefined,
        },
      });

      return tx.anomalyTicket.findUniqueOrThrow({
        where: { id },
        select: anomalySelect,
      });
    });

    return transformAnomaly(updated);
  },

  async listActiveByAsset(
    assetNodeId: string
  ): Promise<Record<string, unknown>[]> {
    const anomalies = await prisma.anomalyTicket.findMany({
      where: {
        assetNodeId,
        status: {
          in: [
            AnomalyStatus.OPEN,
            AnomalyStatus.ACKNOWLEDGED,
            AnomalyStatus.IN_PROGRESS,
          ],
        },
      },
      orderBy: { updatedAt: 'desc' },
      select: anomalySelect,
    });

    return anomalies.map(transformAnomaly);
  },

  async getLatestByAsset(
    assetNodeId: string
  ): Promise<Record<string, unknown> | null> {
    const anomaly = await prisma.anomalyTicket.findFirst({
      where: { assetNodeId },
      orderBy: { updatedAt: 'desc' },
      select: anomalySelect,
    });

    return anomaly ? transformAnomaly(anomaly) : null;
  },

  async syncForUnity(
    options: UnitySyncQueryInput
  ): Promise<Record<string, unknown>[]> {
    const where: Prisma.AnomalyTicketWhereInput = {};
    if (options.since) {
      where.updatedAt = {
        gt: new Date(options.since),
      };
    }

    const anomalies = await prisma.anomalyTicket.findMany({
      where,
      orderBy: { updatedAt: 'asc' },
      select: anomalySelect,
    });

    return anomalies.map(transformSyncItem);
  },

  async getMaintenancePhotoFile(id: string): Promise<{
    fileData: Uint8Array;
    mimeType: string;
    originalName: string;
    sizeBytes: number;
  }> {
    const file = await prisma.maintenancePhoto.findUnique({
      where: { id },
      select: {
        fileData: true,
        mimeType: true,
        originalName: true,
        sizeBytes: true,
      },
    });
    if (!file) {
      throw new AppError('Maintenance photo not found', 404, 'PHOTO_NOT_FOUND');
    }

    return file;
  },
};
