-- CreateTable
CREATE TABLE "asset_nodes" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Machine',
    "company" TEXT NOT NULL DEFAULT '',
    "color" TEXT NOT NULL DEFAULT '#000000',
    "level" INTEGER NOT NULL DEFAULT 1,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "icon" TEXT NOT NULL DEFAULT 'tabler:settings',
    "description" TEXT NOT NULL DEFAULT '',
    "coordinate_x" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "coordinate_y" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "coordinate_z" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "line_coordinate_x" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "line_coordinate_y" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "line_coordinate_z" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "rotate_x" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "rotate_y" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "rotate_z" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "size" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "parent_id" UUID,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "categories" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "dependent_category" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "asset_nodes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "asset_nodes_parent_id_idx" ON "asset_nodes"("parent_id");

-- CreateIndex
CREATE INDEX "asset_nodes_level_idx" ON "asset_nodes"("level");

-- CreateIndex
CREATE INDEX "asset_nodes_is_active_idx" ON "asset_nodes"("is_active");

-- CreateIndex
CREATE INDEX "asset_nodes_status_idx" ON "asset_nodes"("status");

-- AddForeignKey
ALTER TABLE "asset_nodes" ADD CONSTRAINT "asset_nodes_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "asset_nodes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
