#!/bin/sh
set -eu
stamp="$(date -u +%Y%m%dT%H%M%SZ)"
target="/backup/${stamp}"
mkdir -p "$target"
pg_dump --format=custom --no-owner --no-privileges --file "$target/postgres.dump"
(cd "$target" && sha256sum postgres.dump > SHA256SUMS)
pg_restore --list "$target/postgres.dump" > "$target/postgres.contents"
echo "PostgreSQL backup created: $target/postgres.dump"
