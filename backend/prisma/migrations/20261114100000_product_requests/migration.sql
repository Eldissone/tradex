-- CreateEnum
CREATE TYPE "ProductRequestStatus" AS ENUM ('NEW', 'IN_REVIEW', 'AVAILABLE', 'REJECTED');

-- CreateTable
CREATE TABLE "ProductRequest" (
    "id" TEXT NOT NULL,
    "customerId" TEXT,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT NOT NULL,
    "description" TEXT,
    "imageUrl" TEXT NOT NULL,
    "status" "ProductRequestStatus" NOT NULL DEFAULT 'NEW',
    "adminNote" TEXT,
    "productId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProductRequest_status_createdAt_idx" ON "ProductRequest"("status", "createdAt");
CREATE INDEX "ProductRequest_customerId_idx" ON "ProductRequest"("customerId");
