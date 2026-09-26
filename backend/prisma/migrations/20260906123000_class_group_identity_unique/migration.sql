-- Enforce one class per program, cohort year and course level.
-- PostgreSQL unique constraints allow multiple legacy NULL values; new normalized requests require both values.
CREATE UNIQUE INDEX "ClassGroup_programId_cohortYear_gradeLevel_key"
ON "ClassGroup"("programId", "cohortYear", "gradeLevel");
