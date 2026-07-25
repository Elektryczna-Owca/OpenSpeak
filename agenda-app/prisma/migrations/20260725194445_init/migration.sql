-- CreateTable
CREATE TABLE "Agenda" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "startAt" TIMESTAMP(3),
    "timezone" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Agenda_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Person" (
    "id" TEXT NOT NULL,
    "agendaId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Person_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgendaItem" (
    "id" TEXT NOT NULL,
    "agendaId" TEXT NOT NULL,
    "personId" TEXT,
    "title" TEXT NOT NULL,
    "durationMinutes" DOUBLE PRECISION NOT NULL,
    "minMinutes" DOUBLE PRECISION,
    "maxMinutes" DOUBLE PRECISION,
    "subLabel" TEXT,
    "subMinMinutes" DOUBLE PRECISION,
    "subExpectedMinutes" DOUBLE PRECISION,
    "subMaxMinutes" DOUBLE PRECISION,
    "position" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AgendaItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Template" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "csv" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Template_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MeetingRun" (
    "id" TEXT NOT NULL,
    "agendaId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),

    CONSTRAINT "MeetingRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RunSegment" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "itemId" TEXT,
    "kind" TEXT NOT NULL,
    "subIndex" INTEGER,
    "label" TEXT NOT NULL,
    "minMinutes" DOUBLE PRECISION,
    "expectedMinutes" DOUBLE PRECISION,
    "maxMinutes" DOUBLE PRECISION,
    "position" INTEGER NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "endedAt" TIMESTAMP(3),

    CONSTRAINT "RunSegment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Person_agendaId_idx" ON "Person"("agendaId");

-- CreateIndex
CREATE INDEX "AgendaItem_agendaId_position_idx" ON "AgendaItem"("agendaId", "position");

-- CreateIndex
CREATE INDEX "AgendaItem_personId_idx" ON "AgendaItem"("personId");

-- CreateIndex
CREATE INDEX "MeetingRun_agendaId_idx" ON "MeetingRun"("agendaId");

-- CreateIndex
CREATE INDEX "RunSegment_runId_position_idx" ON "RunSegment"("runId", "position");

-- AddForeignKey
ALTER TABLE "Person" ADD CONSTRAINT "Person_agendaId_fkey" FOREIGN KEY ("agendaId") REFERENCES "Agenda"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgendaItem" ADD CONSTRAINT "AgendaItem_agendaId_fkey" FOREIGN KEY ("agendaId") REFERENCES "Agenda"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgendaItem" ADD CONSTRAINT "AgendaItem_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MeetingRun" ADD CONSTRAINT "MeetingRun_agendaId_fkey" FOREIGN KEY ("agendaId") REFERENCES "Agenda"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RunSegment" ADD CONSTRAINT "RunSegment_runId_fkey" FOREIGN KEY ("runId") REFERENCES "MeetingRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RunSegment" ADD CONSTRAINT "RunSegment_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "AgendaItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
