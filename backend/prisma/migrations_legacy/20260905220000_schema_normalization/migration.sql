-- CreateEnum
CREATE TYPE "EnrollmentSource" AS ENUM ('CURRICULUM', 'STANDALONE', 'CLASS_BATCH');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "EnrollmentStatus" ADD VALUE 'CANCELLED';
ALTER TYPE "EnrollmentStatus" ADD VALUE 'SUSPENDED';

-- AlterEnum
ALTER TYPE "LiveSessionStatus" ADD VALUE 'CANCELLED';

-- AlterEnum
ALTER TYPE "MediaAssetType" ADD VALUE 'OTHER';

-- DropForeignKey
ALTER TABLE "ClassGroup" DROP CONSTRAINT "ClassGroup_programId_fkey";

-- DropForeignKey
ALTER TABLE "CurriculumItem" DROP CONSTRAINT "CurriculumItem_categoryId_fkey";

-- DropForeignKey
ALTER TABLE "CurriculumItem" DROP CONSTRAINT "CurriculumItem_courseId_fkey";

-- DropForeignKey
ALTER TABLE "Enrollment" DROP CONSTRAINT "Enrollment_curriculumVersionId_fkey";

-- DropForeignKey
ALTER TABLE "Message" DROP CONSTRAINT "Message_courseId_fkey";

-- DropForeignKey
ALTER TABLE "_CourseTeachers" DROP CONSTRAINT "_CourseTeachers_A_fkey";

-- DropForeignKey
ALTER TABLE "_CourseTeachers" DROP CONSTRAINT "_CourseTeachers_B_fkey";

-- DropIndex
DROP INDEX "ClassGroup_programId_cohortYear_gradeLevel_idx";

-- DropIndex
DROP INDEX "CurriculumCategory_curriculumVersionId_sortOrder_idx";

-- DropIndex
DROP INDEX "CurriculumItemSemester_semesterNumber_idx";

-- DropIndex
DROP INDEX "CurriculumVersion_programId_academicYear_key";

-- DropIndex
DROP INDEX "Enrollment_courseId_classGroupId_idx";

-- DropIndex
DROP INDEX "Enrollment_courseId_status_idx";

-- DropIndex
DROP INDEX "Enrollment_courseId_studentId_key";

-- DropIndex
DROP INDEX "Enrollment_curriculumVersionId_idx";

-- DropIndex
DROP INDEX "Enrollment_studentId_courseId_idx";

-- DropIndex
DROP INDEX "LessonPrerequisite_lessonId_prerequisiteId_key";

-- DropIndex
DROP INDEX "Message_senderId_receiverId_idx";

-- DropIndex
DROP INDEX "ProgramGradeCourse_programId_gradeLevel_academicYear_idx";

-- DropIndex
DROP INDEX "QuizQuestion_quizId_questionId_key";

-- DropIndex
DROP INDEX "StudentPromotion_studentId_academicYear_idx";

-- DropIndex
DROP INDEX "User_departmentId_idx";

-- DropIndex
DROP INDEX "User_programId_studentStatus_idx";

-- AlterTable
ALTER TABLE "Announcement" ADD COLUMN     "expiresAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Assignment" ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "dueDate" DROP NOT NULL,
ALTER COLUMN "maxScore" DROP NOT NULL,
ALTER COLUMN "maxScore" DROP DEFAULT;

-- AlterTable
ALTER TABLE "AuditLog" ADD COLUMN     "entityId" TEXT,
ADD COLUMN     "entityType" TEXT;

-- AlterTable
ALTER TABLE "ClassGroup" ADD COLUMN     "academicYearId" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "academicYear" DROP NOT NULL;

-- AlterTable
ALTER TABLE "CurriculumCategory" ADD COLUMN     "description" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "curriculumVersionId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "CurriculumItem" ADD COLUMN     "gradeLevel" INTEGER,
ALTER COLUMN "unitName" DROP NOT NULL,
ALTER COLUMN "unitCode" DROP NOT NULL,
ALTER COLUMN "totalCredits" SET DEFAULT 0;

