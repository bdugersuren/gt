-- Read-only final cleanup gate. Run against the production clone before cleanup.
SELECT 'duplicate_register_numbers' AS check, COUNT(*) AS failures FROM (SELECT "registerNumber" FROM "User" WHERE "registerNumber" IS NOT NULL GROUP BY 1 HAVING COUNT(*) > 1) x
UNION ALL SELECT 'class_groups_missing_program_or_year', COUNT(*) FROM "ClassGroup" WHERE "programId" IS NULL OR "academicYearId" IS NULL
UNION ALL SELECT 'curriculum_versions_missing_year_or_version', COUNT(*) FROM "CurriculumVersion" WHERE "academicYearId" IS NULL OR "versionNo" IS NULL
UNION ALL SELECT 'vacancies_missing_company', COUNT(*) FROM "JobVacancy" WHERE "companyId" IS NULL
UNION ALL SELECT 'student_users_missing_profile', COUNT(*) FROM "User" u WHERE u."roles" @> ARRAY['STUDENT']::"Role"[] AND NOT EXISTS (SELECT 1 FROM "StudentProfile" p WHERE p."userId"=u."id")
UNION ALL SELECT 'staff_users_missing_profile', COUNT(*) FROM "User" u WHERE u."roles" && ARRAY['ADMIN','MANAGER','TEACHER']::"Role"[] AND NOT EXISTS (SELECT 1 FROM "StaffProfile" p WHERE p."userId"=u."id")
UNION ALL SELECT 'enrollments_missing_normalized_relation', COUNT(*) FROM "Enrollment" e WHERE e."profileStudentId" IS NULL OR (e."source"='STANDALONE' AND e."standaloneCourseId" IS NULL) OR (e."source"='CURRICULUM' AND e."curriculumItemId" IS NULL)
UNION ALL SELECT 'lessons_missing_media_backfill', COUNT(*) FROM "Lesson" l WHERE (NULLIF(trim(l."videoUrl"), '') IS NOT NULL OR NULLIF(trim(l."pdfUrl"), '') IS NOT NULL) AND NOT EXISTS (SELECT 1 FROM "MediaAsset" a WHERE a."lessonId"=l."id" AND a."publicUrl" IN (l."videoUrl", l."pdfUrl"))
UNION ALL SELECT 'submissions_missing_media_backfill', COUNT(*) FROM "Submission" s WHERE (NULLIF(trim(s."fileUrl"), '') IS NOT NULL OR NULLIF(trim(s."hlsStreamUrl"), '') IS NOT NULL) AND NOT EXISTS (SELECT 1 FROM "SubmissionAsset" sa JOIN "MediaAsset" a ON a."id"=sa."assetId" WHERE sa."submissionId"=s."id");
