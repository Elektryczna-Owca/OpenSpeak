-- CreateTable
CREATE TABLE "Agenda" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Agenda_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgendaItem" (
    "id" TEXT NOT NULL,
    "agendaId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "durationMinutes" INTEGER NOT NULL,
    "position" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AgendaItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AgendaItem_agendaId_position_idx" ON "AgendaItem"("agendaId", "position");

-- AddForeignKey
ALTER TABLE "AgendaItem" ADD CONSTRAINT "AgendaItem_agendaId_fkey" FOREIGN KEY ("agendaId") REFERENCES "Agenda"("id") ON DELETE CASCADE ON UPDATE CASCADE;