-- AlterTable
ALTER TABLE "CurriculumVersion" ADD COLUMN     "academicYearId" TEXT,
ADD COLUMN     "versionNo" INTEGER NOT NULL DEFAULT 1,
ALTER COLUMN "versionName" DROP NOT NULL,
ALTER COLUMN "academicYear" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Department" ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "ElectiveGroup" ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "minimumCredits" DROP NOT NULL,
ALTER COLUMN "minimumCredits" DROP DEFAULT,
ALTER COLUMN "minimumCourseCount" DROP NOT NULL,
ALTER COLUMN "minimumCourseCount" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Enrollment" DROP COLUMN "curriculumVersionId",
ADD COLUMN     "profileStudentId" TEXT,
ADD COLUMN     "source" "EnrollmentSource" NOT NULL DEFAULT 'CURRICULUM',
ADD COLUMN     "standaloneCourseId" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "endDate" DROP NOT NULL;

-- AlterTable
ALTER TABLE "InternshipLog" ADD COLUMN     "approvedAt" TIMESTAMP(3),
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "JobVacancy" ADD COLUMN     "companyId" TEXT,
ADD COLUMN     "salaryText" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "companyName" DROP NOT NULL,
ALTER COLUMN "skillsReq" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Lesson" ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "LessonPrerequisite" DROP CONSTRAINT "LessonPrerequisite_pkey",
DROP COLUMN "id",
ADD CONSTRAINT "LessonPrerequisite_pkey" PRIMARY KEY ("lessonId", "prerequisiteId");

-- AlterTable
ALTER TABLE "LivePoll" ADD COLUMN "optionsJson" JSONB;
UPDATE "LivePoll" SET "optionsJson" = "options";
ALTER TABLE "LivePoll" DROP COLUMN "options",
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "responses" DROP NOT NULL,
ALTER COLUMN "responses" DROP DEFAULT;

-- AlterTable
ALTER TABLE "LiveSession" ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "MediaAsset" ALTER COLUMN "publicUrl" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Message" ADD COLUMN     "readAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Module" ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "ProgressLog" ADD COLUMN     "completedAt" TIMESTAMP(3),
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "Question" ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "optionsJson" DROP NOT NULL,
ALTER COLUMN "correctAnswer" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Quiz" ADD COLUMN     "maxAttempts" INTEGER,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "QuizAttempt" ADD COLUMN     "attemptNo" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "score" DROP NOT NULL,
ALTER COLUMN "passed" DROP NOT NULL,
ALTER COLUMN "answersJson" DROP NOT NULL,
ALTER COLUMN "completedAt" DROP NOT NULL,
ALTER COLUMN "completedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "QuizQuestion" DROP CONSTRAINT "QuizQuestion_pkey",
DROP COLUMN "id",
ADD CONSTRAINT "QuizQuestion_pkey" PRIMARY KEY ("quizId", "questionId");

-- AlterTable
ALTER TABLE "Rubric" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "order" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "RubricCriteria" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "order" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "RubricScore" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "feedback" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "StudentPromotion" ADD COLUMN     "academicYearId" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "fromGradeLevel" DROP NOT NULL,
ALTER COLUMN "academicYear" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Submission" ADD COLUMN     "finalScore" DOUBLE PRECISION,
ADD COLUMN     "linkUrl" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- DropTable
ALTER TABLE "_CourseTeachers" RENAME TO "_CourseTeachers_legacy";

