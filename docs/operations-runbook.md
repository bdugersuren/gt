# LMS operations runbook

## Safety rules

- Never run `docker compose down -v` on an environment containing user data.
- Take and verify PostgreSQL and MinIO backups before a migration, image upgrade, or restore.
- Test every migration and restore against staging first.
- Production uses `docker-compose.yml`; development uses `docker-compose.dev.yml` explicitly.

## Release

1. Set unique image tags and all required secrets in the deployment secret store.
2. Run CI and build immutable images.
3. Run `pnpm backup:postgres` and the MinIO off-host replication job.
4. Verify checksums and the latest restore drill.
5. Run the one-shot migration service with the `ops` profile.
6. Start the application and media profile, then check every health endpoint.
7. Run login, course-read, upload, and queue smoke tests.

## Staging restore gate

1. Start staging with a distinct Compose project and `docker-compose.staging.yml`; never reuse production volumes.
2. Restore the PostgreSQL custom archive into the staging database and restore MinIO objects/raw snapshot into the staging volume while MinIO is stopped.
3. Resolve the four baseline migrations only after `prisma migrate diff --exit-code` reports no difference.
4. Run the full baseline on a second empty database and diff it against the restored database.
5. Run `ops/staging/verify.sh`, five-role smoke tests, and authorization negative tests.
6. Keep staging internal or bind its ports only to `127.0.0.1`.

The production preflight script refuses deployment unless off-site backup and staging restore are explicitly confirmed and an immutable image tag is supplied.

## Rollback

1. Stop rollout traffic at the reverse proxy.
2. Re-deploy the previous immutable image tag.
3. Do not roll back a database schema blindly. Use the documented compatible app version or a tested forward repair migration.
4. Restore data only after preserving the failed state and obtaining approval.

## Backup and restore

- PostgreSQL backups are custom-format `pg_dump` archives with SHA-256 and a TOC listing.
- MinIO must be copied through an authenticated object-storage client to off-host storage; a Docker volume alone is not a backup.
- Verify PostgreSQL with `pg_restore --list`, then restore into a new staging database.
- Verify every MinIO object against the stored checksum manifest.
- After restore, compare critical table counts and run the five-role application smoke test.

## Incident checks

- Restart loop: inspect health status and bounded logs before restarting.
- Disk full: stop uploads/transcoding, preserve logs, expand or clean only known disposable artifacts.
- Queue stalled: inspect Redis connectivity and failed BullMQ jobs; do not delete the queue until jobs are classified.
- MinIO scanner/heal error: stop writes if integrity is uncertain, take a filesystem snapshot, then run vendor-supported diagnostics.
- Credential exposure: rotate the affected secret, restart dependent services, revoke sessions, and review audit logs.

## Current migration baseline warning

The live database was created with `prisma db push` and has no `_prisma_migrations` table. A full baseline is now available and has been proven equivalent on restored and clean staging databases. Do not resolve it on live until the off-site backup gate passes; then use `ops/migrations/baseline-live.sh` with its explicit confirmation value.

## MinIO note

The current deployment is a one-drive `mode-server-xl-single` instance. Admin heal is not supported in this mode. Object listing and reads are healthy (2 objects, 11 MiB), but the old scanner stack trace and lack of redundancy mean the image upgrade must remain a staging-only operation until an off-site object copy is verified.
