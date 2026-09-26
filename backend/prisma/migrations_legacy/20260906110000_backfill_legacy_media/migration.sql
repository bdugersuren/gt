-- Data-preserving media backfill. Legacy URL columns intentionally remain until verification.
INSERT INTO "MediaAsset" ("id", "bucketName", "objectKey", "publicUrl", "hlsUrl", "type", "originalName", "mimeType", "sizeBytes", "lessonId", "uploaderId")
SELECT gen_random_uuid(), 'legacy', md5('legacy/lesson/' || lesson."id" || '/video'), lesson."videoUrl", lesson."videoUrl", 'VIDEO_HLS', 'legacy-video-' || lesson."id", 'application/vnd.apple.mpegurl', 0, lesson."id", uploader."id"
FROM "Lesson" lesson
CROSS JOIN LATERAL (SELECT "id" FROM "User" WHERE "roles" && ARRAY['ADMIN','MANAGER','TEACHER']::"Role"[] ORDER BY "createdAt" LIMIT 1) uploader
WHERE NULLIF(trim(lesson."videoUrl"), '') IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM "MediaAsset" asset WHERE asset."lessonId"=lesson."id" AND asset."publicUrl"=lesson."videoUrl");

INSERT INTO "MediaAsset" ("id", "bucketName", "objectKey", "publicUrl", "type", "originalName", "mimeType", "sizeBytes", "lessonId", "uploaderId")
SELECT gen_random_uuid(), 'legacy', md5('legacy/lesson/' || lesson."id" || '/pdf'), lesson."pdfUrl", 'PDF', 'legacy-pdf-' || lesson."id", 'application/pdf', 0, lesson."id", uploader."id"
FROM "Lesson" lesson
CROSS JOIN LATERAL (SELECT "id" FROM "User" WHERE "roles" && ARRAY['ADMIN','MANAGER','TEACHER']::"Role"[] ORDER BY "createdAt" LIMIT 1) uploader
WHERE NULLIF(trim(lesson."pdfUrl"), '') IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM "MediaAsset" asset WHERE asset."lessonId"=lesson."id" AND asset."publicUrl"=lesson."pdfUrl");

INSERT INTO "MediaAsset" ("id", "bucketName", "objectKey", "publicUrl", "hlsUrl", "type", "originalName", "mimeType", "sizeBytes", "uploaderId")
SELECT gen_random_uuid(), 'legacy', md5('legacy/submission/' || submission."id" || '/file'), COALESCE(submission."hlsStreamUrl", submission."fileUrl"), submission."hlsStreamUrl", CASE WHEN NULLIF(trim(submission."hlsStreamUrl"), '') IS NOT NULL THEN 'VIDEO_HLS' ELSE 'OTHER' END::"MediaAssetType", 'legacy-submission-' || submission."id", 'application/octet-stream', 0, submission."studentId"
FROM "Submission" submission
WHERE (NULLIF(trim(submission."fileUrl"), '') IS NOT NULL OR NULLIF(trim(submission."hlsStreamUrl"), '') IS NOT NULL)
  AND NOT EXISTS (SELECT 1 FROM "MediaAsset" asset WHERE asset."objectKey"=md5('legacy/submission/' || submission."id" || '/file'));

INSERT INTO "SubmissionAsset" ("submissionId", "assetId")
SELECT submission."id", asset."id"
FROM "Submission" submission
JOIN "MediaAsset" asset ON asset."objectKey"=md5('legacy/submission/' || submission."id" || '/file')
WHERE NULLIF(trim(submission."fileUrl"), '') IS NOT NULL OR NULLIF(trim(submission."hlsStreamUrl"), '') IS NOT NULL
ON CONFLICT ("submissionId", "assetId") DO NOTHING;
