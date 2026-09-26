ALTER TABLE "Enrollment" ADD COLUMN "curriculumVersionId" TEXT;
ALTER TABLE "Enrollment" ADD CONSTRAINT "Enrollment_curriculumVersionId_fkey" FOREIGN KEY ("curriculumVersionId") REFERENCES "CurriculumVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "Enrollment_curriculumVersionId_idx" ON "Enrollment"("curriculumVersionId");
