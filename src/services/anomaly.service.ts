import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { AnomalyStatus, UserRole, type Prisma } from '@prisma/client';
import { prisma } from '@/src/lib/prisma';
import { AppError } from '@/src/middleware';
import { nodeRepository } from '@/src/repositories/node.repository';
import { screenshotRepository } from '@/src/repositories/screenshot.repository';
import type { AuthenticatedUser } from '@/src/services/auth.service';
import type {
  ApiAnomalyStatus,
  CreateAnomalyInput,
  ListAnomaliesQueryInput,
  ListUnityMarkersQueryInput,
  RejectAnomalyInput,
  SolveAnomalyInput,
  TransitionNoteInput,
} from '@/src/schemas/anomaly.schema';

const MAINTENANCE_PHOTO_STORAGE_PREFIX = 'db://maintenance_photos';
const DEFAULT_MAX_PHOTO_UPLOAD_BYTES = 10 * 1024 * 1024;

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

const allowedTransitions: Record<AnomalyStatus, AnomalyStatus[]> = {
  [AnomalyStatus.OPEN]: [
    AnomalyStatus.ACKNOWLEDGED,
    AnomalyStatus.IN_PROGRESS,
    AnomalyStatus.RESOLVED,
    AnomalyStatus.REJECTED,
  ],
  [AnomalyStatus.ACKNOWLEDGED]: [
    AnomalyStatus.IN_PROGRESS,
    AnomalyStatus.RESOLVED,
    AnomalyStatus.REJECTED,
  ],
  [AnomalyStatus.IN_PROGRESS]: [
    AnomalyStatus.RESOLVED,
    AnomalyStatus.REJECTED,
  ],
  [AnomalyStatus.RESOLVED]: [],
  [AnomalyStatus.REJECTED]: [],
};

const publicUserSelect = {
  id: true,
  username: true,
  displayName: true,
  role: true,
} satisfies Prisma.UserSelect;

const maintenancePhotoSelect = {
  id: true,
  anomalyId: true,
  caption: true,
  fileName: true,
  originalName: true,
  mimeType: true,
  sizeBytes: true,
  url: true,
  storagePath: true,
  metadata: true,
  createdAt: true,
  updatedAt: true,
  uploadedBy: {
    select: publicUserSelect,
  },
} satisfies Prisma.MaintenancePhotoSelect;

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
  screenshotId: true,
  screenshot: {
    select: {
      id: true,
      title: true,
      description: true,
      url: true,
      capturedAt: true,
      uploadedBy: true,
    },
  },
  title: true,
  description: true,
  severity: true,
  status: true,
  metadata: true,
  reportedBy: {
    select: publicUserSelect,
  },
  assignedMaintenance: {
    select: publicUserSelect,
  },
  solvedBy: {
    select: publicUserSelect,
  },
  solvedAt: true,
  rejectedAt: true,
  unityMarkerVisible: true,
  unityResolvedCheckVisible: true,
  maintenanceResult: {
    select: {
      id: true,
      fieldNotes: true,
      actionsTaken: true,
      metadata: true,
      submittedAt: true,
      createdAt: true,
      updatedAt: true,
      submittedBy: {
        select: publicUserSelect,
      },
    },
  },
  maintenancePhotos: {
    orderBy: { createdAt: 'desc' },
    select: maintenancePhotoSelect,
  },
  auditLogs: {
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      action: true,
      fromStatus: true,
      toStatus: true,
      note: true,
      metadata: true,
      createdAt: true,
      actor: {
        select: publicUserSelect,
      },
    },
  },
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.AnomalyTicketSelect;

type PublicUserPayload = Prisma.UserGetPayload<{ select: typeof publicUserSelect }>;
type MaintenancePhotoPayload = Prisma.MaintenancePhotoGetPayload<{
  select: typeof maintenancePhotoSelect;
}>;
type AnomalyPayload = Prisma.AnomalyTicketGetPayload<{
  select: typeof anomalySelect;
}>;

