CREATE TYPE "CurriculumVersionStatus" AS ENUM ('DRAFT', 'APPROVED', 'ARCHIVED');
CREATE TYPE "ElectiveSelectionType" AS ENUM ('CREDIT_REQUIREMENT', 'COURSE_COUNT');

CREATE TABLE "CurriculumVersion" (
  "id" TEXT NOT NULL,
  "programId" TEXT NOT NULL,
  "versionName" TEXT NOT NULL,
  "academicYear" TEXT NOT NULL,
  "semesterCount" INTEGER NOT NULL,
  "status" "CurriculumVersionStatus" NOT NULL DEFAULT 'DRAFT',
  "approvedById" TEXT,
  "approvedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CurriculumVersion_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "CurriculumVersion_programId_academicYear_key" ON "CurriculumVersion"("programId", "academicYear");
CREATE INDEX "CurriculumVersion_programId_status_idx" ON "CurriculumVersion"("programId", "status");
ALTER TABLE "CurriculumVersion" ADD CONSTRAINT "CurriculumVersion_programId_fkey" FOREIGN KEY ("programId") REFERENCES "Program"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CurriculumVersion" ADD CONSTRAINT "CurriculumVersion_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "CurriculumCategory" (
  "id" TEXT NOT NULL,
  "curriculumVersionId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "isRequired" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CurriculumCategory_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "CurriculumCategory_curriculumVersionId_code_key" ON "CurriculumCategory"("curriculumVersionId", "code");
CREATE INDEX "CurriculumCategory_curriculumVersionId_sortOrder_idx" ON "CurriculumCategory"("curriculumVersionId", "sortOrder");
ALTER TABLE "CurriculumCategory" ADD CONSTRAINT "CurriculumCategory_curriculumVersionId_fkey" FOREIGN KEY ("curriculumVersionId") REFERENCES "CurriculumVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "ElectiveGroup" (
  "id" TEXT NOT NULL,
  "curriculumVersionId" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "minimumCredits" INTEGER NOT NULL DEFAULT 0,
  "minimumCourseCount" INTEGER NOT NULL DEFAULT 0,
  "selectionType" "ElectiveSelectionType" NOT NULL DEFAULT 'CREDIT_REQUIREMENT',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ElectiveGroup_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ElectiveGroup_curriculumVersionId_code_key" ON "ElectiveGroup"("curriculumVersionId", "code");
ALTER TABLE "ElectiveGroup" ADD CONSTRAINT "ElectiveGroup_curriculumVersionId_fkey" FOREIGN KEY ("curriculumVersionId") REFERENCES "CurriculumVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "CurriculumItem" (
  "id" TEXT NOT NULL,
  "curriculumVersionId" TEXT NOT NULL,
  "categoryId" TEXT NOT NULL,
  "courseId" TEXT NOT NULL,
  "electiveGroupId" TEXT,
  "sequenceNumber" INTEGER NOT NULL,
  "unitName" TEXT NOT NULL,
  "unitCode" TEXT NOT NULL,
  "totalCredits" INTEGER NOT NULL,
  "theoryHours" INTEGER NOT NULL DEFAULT 0,
  "schoolPracticeHours" INTEGER NOT NULL DEFAULT 0,
  "workplacePracticeHours" INTEGER NOT NULL DEFAULT 0,
  "isRequired" BOOLEAN NOT NULL DEFAULT true,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CurriculumItem_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "CurriculumItem_curriculumVersionId_courseId_key" ON "CurriculumItem"("curriculumVersionId", "courseId");
CREATE INDEX "CurriculumItem_curriculumVersionId_categoryId_sequenceNumber_idx" ON "CurriculumItem"("curriculumVersionId", "categoryId", "sequenceNumber");
ALTER TABLE "CurriculumItem" ADD CONSTRAINT "CurriculumItem_curriculumVersionId_fkey" FOREIGN KEY ("curriculumVersionId") REFERENCES "CurriculumVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CurriculumItem" ADD CONSTRAINT "CurriculumItem_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "CurriculumCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CurriculumItem" ADD CONSTRAINT "CurriculumItem_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CurriculumItem" ADD CONSTRAINT "CurriculumItem_electiveGroupId_fkey" FOREIGN KEY ("electiveGroupId") REFERENCES "ElectiveGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "CurriculumItemSemester" (
  "id" TEXT NOT NULL,
  "curriculumItemId" TEXT NOT NULL,
  "semesterNumber" INTEGER NOT NULL,
  "academicYearLabel" TEXT,
  "credits" INTEGER NOT NULL DEFAULT 0,
  "hours" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CurriculumItemSemester_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "CurriculumItemSemester_curriculumItemId_semesterNumber_key" ON "CurriculumItemSemester"("curriculumItemId", "semesterNumber");
CREATE INDEX "CurriculumItemSemester_semesterNumber_idx" ON "CurriculumItemSemester"("semesterNumber");
ALTER TABLE "CurriculumItemSemester" ADD CONSTRAINT "CurriculumItemSemester_curriculumItemId_fkey" FOREIGN KEY ("curriculumItemId") REFERENCES "CurriculumItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Enrollment" ADD COLUMN "curriculumItemId" TEXT;
ALTER TABLE "Enrollment" ADD CONSTRAINT "Enrollment_curriculumItemId_fkey" FOREIGN KEY ("curriculumItemId") REFERENCES "CurriculumItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "Enrollment_curriculumItemId_idx" ON "Enrollment"("curriculumItemId");
