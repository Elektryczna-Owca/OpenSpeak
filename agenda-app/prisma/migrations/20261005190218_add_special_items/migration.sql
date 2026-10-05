-- AlterTable
ALTER TABLE "AgendaItem" ADD COLUMN     "specialItemId" TEXT,
ADD COLUMN     "specialValue" TEXT;

-- CreateTable
CREATE TABLE "SpecialItem" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "csv" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SpecialItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AgendaItem_specialItemId_idx" ON "AgendaItem"("specialItemId");

-- AddForeignKey
ALTER TABLE "AgendaItem" ADD CONSTRAINT "AgendaItem_specialItemId_fkey" FOREIGN KEY ("specialItemId") REFERENCES "SpecialItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
