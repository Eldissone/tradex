-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "proofFileName" TEXT,
ADD COLUMN     "proofMimeType" TEXT,
ADD COLUMN     "proofPath" TEXT,
ADD COLUMN     "proofSize" INTEGER,
ADD COLUMN     "proofUploadedAt" TIMESTAMP(3),
ADD COLUMN     "rejectionReason" TEXT;

