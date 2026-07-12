-- AlterTable
ALTER TABLE "AgendaItem" ADD COLUMN     "subExpectedMinutes" DOUBLE PRECISION,
ADD COLUMN     "subLabel" TEXT,
ADD COLUMN     "subMaxMinutes" DOUBLE PRECISION,
ADD COLUMN     "subMinMinutes" DOUBLE PRECISION;