const allowedPhotoTypes: Record<string, string> = {
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

function getMaxPhotoUploadBytes(): number {
  const configured = Number.parseInt(
    process.env.MAX_MAINTENANCE_PHOTO_UPLOAD_BYTES || '',
    10
  );
  return Number.isFinite(configured) && configured > 0
    ? configured
    : DEFAULT_MAX_PHOTO_UPLOAD_BYTES;
}

function toApiStatus(status: AnomalyStatus | null | undefined): ApiAnomalyStatus | null {
  return status ? apiStatusByPrisma[status] : null;
}

function transformUser(user: PublicUserPayload | null): Record<string, unknown> | null {
  if (!user) return null;
  return {
    id: user.id,
    username: user.username,
    display_name: user.displayName,
    role: user.role === UserRole.OPERATOR ? 'operator' : 'maintenance',
  };
}

function getUnityFlags(status: AnomalyStatus): {
  marker_visible: boolean;
  resolved_check_visible: boolean;
  marker_state: 'anomaly_marker' | 'resolved_check' | 'hidden';
} {
  const apiStatus = apiStatusByPrisma[status];
  const markerVisible = ['open', 'acknowledged', 'in_progress'].includes(apiStatus);
  const resolvedCheckVisible = apiStatus === 'resolved';

  return {
    marker_visible: markerVisible,
    resolved_check_visible: resolvedCheckVisible,
    marker_state: markerVisible
      ? 'anomaly_marker'
      : resolvedCheckVisible
        ? 'resolved_check'
        : 'hidden',
  };
}

function getUnityUpdateData(status: AnomalyStatus): {
  unityMarkerVisible: boolean;
  unityResolvedCheckVisible: boolean;
} {
  const flags = getUnityFlags(status);
  return {
    unityMarkerVisible: flags.marker_visible,
    unityResolvedCheckVisible: flags.resolved_check_visible,
  };
}

function transformPhoto(photo: MaintenancePhotoPayload): Record<string, unknown> {
  return {
    id: photo.id,
    anomaly_id: photo.anomalyId,
    caption: photo.caption,
    file_name: photo.fileName,
    original_name: photo.originalName,
    mime_type: photo.mimeType,
    size_bytes: photo.sizeBytes,
    url: photo.url,
    storage_path: photo.storagePath,
    metadata: photo.metadata ?? null,
    uploaded_by: transformUser(photo.uploadedBy),
    created_at: photo.createdAt.toISOString(),
    updated_at: photo.updatedAt.toISOString(),
  };
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
    screenshot_id: anomaly.screenshotId,
    screenshot: anomaly.screenshot
      ? {
          id: anomaly.screenshot.id,
          title: anomaly.screenshot.title,
          description: anomaly.screenshot.description,
          url: anomaly.screenshot.url,
          captured_at: anomaly.screenshot.capturedAt?.toISOString() ?? null,
          uploaded_by: anomaly.screenshot.uploadedBy,
        }
      : null,
    title: anomaly.title,
    description: anomaly.description,
    severity: anomaly.severity,
    status: toApiStatus(anomaly.status),
    metadata: anomaly.metadata ?? null,
    reported_by: transformUser(anomaly.reportedBy),
    assigned_maintenance: transformUser(anomaly.assignedMaintenance),
    solved_by: transformUser(anomaly.solvedBy),
    reported_at: anomaly.createdAt.toISOString(),
    solved_at: anomaly.solvedAt?.toISOString() ?? null,
    rejected_at: anomaly.rejectedAt?.toISOString() ?? null,
    unity_flags: {
      ...getUnityFlags(anomaly.status),
      marker_visible: anomaly.unityMarkerVisible,
      resolved_check_visible: anomaly.unityResolvedCheckVisible,
    },
    maintenance_result: anomaly.maintenanceResult
      ? {
          id: anomaly.maintenanceResult.id,
          field_notes: anomaly.maintenanceResult.fieldNotes,
          actions_taken: anomaly.maintenanceResult.actionsTaken,
          metadata: anomaly.maintenanceResult.metadata ?? null,
          submitted_by: transformUser(anomaly.maintenanceResult.submittedBy),
          submitted_at: anomaly.maintenanceResult.submittedAt.toISOString(),
          created_at: anomaly.maintenanceResult.createdAt.toISOString(),
          updated_at: anomaly.maintenanceResult.updatedAt.toISOString(),
        }
      : null,
    maintenance_photos: anomaly.maintenancePhotos.map(transformPhoto),
    audit_trail: anomaly.auditLogs.map((log) => ({
      id: log.id,
      action: log.action,
      from_status: toApiStatus(log.fromStatus),
      to_status: toApiStatus(log.toStatus),
      note: log.note,
      metadata: log.metadata ?? null,
      actor: transformUser(log.actor),
      created_at: log.createdAt.toISOString(),
    })),
    created_at: anomaly.createdAt.toISOString(),
    updated_at: anomaly.updatedAt.toISOString(),
  };
}

