-- AlterTable
ALTER TABLE "RunSegment" ADD COLUMN     "personId" TEXT;

-- AddForeignKey
ALTER TABLE "RunSegment" ADD CONSTRAINT "RunSegment_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE SET NULL ON UPDATE CASCADE;
