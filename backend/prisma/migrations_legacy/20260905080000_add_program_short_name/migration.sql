ALTER TABLE "Program"
  ADD COLUMN "shortName" TEXT;

CREATE UNIQUE INDEX "Program_shortName_key" ON "Program"("shortName");