function transformUnityMarker(anomaly: AnomalyPayload): Record<string, unknown> {
  return {
    anomaly_id: anomaly.id,
    asset_node_id: anomaly.assetNodeId,
    asset_node: anomaly.assetNode
      ? {
          id: anomaly.assetNode.id,
          name: anomaly.assetNode.name,
          status: anomaly.assetNode.status,
        }
      : null,
    title: anomaly.title,
    severity: anomaly.severity,
    status: toApiStatus(anomaly.status),
    unity_flags: {
      ...getUnityFlags(anomaly.status),
      marker_visible: anomaly.unityMarkerVisible,
      resolved_check_visible: anomaly.unityResolvedCheckVisible,
    },
    reported_at: anomaly.createdAt.toISOString(),
    resolved_at: anomaly.solvedAt?.toISOString() ?? null,
    updated_at: anomaly.updatedAt.toISOString(),
  };
}

function ensureTransition(from: AnomalyStatus, to: AnomalyStatus) {
  if (from === to) return;
  if (!allowedTransitions[from].includes(to)) {
    throw new AppError(
      `Cannot change anomaly status from ${apiStatusByPrisma[from]} to ${apiStatusByPrisma[to]}`,
      400,
      'INVALID_STATUS_TRANSITION'
    );
  }
}