-- CreateTable
CREATE TABLE "StudentProfile" (
    "userId" TEXT NOT NULL,
    "status" "StudentStatus" NOT NULL DEFAULT 'ACTIVE',
    "enrollmentYear" INTEGER,
    "graduatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StudentProfile_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "StaffProfile" (
    "userId" TEXT NOT NULL,
    "departmentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StaffProfile_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "Company" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "registerNumber" TEXT,
    "address" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "website" TEXT,
    "status" "EntityStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EnterpriseMentorProfile" (
    "userId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "jobTitle" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EnterpriseMentorProfile_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "AcademicYear" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AcademicYear_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentClassMembership" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "classGroupId" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "isCurrent" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StudentClassMembership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CourseTeacher" (
    "courseId" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CourseTeacher_pkey" PRIMARY KEY ("courseId","teacherId")
);

-- Backfill explicit course-teacher assignments before legacy join cleanup.
INSERT INTO "CourseTeacher" ("courseId", "teacherId")
SELECT "A", "B" FROM "_CourseTeachers_legacy"
ON CONFLICT ("courseId", "teacherId") DO NOTHING;

DROP TABLE "_CourseTeachers_legacy";

-- CreateTable
CREATE TABLE "SubmissionAsset" (
    "submissionId" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SubmissionAsset_pkey" PRIMARY KEY ("submissionId","assetId")
);

-- CreateTable
CREATE TABLE "QuestionOption" (
    "id" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "matchValue" TEXT,
    "isCorrect" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuestionOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuizAnswer" (
    "id" TEXT NOT NULL,
    "attemptId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "answerText" TEXT,
    "answerJson" JSONB,
    "isCorrect" BOOLEAN,
    "scoreEarned" DOUBLE PRECISION,
    "studentId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuizAnswer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobVacancyRequiredCourse" (
    "vacancyId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,

    CONSTRAINT "JobVacancyRequiredCourse_pkey" PRIMARY KEY ("vacancyId","courseId")
);

-- CreateTable
CREATE TABLE "LivePollOption" (
    "id" TEXT NOT NULL,
    "pollId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "order" INTEGER NOT NULL,

    CONSTRAINT "LivePollOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LivePollResponse" (
    "id" TEXT NOT NULL,
    "pollId" TEXT NOT NULL,
    "optionId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LivePollResponse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_LegacyCourseTeachers" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- Backfill normalized live poll options and legacy JSON votes.
INSERT INTO "LivePollOption" ("id", "pollId", "text", "order")
SELECT gen_random_uuid(), poll."id", item.value #>> '{}', item.ordinality::INTEGER
FROM "LivePoll" poll
CROSS JOIN LATERAL jsonb_array_elements(CASE WHEN jsonb_typeof(poll."optionsJson") = 'array' THEN poll."optionsJson" ELSE '[]'::jsonb END) WITH ORDINALITY item
WHERE NOT EXISTS (SELECT 1 FROM "LivePollOption" option WHERE option."pollId" = poll."id");

INSERT INTO "LivePollResponse" ("id", "pollId", "optionId", "studentId")
SELECT gen_random_uuid(), poll."id", option."id", vote.key
FROM "LivePoll" poll
CROSS JOIN LATERAL jsonb_each(CASE WHEN jsonb_typeof(poll."responses") = 'object' THEN poll."responses" ELSE '{}'::jsonb END) vote
JOIN "LivePollOption" option ON option."pollId" = poll."id" AND option."order" = ((vote.value #>> '{}')::INTEGER + 1)
WHERE NOT EXISTS (SELECT 1 FROM "LivePollResponse" response WHERE response."pollId" = poll."id" AND response."studentId" = vote.key);

-- Backfill normalized identity and academic reference data.
INSERT INTO "StudentProfile" ("userId", "status", "enrollmentYear", "graduatedAt")
SELECT "id", "studentStatus", "enrollmentYear", "graduatedAt"
FROM "User"
WHERE "roles" @> ARRAY['STUDENT']::"Role"[]
ON CONFLICT ("userId") DO NOTHING;

INSERT INTO "StaffProfile" ("userId", "departmentId")
SELECT "id", "departmentId"
FROM "User"
WHERE "roles" && ARRAY['ADMIN','MANAGER','TEACHER']::"Role"[]
ON CONFLICT ("userId") DO NOTHING;

INSERT INTO "AcademicYear" ("id", "name", "startDate", "endDate")
SELECT gen_random_uuid(), y.name,
       make_date(split_part(y.name, '-', 1)::int, 9, 1),
       make_date(split_part(y.name, '-', 2)::int, 8, 31)
FROM (
  SELECT DISTINCT "academicYear" AS name FROM "ClassGroup" WHERE "academicYear" IS NOT NULL
  UNION
  SELECT DISTINCT "academicYear" FROM "CurriculumVersion" WHERE "academicYear" IS NOT NULL
  UNION
  SELECT DISTINCT "academicYear" FROM "StudentPromotion" WHERE "academicYear" IS NOT NULL
) y
WHERE y.name ~ '^[0-9]{4}-[0-9]{4}$'
;

UPDATE "ClassGroup" cg
SET "academicYearId" = ay."id"
FROM "AcademicYear" ay
WHERE ay."name" = cg."academicYear" AND cg."academicYearId" IS NULL;

UPDATE "CurriculumVersion" cv
SET "academicYearId" = ay."id"
FROM "AcademicYear" ay
WHERE ay."name" = cv."academicYear" AND cv."academicYearId" IS NULL;

UPDATE "StudentPromotion" sp
SET "academicYearId" = ay."id"
FROM "AcademicYear" ay
WHERE ay."name" = sp."academicYear" AND sp."academicYearId" IS NULL;

INSERT INTO "StudentClassMembership" ("id", "studentId", "classGroupId", "startDate", "isCurrent")
SELECT gen_random_uuid(), u."id", u."classGroupId", COALESCE(u."createdAt", CURRENT_TIMESTAMP), true
FROM "User" u
WHERE u."classGroupId" IS NOT NULL
  AND u."roles" @> ARRAY['STUDENT']::"Role"[]
ON CONFLICT DO NOTHING;

-- Backfill companies, mentor profiles, vacancies, and vacancy skills.
INSERT INTO "Company" ("id", "name")
SELECT gen_random_uuid(), name
FROM (
  SELECT DISTINCT NULLIF(trim("companyName"), '') AS name FROM "User"
  UNION
  SELECT DISTINCT NULLIF(trim("companyName"), '') AS name FROM "JobVacancy"
) companies
WHERE name IS NOT NULL;

UPDATE "JobVacancy" vacancy
SET "companyId" = company."id"
FROM "Company" company
WHERE vacancy."companyId" IS NULL
  AND vacancy."companyName" IS NOT NULL
  AND company."name" = vacancy."companyName";

INSERT INTO "EnterpriseMentorProfile" ("userId", "companyId")
SELECT u."id", c."id"
FROM "User" u
JOIN "Company" c ON c."name" = u."companyName"
WHERE u."companyName" IS NOT NULL
  AND u."roles" @> ARRAY['ENTERPRISE_MENTOR']::"Role"[]
ON CONFLICT ("userId") DO NOTHING;

INSERT INTO "JobVacancyRequiredCourse" ("vacancyId", "courseId")
SELECT vacancy."id", course."id"
FROM "JobVacancy" vacancy
CROSS JOIN LATERAL jsonb_array_elements_text(
  CASE
    WHEN jsonb_typeof(vacancy."skillsReq") = 'array' THEN vacancy."skillsReq"
    ELSE '[]'::jsonb
  END
) skill(code)
JOIN "Course" course ON upper(course."code") = upper(skill.code)
ON CONFLICT ("vacancyId", "courseId") DO NOTHING;

-- Normalize legacy question options and quiz attempt answers.
INSERT INTO "QuestionOption" ("id", "questionId", "value", "isCorrect", "order")
SELECT gen_random_uuid(), q."id",
       CASE
         WHEN jsonb_typeof(item.value) = 'object'
           THEN COALESCE(item.value->>'value', item.value->>'text', item.value::text)
         ELSE item.value #>> '{}'
       END,
       CASE
         WHEN jsonb_typeof(item.value) = 'object'
           THEN COALESCE((item.value->>'isCorrect')::boolean, false)
         ELSE (item.value #>> '{}') = q."correctAnswer"
       END,
       item.ordinality::int
FROM "Question" q
CROSS JOIN LATERAL jsonb_array_elements(
  CASE
    WHEN jsonb_typeof(q."optionsJson") = 'array' THEN q."optionsJson"
    ELSE '[]'::jsonb
  END
) WITH ORDINALITY AS item(value, ordinality)
WHERE q."optionsJson" IS NOT NULL;

INSERT INTO "QuizAnswer" ("id", "attemptId", "questionId", "answerText", "studentId")
SELECT gen_random_uuid(), attempt."id", question."id",
       CASE
         WHEN jsonb_typeof(answer.value) = 'string' THEN answer.value #>> '{}'
         ELSE answer.value::text
       END,
       attempt."studentId"
FROM "QuizAttempt" attempt
CROSS JOIN LATERAL jsonb_each(
  CASE
    WHEN jsonb_typeof(attempt."answersJson") = 'object' THEN attempt."answersJson"
    ELSE '{}'::jsonb
  END
) answer(question_id, value)
JOIN "Question" question ON question."id" = answer.question_id;

-- CreateIndex
CREATE INDEX "StudentProfile_status_idx" ON "StudentProfile"("status");

-- CreateIndex
CREATE INDEX "StaffProfile_departmentId_idx" ON "StaffProfile"("departmentId");

-- CreateIndex
CREATE UNIQUE INDEX "Company_registerNumber_key" ON "Company"("registerNumber");

-- CreateIndex
CREATE INDEX "EnterpriseMentorProfile_companyId_idx" ON "EnterpriseMentorProfile"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "AcademicYear_name_key" ON "AcademicYear"("name");

-- CreateIndex
CREATE INDEX "AcademicYear_startDate_endDate_idx" ON "AcademicYear"("startDate", "endDate");

-- CreateIndex
CREATE INDEX "StudentClassMembership_studentId_isCurrent_idx" ON "StudentClassMembership"("studentId", "isCurrent");

-- CreateIndex
CREATE INDEX "StudentClassMembership_classGroupId_isCurrent_idx" ON "StudentClassMembership"("classGroupId", "isCurrent");

-- CreateIndex
CREATE UNIQUE INDEX "StudentClassMembership_studentId_classGroupId_startDate_key" ON "StudentClassMembership"("studentId", "classGroupId", "startDate");

-- CreateIndex
CREATE INDEX "CourseTeacher_teacherId_idx" ON "CourseTeacher"("teacherId");

-- CreateIndex
CREATE INDEX "SubmissionAsset_assetId_idx" ON "SubmissionAsset"("assetId");

-- CreateIndex
CREATE INDEX "QuestionOption_questionId_isCorrect_idx" ON "QuestionOption"("questionId", "isCorrect");

-- CreateIndex
CREATE UNIQUE INDEX "QuestionOption_questionId_order_key" ON "QuestionOption"("questionId", "order");

-- CreateIndex
CREATE INDEX "QuizAnswer_questionId_isCorrect_idx" ON "QuizAnswer"("questionId", "isCorrect");

-- CreateIndex
CREATE INDEX "QuizAnswer_studentId_idx" ON "QuizAnswer"("studentId");

-- CreateIndex
CREATE UNIQUE INDEX "QuizAnswer_attemptId_questionId_key" ON "QuizAnswer"("attemptId", "questionId");

-- CreateIndex
CREATE INDEX "JobVacancyRequiredCourse_courseId_idx" ON "JobVacancyRequiredCourse"("courseId");

-- CreateIndex
CREATE UNIQUE INDEX "LivePollOption_pollId_order_key" ON "LivePollOption"("pollId", "order");

-- CreateIndex
CREATE INDEX "LivePollResponse_optionId_idx" ON "LivePollResponse"("optionId");

-- CreateIndex
CREATE UNIQUE INDEX "LivePollResponse_pollId_studentId_key" ON "LivePollResponse"("pollId", "studentId");

-- CreateIndex
CREATE UNIQUE INDEX "_LegacyCourseTeachers_AB_unique" ON "_LegacyCourseTeachers"("A", "B");

-- CreateIndex
CREATE INDEX "_LegacyCourseTeachers_B_index" ON "_LegacyCourseTeachers"("B");

-- CreateIndex
CREATE INDEX "Announcement_targetRole_createdAt_idx" ON "Announcement"("targetRole", "createdAt");

-- CreateIndex
CREATE INDEX "Announcement_targetUserId_createdAt_idx" ON "Announcement"("targetUserId", "createdAt");

-- CreateIndex
CREATE INDEX "Assignment_lessonId_dueDate_idx" ON "Assignment"("lessonId", "dueDate");

-- CreateIndex
CREATE INDEX "AuditLog_userId_timestamp_idx" ON "AuditLog"("userId", "timestamp");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "ClassGroup_programId_academicYearId_gradeLevel_idx" ON "ClassGroup"("programId", "academicYearId", "gradeLevel");

-- CreateIndex
CREATE INDEX "ClassGroup_departmentId_idx" ON "ClassGroup"("departmentId");

-- CreateIndex
CREATE INDEX "Course_departmentId_idx" ON "Course"("departmentId");

-- CreateIndex
CREATE UNIQUE INDEX "CurriculumCategory_code_key" ON "CurriculumCategory"("code");

-- CreateIndex
CREATE INDEX "CurriculumCategory_sortOrder_idx" ON "CurriculumCategory"("sortOrder");

-- CreateIndex
CREATE INDEX "CurriculumItem_courseId_idx" ON "CurriculumItem"("courseId");

-- CreateIndex
CREATE UNIQUE INDEX "CurriculumVersion_programId_academicYearId_versionNo_key" ON "CurriculumVersion"("programId", "academicYearId", "versionNo");

-- CreateIndex
CREATE INDEX "Enrollment_studentId_status_idx" ON "Enrollment"("studentId", "status");

-- CreateIndex
CREATE INDEX "Enrollment_classGroupId_status_idx" ON "Enrollment"("classGroupId", "status");

-- CreateIndex
CREATE INDEX "Enrollment_standaloneCourseId_status_idx" ON "Enrollment"("standaloneCourseId", "status");

-- CreateIndex
CREATE INDEX "InternshipLog_studentId_logDate_idx" ON "InternshipLog"("studentId", "logDate");

-- CreateIndex
CREATE INDEX "InternshipLog_mentorId_isApproved_idx" ON "InternshipLog"("mentorId", "isApproved");

-- CreateIndex
CREATE INDEX "JobVacancy_companyId_createdAt_idx" ON "JobVacancy"("companyId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Lesson_moduleId_order_key" ON "Lesson"("moduleId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "MediaAsset_objectKey_key" ON "MediaAsset"("objectKey");

-- CreateIndex
CREATE INDEX "Message_senderId_receiverId_createdAt_idx" ON "Message"("senderId", "receiverId", "createdAt");

-- CreateIndex
CREATE INDEX "Message_receiverId_readAt_idx" ON "Message"("receiverId", "readAt");

-- CreateIndex
CREATE UNIQUE INDEX "Module_courseId_order_key" ON "Module"("courseId", "order");

-- CreateIndex
CREATE INDEX "ProgressLog_lessonId_completed_idx" ON "ProgressLog"("lessonId", "completed");

-- CreateIndex
CREATE INDEX "Question_courseId_type_idx" ON "Question"("courseId", "type");

-- CreateIndex
CREATE INDEX "Quiz_lessonId_idx" ON "Quiz"("lessonId");

-- CreateIndex
CREATE UNIQUE INDEX "QuizAttempt_quizId_studentId_attemptNo_key" ON "QuizAttempt"("quizId", "studentId", "attemptNo");

-- CreateIndex
CREATE UNIQUE INDEX "QuizQuestion_quizId_order_key" ON "QuizQuestion"("quizId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "Rubric_assignmentId_order_key" ON "Rubric"("assignmentId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "RubricCriteria_rubricId_order_key" ON "RubricCriteria"("rubricId", "order");

-- CreateIndex
CREATE INDEX "RubricScore_evaluatorId_idx" ON "RubricScore"("evaluatorId");

-- CreateIndex
CREATE UNIQUE INDEX "RubricScore_submissionId_criteriaId_key" ON "RubricScore"("submissionId", "criteriaId");

-- CreateIndex
CREATE INDEX "SkillBadge_courseId_idx" ON "SkillBadge"("courseId");

-- CreateIndex
CREATE INDEX "StudentPromotion_studentId_academicYearId_idx" ON "StudentPromotion"("studentId", "academicYearId");

-- CreateIndex
CREATE UNIQUE INDEX "StudentPromotion_studentId_academicYearId_fromClassGroupId_key" ON "StudentPromotion"("studentId", "academicYearId", "fromClassGroupId");

-- CreateIndex
CREATE INDEX "Submission_studentId_assignmentId_idx" ON "Submission"("studentId", "assignmentId");

-- CreateIndex
CREATE INDEX "Submission_assignmentId_submittedAt_idx" ON "Submission"("assignmentId", "submittedAt");

-- CreateIndex
CREATE UNIQUE INDEX "User_registerNumber_key" ON "User"("registerNumber");

-- AddForeignKey
ALTER TABLE "StudentProfile" ADD CONSTRAINT "StudentProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffProfile" ADD CONSTRAINT "StaffProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffProfile" ADD CONSTRAINT "StaffProfile_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnterpriseMentorProfile" ADD CONSTRAINT "EnterpriseMentorProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnterpriseMentorProfile" ADD CONSTRAINT "EnterpriseMentorProfile_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassGroup" ADD CONSTRAINT "ClassGroup_programId_fkey" FOREIGN KEY ("programId") REFERENCES "Program"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassGroup" ADD CONSTRAINT "ClassGroup_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "AcademicYear"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentClassMembership" ADD CONSTRAINT "StudentClassMembership_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "StudentProfile"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentClassMembership" ADD CONSTRAINT "StudentClassMembership_classGroupId_fkey" FOREIGN KEY ("classGroupId") REFERENCES "ClassGroup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CurriculumVersion" ADD CONSTRAINT "CurriculumVersion_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "AcademicYear"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CurriculumItem" ADD CONSTRAINT "CurriculumItem_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "CurriculumCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CurriculumItem" ADD CONSTRAINT "CurriculumItem_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseTeacher" ADD CONSTRAINT "CourseTeacher_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseTeacher" ADD CONSTRAINT "CourseTeacher_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Enrollment" ADD CONSTRAINT "Enrollment_profileStudentId_fkey" FOREIGN KEY ("profileStudentId") REFERENCES "StudentProfile"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Enrollment" ADD CONSTRAINT "Enrollment_standaloneCourseId_fkey" FOREIGN KEY ("standaloneCourseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentPromotion" ADD CONSTRAINT "StudentPromotion_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "AcademicYear"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubmissionAsset" ADD CONSTRAINT "SubmissionAsset_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "Submission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubmissionAsset" ADD CONSTRAINT "SubmissionAsset_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "MediaAsset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionOption" ADD CONSTRAINT "QuestionOption_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuizAnswer" ADD CONSTRAINT "QuizAnswer_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "QuizAttempt"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuizAnswer" ADD CONSTRAINT "QuizAnswer_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuizAnswer" ADD CONSTRAINT "QuizAnswer_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SkillBadge" ADD CONSTRAINT "SkillBadge_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobVacancy" ADD CONSTRAINT "JobVacancy_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobVacancyRequiredCourse" ADD CONSTRAINT "JobVacancyRequiredCourse_vacancyId_fkey" FOREIGN KEY ("vacancyId") REFERENCES "JobVacancy"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobVacancyRequiredCourse" ADD CONSTRAINT "JobVacancyRequiredCourse_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LivePollOption" ADD CONSTRAINT "LivePollOption_pollId_fkey" FOREIGN KEY ("pollId") REFERENCES "LivePoll"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LivePollResponse" ADD CONSTRAINT "LivePollResponse_pollId_fkey" FOREIGN KEY ("pollId") REFERENCES "LivePoll"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LivePollResponse" ADD CONSTRAINT "LivePollResponse_optionId_fkey" FOREIGN KEY ("optionId") REFERENCES "LivePollOption"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LivePollResponse" ADD CONSTRAINT "LivePollResponse_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_LegacyCourseTeachers" ADD CONSTRAINT "_LegacyCourseTeachers_A_fkey" FOREIGN KEY ("A") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_LegacyCourseTeachers" ADD CONSTRAINT "_LegacyCourseTeachers_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "CurriculumItem_curriculumVersionId_categoryId_sequenceNumber_id" RENAME TO "CurriculumItem_curriculumVersionId_categoryId_sequenceNumbe_idx";

-- RenameIndex
ALTER INDEX "ProgramGradeCourse_programId_gradeLevel_academicYear_courseId_k" RENAME TO "ProgramGradeCourse_programId_gradeLevel_academicYear_course_key";

