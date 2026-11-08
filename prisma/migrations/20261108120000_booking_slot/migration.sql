-- DropForeignKey
ALTER TABLE "public"."Booking" DROP CONSTRAINT "Booking_barberId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Booking" DROP CONSTRAINT "Booking_serviceId_fkey";

-- DropIndex
DROP INDEX "public"."Booking_barberId_startsAt_idx";

-- AlterTable
ALTER TABLE "public"."Booking" DROP COLUMN "barberId",
DROP COLUMN "serviceId",
ADD COLUMN     "seat" INTEGER;

-- DropTable
DROP TABLE "public"."Barber";

-- DropTable
DROP TABLE "public"."Service";

-- CreateIndex
CREATE INDEX "Booking_startsAt_idx" ON "public"."Booking"("startsAt");

-- CreateIndex
CREATE UNIQUE INDEX "Booking_startsAt_seat_key" ON "public"."Booking"("startsAt", "seat");