function resolvePhotoType(file: File): { mimeType: string; extension: string } {
  const fileType = file.type.toLowerCase();
  if (allowedPhotoTypes[fileType]) {
    return {
      mimeType: fileType === 'image/jpg' ? 'image/jpeg' : fileType,
      extension: allowedPhotoTypes[fileType],
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
    'Unsupported maintenance photo type. Use PNG, JPG, or WebP.',
    400,
    'UNSUPPORTED_FILE_TYPE'
  );
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

export const anomalyService = {
  async createAnomaly(
    input: CreateAnomalyInput,
    actor: AuthenticatedUser
  ): Promise<Record<string, unknown>> {
    const nodeExists = await nodeRepository.exists(input.asset_node_id);
    if (!nodeExists) {
      throw new AppError('Asset node not found', 404, 'NODE_NOT_FOUND');
    }

    if (input.screenshot_id) {
      const screenshot = await screenshotRepository.findById(input.screenshot_id);
      if (!screenshot) {
        throw new AppError('Screenshot not found', 404, 'SCREENSHOT_NOT_FOUND');
      }
    }

    const created = await prisma.$transaction(async (tx) => {
      const anomaly = await tx.anomalyTicket.create({
        data: {
          assetNodeId: input.asset_node_id,
          screenshotId: input.screenshot_id ?? null,
          title: input.title,
          description: input.description,
          severity: input.severity,
          status: AnomalyStatus.OPEN,
          reportedById: actor.id,
          ...getUnityUpdateData(AnomalyStatus.OPEN),
          metadata: input.metadata as Prisma.InputJsonValue | undefined,
        },
        select: { id: true },
      });

      await tx.anomalyAuditLog.create({
        data: {
          anomalyId: anomaly.id,
          actorId: actor.id,
          action: 'report',
          toStatus: AnomalyStatus.OPEN,
          note: 'Anomaly reported',
        },
      });

      const maintenanceUsers = await tx.user.findMany({
        where: {
          role: UserRole.MAINTENANCE,
          isActive: true,
        },
        select: { id: true },
      });

      if (maintenanceUsers.length > 0) {
        await tx.notification.createMany({
          data: maintenanceUsers.map((user) => ({
            recipientId: user.id,
            anomalyId: anomaly.id,
            type: 'anomaly_reported',
            title: 'New anomaly reported',
            message: input.title,
          })),
        });
      }

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
    } else if (!options.include_rejected) {
      where.status = { not: AnomalyStatus.REJECTED };
    }
    if (options.asset_node_id) where.assetNodeId = options.asset_node_id;
    if (options.screenshot_id) where.screenshotId = options.screenshot_id;
    if (options.assigned_to_me) where.assignedMaintenanceId = actor.id;
    if (options.reported_by_me) where.reportedById = actor.id;

    const skip = (options.page - 1) * options.limit;
    const [anomalies, total] = await Promise.all([
      prisma.anomalyTicket.findMany({
        where,
        orderBy: { createdAt: 'desc' },
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

  async getAnomaly(id: string): Promise<Record<string, unknown>> {
    return transformAnomaly(await findAnomalyOrThrow(id));
  },

  async acknowledgeAnomaly(
    id: string,
    input: TransitionNoteInput,
    actor: AuthenticatedUser
  ): Promise<Record<string, unknown>> {
    return this.transitionAnomaly(id, AnomalyStatus.ACKNOWLEDGED, 'acknowledge', input.note, actor);
  },

  async startAnomaly(
    id: string,
    input: TransitionNoteInput,
    actor: AuthenticatedUser
  ): Promise<Record<string, unknown>> {
    return this.transitionAnomaly(id, AnomalyStatus.IN_PROGRESS, 'start_progress', input.note, actor);
  },

  async rejectAnomaly(
    id: string,
    input: RejectAnomalyInput,
    actor: AuthenticatedUser
  ): Promise<Record<string, unknown>> {
    return this.transitionAnomaly(id, AnomalyStatus.REJECTED, 'reject', input.reason, actor);
  },

  async solveAnomaly(
    id: string,
    input: SolveAnomalyInput,
    actor: AuthenticatedUser
  ): Promise<Record<string, unknown>> {
    const existing = await findAnomalyOrThrow(id);
    ensureTransition(existing.status, AnomalyStatus.RESOLVED);

    const solvedAt = input.solved_at ? new Date(input.solved_at) : new Date();
    const updated = await prisma.$transaction(async (tx) => {
      await tx.anomalyTicket.update({
        where: { id },
        data: {
          status: AnomalyStatus.RESOLVED,
          assignedMaintenanceId: existing.assignedMaintenance ? undefined : actor.id,
          solvedById: actor.id,
          solvedAt,
          rejectedAt: null,
          ...getUnityUpdateData(AnomalyStatus.RESOLVED),
        },
      });

      await tx.maintenanceResult.upsert({
        where: { anomalyId: id },
        create: {
          anomalyId: id,
          submittedById: actor.id,
          fieldNotes: input.field_notes,
          actionsTaken: input.actions_taken,
          metadata: input.metadata as Prisma.InputJsonValue | undefined,
          submittedAt: solvedAt,
        },
        update: {
          submittedById: actor.id,
          fieldNotes: input.field_notes,
          actionsTaken: input.actions_taken,
          metadata: input.metadata as Prisma.InputJsonValue | undefined,
          submittedAt: solvedAt,
        },
      });

      await tx.anomalyAuditLog.create({
        data: {
          anomalyId: id,
          actorId: actor.id,
          action: 'solve',
          fromStatus: existing.status,
          toStatus: AnomalyStatus.RESOLVED,
          note: input.field_notes,
          metadata: input.metadata as Prisma.InputJsonValue | undefined,
        },
      });

      return tx.anomalyTicket.findUniqueOrThrow({
        where: { id },
        select: anomalySelect,
      });
    });

    return transformAnomaly(updated);
  },

  async transitionAnomaly(
    id: string,
    status: AnomalyStatus,
    action: string,
    note: string,
    actor: AuthenticatedUser
  ): Promise<Record<string, unknown>> {
    const existing = await findAnomalyOrThrow(id);
    ensureTransition(existing.status, status);

    const updated = await prisma.$transaction(async (tx) => {
      await tx.anomalyTicket.update({
        where: { id },
        data: {
          status,
          assignedMaintenanceId:
            status === AnomalyStatus.ACKNOWLEDGED || status === AnomalyStatus.IN_PROGRESS
              ? actor.id
              : undefined,
          solvedById: status === AnomalyStatus.RESOLVED ? actor.id : undefined,
          solvedAt: status === AnomalyStatus.RESOLVED ? new Date() : undefined,
          rejectedAt: status === AnomalyStatus.REJECTED ? new Date() : null,
          ...getUnityUpdateData(status),
        },
      });

      await tx.anomalyAuditLog.create({
        data: {
          anomalyId: id,
          actorId: actor.id,
          action,
          fromStatus: existing.status,
          toStatus: status,
          note,
        },
      });

      return tx.anomalyTicket.findUniqueOrThrow({
        where: { id },
        select: anomalySelect,
      });
    });

    return transformAnomaly(updated);
  },

  async uploadMaintenancePhotos(
    anomalyId: string,
    files: File[],
    fields: {
      caption?: string;
      metadata?: unknown;
    },
    actor: AuthenticatedUser
  ): Promise<Record<string, unknown>[]> {
    await findAnomalyOrThrow(anomalyId);

    if (files.length === 0) {
      throw new AppError('At least one maintenance photo is required', 400, 'FILE_REQUIRED');
    }

    const maxPhotoBytes = getMaxPhotoUploadBytes();
    const photoInputs: Prisma.MaintenancePhotoUncheckedCreateInput[] = [];

    for (const file of files) {
      if (file.size <= 0) {
        throw new AppError('Maintenance photo file is empty', 400, 'FILE_REQUIRED');
      }
      if (file.size > maxPhotoBytes) {
        throw new AppError(
          `Maintenance photo is too large. Maximum size is ${maxPhotoBytes} bytes.`,
          413,
          'FILE_TOO_LARGE'
        );
      }

      const { mimeType, extension } = resolvePhotoType(file);
      const photoId = randomUUID();
      const fileName = `${randomUUID()}${extension}`;

      photoInputs.push({
        id: photoId,
        anomalyId,
        uploadedById: actor.id,
        caption: fields.caption ?? '',
        fileName,
        originalName: path.basename(file.name || fileName),
        mimeType,
        sizeBytes: file.size,
        fileData: Buffer.from(await file.arrayBuffer()),
        url: `/api/maintenance/photos/${photoId}/file`,
        storagePath: `${MAINTENANCE_PHOTO_STORAGE_PREFIX}/${photoId}`,
        metadata: fields.metadata as Prisma.InputJsonValue | undefined,
      });
    }

    const created = await prisma.$transaction(async (tx) => {
      const photos: MaintenancePhotoPayload[] = [];
      for (const data of photoInputs) {
        photos.push(
          await tx.maintenancePhoto.create({
            data,
            select: maintenancePhotoSelect,
          })
        );
      }

      await tx.anomalyAuditLog.create({
        data: {
          anomalyId,
          actorId: actor.id,
          action: 'upload_maintenance_photo',
          note: `${photos.length} maintenance photo(s) uploaded`,
        },
      });

      return photos;
    });

    return created.map(transformPhoto);
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

  async listUnityMarkers(options: ListUnityMarkersQueryInput): Promise<{
    markers: Record<string, unknown>[];
    total: number;
    page: number;
    limit: number;
  }> {
    const where: Prisma.AnomalyTicketWhereInput = {};

    if (options.status) {
      where.status = prismaStatusByApi[options.status];
    } else if (!options.include_rejected) {
      where.status = { not: AnomalyStatus.REJECTED };
    }
    if (options.asset_node_id) where.assetNodeId = options.asset_node_id;

    const skip = (options.page - 1) * options.limit;
    const [anomalies, total] = await Promise.all([
      prisma.anomalyTicket.findMany({
        where,
        orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
        skip,
        take: options.limit,
        select: anomalySelect,
      }),
      prisma.anomalyTicket.count({ where }),
    ]);

    return {
      markers: anomalies.map(transformUnityMarker),
      total,
      page: options.page,
      limit: options.limit,
    };
  },
};
