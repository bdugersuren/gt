DROP INDEX "Program_code_qualificationLevel_key";
CREATE UNIQUE INDEX "Program_code_qualificationLevel_durationMonths_key" ON "Program"("code", "qualificationLevel", "durationMonths");
