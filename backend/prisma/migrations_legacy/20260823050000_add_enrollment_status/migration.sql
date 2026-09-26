-- Refuse the migration if legacy data contains duplicate individual enrollments.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "Enrollment"
    WHERE "studentId" IS NOT NULL
    GROUP BY "courseId", "studentId"
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'Duplicate individual enrollments must be resolved before this migration';
  END IF;
END $$;

CREATE TYPE "EnrollmentStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'FAILED');

ALTER TABLE "Enrollment"
  ADD COLUMN "status" "EnrollmentStatus" NOT NULL DEFAULT 'ACTIVE',
  ADD COLUMN "statusChangedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "statusChangedById" TEXT,
  ADD COLUMN "statusReason" TEXT;

UPDATE "Enrollment"
SET "status" = CASE WHEN "isActive" THEN 'ACTIVE'::"EnrollmentStatus" ELSE 'COMPLETED'::"EnrollmentStatus" END;

CREATE UNIQUE INDEX "Enrollment_courseId_studentId_key" ON "Enrollment"("courseId", "studentId");
CREATE INDEX "Enrollment_courseId_status_idx" ON "Enrollment"("courseId", "status");
CREATE INDEX "Enrollment_courseId_classGroupId_idx" ON "Enrollment"("courseId", "classGroupId");
CREATE INDEX "Enrollment_statusChangedById_idx" ON "Enrollment"("statusChangedById");

ALTER TABLE "Enrollment" ADD CONSTRAINT "Enrollment_statusChangedById_fkey"
  FOREIGN KEY ("statusChangedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
