# Final normalized schema cleanup runbook

This is a destructive, one-way schema migration. It must not be run against the primary database until the application release has no reads/writes to legacy columns.

## 1. Build and backup

```bash
pnpm typecheck
pnpm build
export DATABASE_URL="postgresql://.../gt_lms"
pg_dump --format=custom --file="backup-$(date -u +%Y%m%dT%H%M%SZ).dump" "$DATABASE_URL"
```

Store the dump outside the database host and verify it with `pg_restore --list`.

## 2. Readiness on a staging clone

Run the read-only gate first:

```bash
pnpm --filter pk-backend prisma:cleanup:readiness
```

Every returned `failures` value must be `0`. Also run the application smoke/regression suite against the clone. The migration intentionally refuses to run without the explicit opt-in setting.

## 3. Staging cleanup

```bash
PGOPTIONS='-c app.allow_schema_cleanup=true'   pnpm --filter pk-backend prisma:cleanup:deploy
```

Restart the normalized backend/frontend release, then verify login, import, class membership, curriculum, enrollment, quiz, submission/media, live session, career and messaging flows.

## 4. Production change window

1. Freeze writes and stop old application workers.
2. Take and verify a fresh production backup.
3. Run `prisma:cleanup:readiness` against the same database.
4. Run the cleanup command with `PGOPTIONS` enabled.
5. Start only the normalized application release.
6. Run post-deploy smoke tests and compare the pre/post row-count report.

Never use `--accept-data-loss` and never run this migration on a database that has not passed the readiness gate.

## Rollback

There is no SQL rollback: legacy columns/tables are dropped. Roll back by stopping the application, restoring the verified `pg_dump` backup to a new database, switching `DATABASE_URL`, and deploying the previous application image. Validate the restored database before switching traffic.
