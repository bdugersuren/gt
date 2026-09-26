-- Master data lifecycle: preserve historical links while hiding archived entities.
CREATE TYPE "EntityStatus" AS ENUM ('ACTIVE', 'ARCHIVED');

ALTER TABLE "Department"
  ADD COLUMN "status" "EntityStatus" NOT NULL DEFAULT 'ACTIVE';

ALTER TABLE "ClassGroup"
  ADD COLUMN "status" "EntityStatus" NOT NULL DEFAULT 'ACTIVE';
