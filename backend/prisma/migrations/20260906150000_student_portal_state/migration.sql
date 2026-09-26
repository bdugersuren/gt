-- Server-side student notes and lesson content gates.
CREATE TYPE "LessonGateTrigger" AS ENUM ('VIDEO_TIMESTAMP', 'PDF_PAGE');

CREATE TABLE "StudentLessonNote" (
  "id" TEXT NOT NULL,
  "studentId" TEXT NOT NULL,
  "lessonId" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "StudentLessonNote_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LessonGate" (
  "id" TEXT NOT NULL,
  "lessonId" TEXT NOT NULL,
  "quizId" TEXT NOT NULL,
  "triggerType" "LessonGateTrigger" NOT NULL,
  "triggerValue" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LessonGate_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "StudentLessonNote_studentId_lessonId_key" ON "StudentLessonNote"("studentId", "lessonId");
CREATE INDEX "StudentLessonNote_studentId_idx" ON "StudentLessonNote"("studentId");
CREATE INDEX "StudentLessonNote_lessonId_idx" ON "StudentLessonNote"("lessonId");
CREATE UNIQUE INDEX "LessonGate_lessonId_quizId_triggerType_triggerValue_key" ON "LessonGate"("lessonId", "quizId", "triggerType", "triggerValue");
CREATE INDEX "LessonGate_lessonId_idx" ON "LessonGate"("lessonId");
CREATE INDEX "LessonGate_quizId_idx" ON "LessonGate"("quizId");

ALTER TABLE "StudentLessonNote" ADD CONSTRAINT "StudentLessonNote_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StudentLessonNote" ADD CONSTRAINT "StudentLessonNote_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LessonGate" ADD CONSTRAINT "LessonGate_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LessonGate" ADD CONSTRAINT "LessonGate_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES "Quiz"("id") ON DELETE CASCADE ON UPDATE CASCADE;
