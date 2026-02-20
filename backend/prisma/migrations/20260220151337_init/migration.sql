-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "XRayImage" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "XRayImage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIResult" (
    "id" TEXT NOT NULL,
    "xRayImageId" TEXT NOT NULL,
    "symmetryScore" DOUBLE PRECISION NOT NULL,
    "symmetryPass" BOOLEAN NOT NULL,
    "coccyxDistanceCm" DOUBLE PRECISION NOT NULL,
    "coccyxPass" BOOLEAN NOT NULL,
    "trochanterSizeMm" DOUBLE PRECISION NOT NULL,
    "trochanterPass" BOOLEAN NOT NULL,
    "overallPass" BOOLEAN NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AIResult_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "XRayImage_userId_idx" ON "XRayImage"("userId");

-- CreateIndex
CREATE INDEX "AIResult_xRayImageId_idx" ON "AIResult"("xRayImageId");

-- AddForeignKey
ALTER TABLE "XRayImage" ADD CONSTRAINT "XRayImage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIResult" ADD CONSTRAINT "AIResult_xRayImageId_fkey" FOREIGN KEY ("xRayImageId") REFERENCES "XRayImage"("id") ON DELETE CASCADE ON UPDATE CASCADE;
