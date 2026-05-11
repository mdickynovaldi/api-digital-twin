-- AddColumn
ALTER TABLE "digital_twin_screenshots" ADD COLUMN "file_data" BYTEA NOT NULL DEFAULT decode('', 'hex');

-- DropDefault
ALTER TABLE "digital_twin_screenshots" ALTER COLUMN "file_data" DROP DEFAULT;
