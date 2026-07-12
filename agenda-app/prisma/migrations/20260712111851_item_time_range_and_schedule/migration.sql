-- AlterTable
ALTER TABLE "Agenda" ADD COLUMN     "startAt" TIMESTAMP(3),
ADD COLUMN     "timezone" TEXT;

-- AlterTable
ALTER TABLE "AgendaItem" ADD COLUMN     "maxMinutes" INTEGER,
ADD COLUMN     "minMinutes" INTEGER;
