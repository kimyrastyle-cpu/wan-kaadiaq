-- AlterTable
ALTER TABLE "public"."Order" ADD COLUMN     "courier" TEXT,
ADD COLUMN     "emailedAt" TIMESTAMP(3),
ADD COLUMN     "epOrderNo" TEXT,
ADD COLUMN     "labelUrl" TEXT,
ADD COLUMN     "trackingUrl" TEXT;

