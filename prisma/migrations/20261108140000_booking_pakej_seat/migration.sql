-- DropIndex
DROP INDEX "public"."Booking_startsAt_idx";

-- DropIndex
DROP INDEX "public"."Booking_startsAt_seat_key";

-- AlterTable
ALTER TABLE "public"."Booking" ADD COLUMN     "priceCents" INTEGER NOT NULL,
ADD COLUMN     "services" TEXT NOT NULL,
ALTER COLUMN "seat" SET NOT NULL;

-- CreateIndex
CREATE INDEX "Booking_seat_startsAt_idx" ON "public"."Booking"("seat", "startsAt");

