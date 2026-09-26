-- Convert legacy class-batch enrollments into one enrollment per student.
-- This keeps the manager roster/status workflow consistent and preserves dates/status.
INSERT INTO "Enrollment" (
  "id", "type", "courseId", "studentId", "classGroupId",
  "startDate", "endDate", "isActive", "status", "statusChangedAt",
  "statusReason", "cbtStatus", "createdAt"
)
SELECT
  gen_random_uuid(),
  'INDIVIDUAL'::"EnrollmentType",
  batch."courseId",
  student."id",
  NULL,
  batch."startDate",
  batch."endDate",
  batch."isActive",
  batch."status",
  batch."statusChangedAt",
  batch."statusReason",
  batch."cbtStatus",
  batch."createdAt"
FROM "Enrollment" batch
JOIN "User" student ON student."classGroupId" = batch."classGroupId"
WHERE batch."type" = 'CLASS_BATCH'
  AND student."roles" @> ARRAY['STUDENT']::"Role"[]
ON CONFLICT ("courseId", "studentId") DO NOTHING;

DELETE FROM "Enrollment"
WHERE "type" = 'CLASS_BATCH';
