#!/bin/sh
set -eu

if [ "${OFFSITE_BACKUP_CONFIRMED:-}" != "yes" ]; then
  echo "Deployment blocked: OFFSITE_BACKUP_CONFIRMED=yes is required" >&2
  exit 1
fi
if [ "${STAGING_RESTORE_CONFIRMED:-}" != "yes" ]; then
  echo "Deployment blocked: STAGING_RESTORE_CONFIRMED=yes is required" >&2
  exit 1
fi
if [ -z "${IMAGE_TAG:-}" ] || [ "$IMAGE_TAG" = "latest" ] || [ "$IMAGE_TAG" = "local" ]; then
  echo "Deployment blocked: immutable IMAGE_TAG is required" >&2
  exit 1
fi

docker compose config --quiet
echo "Production preflight passed for image tag: $IMAGE_TAG"

