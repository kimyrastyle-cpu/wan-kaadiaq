-- AlterTable
ALTER TABLE "public"."Order" DROP COLUMN "address",
DROP COLUMN "customerName",
ADD COLUMN     "address1" TEXT NOT NULL,
ADD COLUMN     "address2" TEXT,
ADD COLUMN     "city" TEXT NOT NULL,
ADD COLUMN     "company" TEXT,
ADD COLUMN     "country" TEXT NOT NULL DEFAULT 'Malaysia',
ADD COLUMN     "firstName" TEXT NOT NULL,
ADD COLUMN     "lastName" TEXT NOT NULL,
ADD COLUMN     "postcode" TEXT NOT NULL,
ADD COLUMN     "state" TEXT NOT NULL;

