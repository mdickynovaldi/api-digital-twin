-- CreateTable
CREATE TABLE "digital_twin_screenshots" (
    "id" UUID NOT NULL,
    "asset_node_id" UUID,
    "title" TEXT NOT NULL DEFAULT '',
    "description" TEXT NOT NULL DEFAULT '',
    "file_name" TEXT NOT NULL,
    "original_name" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "size_bytes" INTEGER NOT NULL,
    "url" TEXT NOT NULL,
    "storage_path" TEXT NOT NULL,
    "captured_at" TIMESTAMP(3),
    "uploaded_by" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "digital_twin_screenshots_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "digital_twin_screenshots_asset_node_id_idx" ON "digital_twin_screenshots"("asset_node_id");

-- CreateIndex
CREATE INDEX "digital_twin_screenshots_created_at_idx" ON "digital_twin_screenshots"("created_at");

-- AddForeignKey
ALTER TABLE "digital_twin_screenshots" ADD CONSTRAINT "digital_twin_screenshots_asset_node_id_fkey" FOREIGN KEY ("asset_node_id") REFERENCES "asset_nodes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
