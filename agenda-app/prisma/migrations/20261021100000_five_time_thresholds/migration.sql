-- Replace min / expected / max with min / green / yellow / red / max.
-- Old behaviour is preserved: green at the old min, yellow at the old expected
-- time, red 30 seconds before max (never earlier than yellow).

ALTER TABLE "AgendaItem"
  ADD COLUMN "greenMinutes" DOUBLE PRECISION,
  ADD COLUMN "yellowMinutes" DOUBLE PRECISION,
  ADD COLUMN "redMinutes" DOUBLE PRECISION,
  ADD COLUMN "subGreenMinutes" DOUBLE PRECISION,
  ADD COLUMN "subYellowMinutes" DOUBLE PRECISION,
  ADD COLUMN "subRedMinutes" DOUBLE PRECISION;

UPDATE "AgendaItem" SET
  "greenMinutes" = "minMinutes",
  "yellowMinutes" = "durationMinutes",
  "redMinutes" = CASE WHEN "maxMinutes" IS NOT NULL
    THEN GREATEST("maxMinutes" - 0.5, "durationMinutes") END,
  "subGreenMinutes" = "subMinMinutes",
  "subYellowMinutes" = "subExpectedMinutes",
  "subRedMinutes" = CASE WHEN "subMaxMinutes" IS NOT NULL AND "subExpectedMinutes" IS NOT NULL
    THEN GREATEST("subMaxMinutes" - 0.5, "subExpectedMinutes") END;

ALTER TABLE "AgendaItem"
  DROP COLUMN "durationMinutes",
  DROP COLUMN "subExpectedMinutes";

ALTER TABLE "RunSegment"
  ADD COLUMN "greenMinutes" DOUBLE PRECISION,
  ADD COLUMN "yellowMinutes" DOUBLE PRECISION,
  ADD COLUMN "redMinutes" DOUBLE PRECISION;

UPDATE "RunSegment" SET
  "greenMinutes" = "minMinutes",
  "yellowMinutes" = "expectedMinutes",
  "redMinutes" = CASE WHEN "maxMinutes" IS NOT NULL
    THEN GREATEST("maxMinutes" - 0.5, COALESCE("expectedMinutes", 0)) END;

ALTER TABLE "RunSegment" DROP COLUMN "expectedMinutes";
