-- AlterTable
ALTER TABLE "Person" ADD COLUMN     "contact" TEXT,
ADD COLUMN     "isGuest" BOOLEAN NOT NULL DEFAULT false;
