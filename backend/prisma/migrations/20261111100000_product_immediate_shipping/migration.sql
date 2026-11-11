-- AlterTable
ALTER TABLE "Product" ADD COLUMN "immediateAvailable" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "chargeShipping" BOOLEAN NOT NULL DEFAULT true;
