-- Final normalized cleanup.
-- Safety: the migration is intentionally opt-in. Set PGOPTIONS=-c app.allow_schema_cleanup=true
-- only after cleanup-readiness.sql returns zero failures on a backup clone.
DO $$
BEGIN
  IF current_setting('app.allow_schema_cleanup', true) IS DISTINCT FROM 'true' THEN
    RAISE EXCEPTION 'Final schema cleanup is disabled. Set PGOPTIONS=-c app.allow_schema_cleanup=true after readiness checks.';
  END IF;
  IF EXISTS (SELECT 1 FROM "ClassGroup" WHERE "programId" IS NULL OR "academicYearId" IS NULL)
     OR EXISTS (SELECT 1 FROM "CurriculumVersion" WHERE "academicYearId" IS NULL OR "versionNo" IS NULL)
     OR EXISTS (SELECT 1 FROM "JobVacancy" WHERE "companyId" IS NULL)
     OR EXISTS (SELECT 1 FROM "StudentProfile" p RIGHT JOIN "User" u ON u."id"=p."userId" WHERE u."roles" @> ARRAY['STUDENT']::"Role"[] AND p."userId" IS NULL)
     OR EXISTS (SELECT 1 FROM "Enrollment" e WHERE e."profileStudentId" IS NULL OR (e."source"='STANDALONE' AND e."standaloneCourseId" IS NULL) OR (e."source"='CURRICULUM' AND e."curriculumItemId" IS NULL)) THEN
    RAISE EXCEPTION 'Normalized data gate failed. Run prisma/cleanup-readiness.sql and resolve every failure.';
  END IF;
END $$;

ALTER TABLE "User" DROP CONSTRAINT IF EXISTS "User_departmentId_fkey";
ALTER TABLE "User" DROP CONSTRAINT IF EXISTS "User_classGroupId_fkey";
ALTER TABLE "User" DROP CONSTRAINT IF EXISTS "User_programId_fkey";
ALTER TABLE "User" DROP COLUMN IF EXISTS "departmentId", DROP COLUMN IF EXISTS "classGroupId", DROP COLUMN IF EXISTS "programId", DROP COLUMN IF EXISTS "companyName", DROP COLUMN IF EXISTS "enrollmentYear", DROP COLUMN IF EXISTS "graduationYear", DROP COLUMN IF EXISTS "graduatedAt", DROP COLUMN IF EXISTS "studentStatus";
ALTER TABLE "ClassGroup" DROP COLUMN IF EXISTS "academicYear";
ALTER TABLE "CurriculumVersion" DROP COLUMN IF EXISTS "academicYear";
ALTER TABLE "CurriculumCategory" DROP CONSTRAINT IF EXISTS "CurriculumCategory_curriculumVersionId_fkey", DROP COLUMN IF EXISTS "curriculumVersionId", DROP COLUMN IF EXISTS "isRequired";
ALTER TABLE "CurriculumItemSemester" DROP COLUMN IF EXISTS "academicYearLabel";
ALTER TABLE "CurriculumItem" DROP COLUMN IF EXISTS "unitName", DROP COLUMN IF EXISTS "unitCode", DROP COLUMN IF EXISTS "totalCredits";
ALTER TABLE "Enrollment" DROP CONSTRAINT IF EXISTS "Enrollment_courseId_fkey", DROP CONSTRAINT IF EXISTS "Enrollment_studentId_fkey", DROP COLUMN IF EXISTS "type", DROP COLUMN IF EXISTS "courseId", DROP COLUMN IF EXISTS "studentId", DROP COLUMN IF EXISTS "isActive";
ALTER TABLE "Question" DROP COLUMN IF EXISTS "optionsJson", DROP COLUMN IF EXISTS "correctAnswer";
ALTER TABLE "QuizAttempt" DROP COLUMN IF EXISTS "answersJson";
ALTER TABLE "JobVacancy" DROP COLUMN IF EXISTS "companyName", DROP COLUMN IF EXISTS "skillsReq", DROP COLUMN IF EXISTS "salary";
ALTER TABLE "Submission" DROP COLUMN IF EXISTS "fileUrl", DROP COLUMN IF EXISTS "hlsStreamUrl", DROP COLUMN IF EXISTS "score";
DROP TABLE IF EXISTS "ProgramGradeCourse";
DROP TABLE IF EXISTS "_LegacyUserClassGroup";
DROP TABLE IF EXISTS "_ClassGroupToUser";
DROP TABLE IF EXISTS "_CourseTeachers_legacy";
DROP TABLE IF EXISTS "_LegacyCourseTeachers";
DROP TYPE IF EXISTS "EnrollmentType";
