CREATE TYPE "StudentStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'GRADUATED', 'WITHDRAWN', 'EXPELLED');
CREATE TYPE "PromotionStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');

CREATE TABLE "Program" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "durationMonths" INTEGER NOT NULL,
  "status" "EntityStatus" NOT NULL DEFAULT 'ACTIVE',
  "departmentId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Program_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Program_code_key" ON "Program"("code");
CREATE INDEX "Program_departmentId_status_idx" ON "Program"("departmentId", "status");
ALTER TABLE "Program" ADD CONSTRAINT "Program_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "ProgramGradeCourse" (
  "id" TEXT NOT NULL,
  "programId" TEXT NOT NULL,
  "gradeLevel" INTEGER NOT NULL,
  "academicYear" TEXT NOT NULL,
  "courseId" TEXT NOT NULL,
  "isRequired" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProgramGradeCourse_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ProgramGradeCourse_programId_gradeLevel_academicYear_courseId_key" ON "ProgramGradeCourse"("programId", "gradeLevel", "academicYear", "courseId");
CREATE INDEX "ProgramGradeCourse_programId_gradeLevel_academicYear_idx" ON "ProgramGradeCourse"("programId", "gradeLevel", "academicYear");
ALTER TABLE "ProgramGradeCourse" ADD CONSTRAINT "ProgramGradeCourse_programId_fkey" FOREIGN KEY ("programId") REFERENCES "Program"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProgramGradeCourse" ADD CONSTRAINT "ProgramGradeCourse_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "User"
  ADD COLUMN "programId" TEXT,
  ADD COLUMN "enrollmentYear" INTEGER,
  ADD COLUMN "graduationYear" INTEGER,
  ADD COLUMN "graduatedAt" TIMESTAMP(3),
  ADD COLUMN "studentStatus" "StudentStatus" NOT NULL DEFAULT 'ACTIVE';
CREATE INDEX "User_programId_studentStatus_idx" ON "User"("programId", "studentStatus");
ALTER TABLE "User" ADD CONSTRAINT "User_programId_fkey" FOREIGN KEY ("programId") REFERENCES "Program"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ClassGroup"
  ADD COLUMN "programId" TEXT,
  ADD COLUMN "gradeLevel" INTEGER,
  ADD COLUMN "cohortYear" INTEGER,
  ADD COLUMN "graduationYear" INTEGER;
CREATE INDEX "ClassGroup_programId_cohortYear_gradeLevel_idx" ON "ClassGroup"("programId", "cohortYear", "gradeLevel");
ALTER TABLE "ClassGroup" ADD CONSTRAINT "ClassGroup_programId_fkey" FOREIGN KEY ("programId") REFERENCES "Program"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "StudentPromotion" (
  "id" TEXT NOT NULL,
  "studentId" TEXT NOT NULL,
  "fromClassGroupId" TEXT NOT NULL,
  "toClassGroupId" TEXT,
  "fromGradeLevel" INTEGER NOT NULL,
  "toGradeLevel" INTEGER,
  "academicYear" TEXT NOT NULL,
  "status" "PromotionStatus" NOT NULL DEFAULT 'PENDING',
  "eligible" BOOLEAN NOT NULL,
  "completedRequiredCourses" INTEGER NOT NULL DEFAULT 0,
  "requiredCourseCount" INTEGER NOT NULL DEFAULT 0,
  "reason" TEXT,
  "approvedById" TEXT,
  "approvedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "StudentPromotion_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "StudentPromotion_studentId_academicYear_idx" ON "StudentPromotion"("studentId", "academicYear");
CREATE INDEX "StudentPromotion_fromClassGroupId_status_idx" ON "StudentPromotion"("fromClassGroupId", "status");
CREATE UNIQUE INDEX "StudentPromotion_studentId_academicYear_fromClassGroupId_key" ON "StudentPromotion"("studentId", "academicYear", "fromClassGroupId");
ALTER TABLE "StudentPromotion" ADD CONSTRAINT "StudentPromotion_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StudentPromotion" ADD CONSTRAINT "StudentPromotion_fromClassGroupId_fkey" FOREIGN KEY ("fromClassGroupId") REFERENCES "ClassGroup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StudentPromotion" ADD CONSTRAINT "StudentPromotion_toClassGroupId_fkey" FOREIGN KEY ("toClassGroupId") REFERENCES "ClassGroup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StudentPromotion" ADD CONSTRAINT "StudentPromotion_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
