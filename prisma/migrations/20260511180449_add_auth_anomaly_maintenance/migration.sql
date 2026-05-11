-- CreateEnum
CREATE TYPE "user_role" AS ENUM ('operator', 'maintenance');

-- CreateEnum
CREATE TYPE "anomaly_status" AS ENUM ('open', 'acknowledged', 'in_progress', 'resolved', 'rejected');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "username" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "display_name" TEXT NOT NULL DEFAULT '',
    "role" "user_role" NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth_sessions" (
    "id" UUID NOT NULL,
    "token_hash" TEXT NOT NULL,
    "user_id" UUID NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "last_used_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auth_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "anomaly_tickets" (
    "id" UUID NOT NULL,
    "asset_node_id" UUID,
    "screenshot_id" UUID,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "severity" TEXT NOT NULL DEFAULT 'medium',
    "status" "anomaly_status" NOT NULL DEFAULT 'open',
    "metadata" JSONB,
    "reported_by_id" UUID,
    "assigned_maintenance_id" UUID,
    "solved_by_id" UUID,
    "solved_at" TIMESTAMP(3),
    "rejected_at" TIMESTAMP(3),
    "unity_marker_visible" BOOLEAN NOT NULL DEFAULT true,
    "unity_resolved_check_visible" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "anomaly_tickets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "maintenance_results" (
    "id" UUID NOT NULL,
    "anomaly_id" UUID NOT NULL,
    "submitted_by_id" UUID,
    "field_notes" TEXT NOT NULL DEFAULT '',
    "actions_taken" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "metadata" JSONB,
    "submitted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "maintenance_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "maintenance_photos" (
    "id" UUID NOT NULL,
    "anomaly_id" UUID NOT NULL,
    "uploaded_by_id" UUID,
    "caption" TEXT NOT NULL DEFAULT '',
    "file_name" TEXT NOT NULL,
    "original_name" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "size_bytes" INTEGER NOT NULL,
    "file_data" BYTEA NOT NULL,
    "url" TEXT NOT NULL,
    "storage_path" TEXT NOT NULL,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "maintenance_photos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" UUID NOT NULL,
    "recipient_id" UUID NOT NULL,
    "anomaly_id" UUID,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "read_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "anomaly_audit_logs" (
    "id" UUID NOT NULL,
    "anomaly_id" UUID NOT NULL,
    "actor_id" UUID,
    "action" TEXT NOT NULL,
    "from_status" "anomaly_status",
    "to_status" "anomaly_status",
    "note" TEXT NOT NULL DEFAULT '',
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "anomaly_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE INDEX "users_role_idx" ON "users"("role");

-- CreateIndex
CREATE INDEX "users_is_active_idx" ON "users"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "auth_sessions_token_hash_key" ON "auth_sessions"("token_hash");

-- CreateIndex
CREATE INDEX "auth_sessions_user_id_idx" ON "auth_sessions"("user_id");

-- CreateIndex
CREATE INDEX "auth_sessions_expires_at_idx" ON "auth_sessions"("expires_at");

-- CreateIndex
CREATE INDEX "anomaly_tickets_asset_node_id_idx" ON "anomaly_tickets"("asset_node_id");

-- CreateIndex
CREATE INDEX "anomaly_tickets_screenshot_id_idx" ON "anomaly_tickets"("screenshot_id");

-- CreateIndex
CREATE INDEX "anomaly_tickets_status_idx" ON "anomaly_tickets"("status");

-- CreateIndex
CREATE INDEX "anomaly_tickets_reported_by_id_idx" ON "anomaly_tickets"("reported_by_id");

-- CreateIndex
CREATE INDEX "anomaly_tickets_assigned_maintenance_id_idx" ON "anomaly_tickets"("assigned_maintenance_id");

-- CreateIndex
CREATE INDEX "anomaly_tickets_solved_by_id_idx" ON "anomaly_tickets"("solved_by_id");

-- CreateIndex
CREATE INDEX "anomaly_tickets_created_at_idx" ON "anomaly_tickets"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "maintenance_results_anomaly_id_key" ON "maintenance_results"("anomaly_id");

-- CreateIndex
CREATE INDEX "maintenance_results_submitted_by_id_idx" ON "maintenance_results"("submitted_by_id");

-- CreateIndex
CREATE INDEX "maintenance_results_submitted_at_idx" ON "maintenance_results"("submitted_at");

-- CreateIndex
CREATE INDEX "maintenance_photos_anomaly_id_idx" ON "maintenance_photos"("anomaly_id");

-- CreateIndex
CREATE INDEX "maintenance_photos_uploaded_by_id_idx" ON "maintenance_photos"("uploaded_by_id");

-- CreateIndex
CREATE INDEX "maintenance_photos_created_at_idx" ON "maintenance_photos"("created_at");

-- CreateIndex
CREATE INDEX "notifications_recipient_id_idx" ON "notifications"("recipient_id");

-- CreateIndex
CREATE INDEX "notifications_anomaly_id_idx" ON "notifications"("anomaly_id");

-- CreateIndex
CREATE INDEX "notifications_is_read_idx" ON "notifications"("is_read");

-- CreateIndex
CREATE INDEX "notifications_created_at_idx" ON "notifications"("created_at");

-- CreateIndex
CREATE INDEX "anomaly_audit_logs_anomaly_id_idx" ON "anomaly_audit_logs"("anomaly_id");

-- CreateIndex
CREATE INDEX "anomaly_audit_logs_actor_id_idx" ON "anomaly_audit_logs"("actor_id");

-- CreateIndex
CREATE INDEX "anomaly_audit_logs_created_at_idx" ON "anomaly_audit_logs"("created_at");

-- AddForeignKey
ALTER TABLE "auth_sessions" ADD CONSTRAINT "auth_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "anomaly_tickets" ADD CONSTRAINT "anomaly_tickets_asset_node_id_fkey" FOREIGN KEY ("asset_node_id") REFERENCES "asset_nodes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "anomaly_tickets" ADD CONSTRAINT "anomaly_tickets_screenshot_id_fkey" FOREIGN KEY ("screenshot_id") REFERENCES "digital_twin_screenshots"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "anomaly_tickets" ADD CONSTRAINT "anomaly_tickets_reported_by_id_fkey" FOREIGN KEY ("reported_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "anomaly_tickets" ADD CONSTRAINT "anomaly_tickets_assigned_maintenance_id_fkey" FOREIGN KEY ("assigned_maintenance_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "anomaly_tickets" ADD CONSTRAINT "anomaly_tickets_solved_by_id_fkey" FOREIGN KEY ("solved_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_results" ADD CONSTRAINT "maintenance_results_anomaly_id_fkey" FOREIGN KEY ("anomaly_id") REFERENCES "anomaly_tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_results" ADD CONSTRAINT "maintenance_results_submitted_by_id_fkey" FOREIGN KEY ("submitted_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_photos" ADD CONSTRAINT "maintenance_photos_anomaly_id_fkey" FOREIGN KEY ("anomaly_id") REFERENCES "anomaly_tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_photos" ADD CONSTRAINT "maintenance_photos_uploaded_by_id_fkey" FOREIGN KEY ("uploaded_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_recipient_id_fkey" FOREIGN KEY ("recipient_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_anomaly_id_fkey" FOREIGN KEY ("anomaly_id") REFERENCES "anomaly_tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "anomaly_audit_logs" ADD CONSTRAINT "anomaly_audit_logs_anomaly_id_fkey" FOREIGN KEY ("anomaly_id") REFERENCES "anomaly_tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "anomaly_audit_logs" ADD CONSTRAINT "anomaly_audit_logs_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
