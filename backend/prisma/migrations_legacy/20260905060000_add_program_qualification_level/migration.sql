CREATE TYPE "QualificationLevel" AS ENUM (
  'PROFESSIONAL_EDUCATION_III_IV',
  'TECHNICAL_EDUCATION_V_VI',
  'VOCATIONAL_TRAINING_I_V'
);

ALTER TABLE "Program"
  ADD COLUMN "qualificationLevel" "QualificationLevel" NOT NULL DEFAULT 'PROFESSIONAL_EDUCATION_III_IV';

DROP INDEX "Program_code_key";
CREATE UNIQUE INDEX "Program_code_qualificationLevel_key" ON "Program"("code", "qualificationLevel");
