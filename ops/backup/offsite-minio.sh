#!/bin/sh
set -eu

: "${SOURCE_MINIO_URL:?SOURCE_MINIO_URL is required}"
: "${SOURCE_MINIO_ACCESS_KEY:?SOURCE_MINIO_ACCESS_KEY is required}"
: "${SOURCE_MINIO_SECRET_KEY:?SOURCE_MINIO_SECRET_KEY is required}"
: "${OFFSITE_S3_URL:?OFFSITE_S3_URL is required}"
: "${OFFSITE_S3_ACCESS_KEY:?OFFSITE_S3_ACCESS_KEY is required}"
: "${OFFSITE_S3_SECRET_KEY:?OFFSITE_S3_SECRET_KEY is required}"
: "${OFFSITE_BUCKET:?OFFSITE_BUCKET is required}"

mc alias set source "$SOURCE_MINIO_URL" "$SOURCE_MINIO_ACCESS_KEY" "$SOURCE_MINIO_SECRET_KEY"
mc alias set offsite "$OFFSITE_S3_URL" "$OFFSITE_S3_ACCESS_KEY" "$OFFSITE_S3_SECRET_KEY"
stamp="$(date -u +%Y%m%dT%H%M%SZ)"
mc mirror --preserve source/lms-media "offsite/$OFFSITE_BUCKET/$stamp/lms-media"
echo "MinIO off-site backup completed: $stamp"

