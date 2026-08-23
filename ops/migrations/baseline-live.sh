#!/bin/sh
set -eu

if [ "${CONFIRM_BASELINE:-}" != "I_HAVE_VERIFIED_SCHEMA_DIFF_AND_RESTORE" ]; then
  echo "Refusing to baseline: set CONFIRM_BASELINE=I_HAVE_VERIFIED_SCHEMA_DIFF_AND_RESTORE" >&2
  exit 1
fi

schema="${PRISMA_SCHEMA:-backend/prisma/schema.prisma}"
prisma_cli="${PRISMA_CLI:-backend/node_modules/.bin/prisma}"
"$prisma_cli" migrate diff --from-url "$DATABASE_URL" --to-schema-datamodel "$schema" --exit-code

for migration in \
  20260818000000_baseline \
  20260818045909_add_media_asset_model \
  20260820131935_add_live_sessions \
  20260820132047_add_live_sessions
do
  "$prisma_cli" migrate resolve --applied "$migration" --schema "$schema"
done

"$prisma_cli" migrate status --schema "$schema"
