-- AlterTable
ALTER TABLE "public"."Order" ADD COLUMN     "paymentProvider" TEXT,
ADD COLUMN     "chipPurchaseId" TEXT,
ADD COLUMN     "jntOrderId" TEXT;

-- Order lama semuanya dibayar melalui ToyyibPay.
UPDATE "public"."Order" SET "paymentProvider" = 'TOYYIBPAY' WHERE "billCode" IS NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Order_chipPurchaseId_key" ON "public"."Order"("chipPurchaseId");
