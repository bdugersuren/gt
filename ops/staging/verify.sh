#!/bin/sh
set -eu

project="${COMPOSE_PROJECT_NAME:-gt-lms-staging}"
expected_users="${EXPECTED_USERS:-6}"
expected_courses="${EXPECTED_COURSES:-2}"
expected_lessons="${EXPECTED_LESSONS:-5}"
expected_media="${EXPECTED_MEDIA_ASSETS:-2}"

case "$project" in
  *staging*) ;;
  *) echo "Refusing to verify non-staging project: $project" >&2; exit 1 ;;
esac

backend="${project}-backend-1"
postgres="${project}-postgres-1"
minio="${project}-minio-1"

docker exec "$backend" node -e "fetch('http://127.0.0.1:5000/api/health/ready').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

counts="$(docker exec "$postgres" psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Atc \
  'SELECT (SELECT count(*) FROM "User"),(SELECT count(*) FROM "Course"),(SELECT count(*) FROM "Lesson"),(SELECT count(*) FROM "MediaAsset");')"
expected="${expected_users}|${expected_courses}|${expected_lessons}|${expected_media}"
if [ "$counts" != "$expected" ]; then
  echo "Restore count mismatch: got $counts, expected $expected" >&2
  exit 1
fi

docker exec "$minio" sh -lc 'MC_HOST_diag="http://$MINIO_ROOT_USER:$MINIO_ROOT_PASSWORD@127.0.0.1:9000" mc stat diag/lms-media >/dev/null'
echo "Staging restore verified: $counts"

