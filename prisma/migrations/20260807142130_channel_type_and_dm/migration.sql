-- CreateEnum
CREATE TYPE "ChannelType" AS ENUM ('CHANNEL', 'DIRECT');

-- DropIndex
DROP INDEX "channels_organizationId_idx";

-- AlterTable
ALTER TABLE "channels" ADD COLUMN     "type" "ChannelType" NOT NULL DEFAULT 'CHANNEL',
ALTER COLUMN "name" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "channels_organizationId_type_idx" ON "channels"("organizationId", "type");
