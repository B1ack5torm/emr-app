-- A practitioner has one editable weekly schedule per weekday.
-- Existing duplicates are collapsed by keeping the most recently generated CUID.
WITH "RankedSchedules" AS (
  SELECT
    "id",
    ROW_NUMBER() OVER (
      PARTITION BY "practitionerId", "dayOfWeek"
      ORDER BY "id" DESC
    ) AS "rowNumber"
  FROM "PractitionerSchedule"
)
DELETE FROM "PractitionerSchedule"
WHERE "id" IN (
  SELECT "id"
  FROM "RankedSchedules"
  WHERE "rowNumber" > 1
);

DROP INDEX "PractitionerSchedule_practitionerId_dayOfWeek_startMinute_endMinute_key";

CREATE UNIQUE INDEX "PractitionerSchedule_practitionerId_dayOfWeek_key"
ON "PractitionerSchedule"("practitionerId", "dayOfWeek");
