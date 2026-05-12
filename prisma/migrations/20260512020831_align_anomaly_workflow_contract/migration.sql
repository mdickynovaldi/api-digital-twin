-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "user_role" ADD VALUE 'admin';
ALTER TYPE "user_role" ADD VALUE 'unity-client';

-- AlterTable
ALTER TABLE "anomaly_tickets" ADD COLUMN     "acknowledged_at" TIMESTAMP(3),
ADD COLUMN     "acknowledged_by" TEXT,
ADD COLUMN     "anomaly_type" TEXT NOT NULL DEFAULT 'other',
ADD COLUMN     "assigned_to" TEXT,
ADD COLUMN     "captured_at" TIMESTAMP(3),
ADD COLUMN     "reported_by" TEXT,
ADD COLUMN     "resolution_note" TEXT,
ADD COLUMN     "resolution_photo_url" TEXT,
ADD COLUMN     "resolved_by" TEXT,
ADD COLUMN     "screenshot_url" TEXT NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE "notifications" ADD COLUMN     "asset_node_id" UUID,
ADD COLUMN     "user_role" "user_role" NOT NULL DEFAULT 'maintenance',
ALTER COLUMN "recipient_id" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "anomaly_tickets_assigned_to_idx" ON "anomaly_tickets"("assigned_to");

-- CreateIndex
CREATE INDEX "anomaly_tickets_updated_at_idx" ON "anomaly_tickets"("updated_at");

-- CreateIndex
CREATE INDEX "notifications_user_role_idx" ON "notifications"("user_role");

-- CreateIndex
CREATE INDEX "notifications_asset_node_id_idx" ON "notifications"("asset_node_id");

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_asset_node_id_fkey" FOREIGN KEY ("asset_node_id") REFERENCES "asset_nodes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
