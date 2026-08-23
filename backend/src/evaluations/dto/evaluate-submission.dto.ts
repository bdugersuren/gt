import { IsNotEmpty, IsString, IsOptional, IsArray, IsEnum, ValidateNested, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { CBTStatus } from '@prisma/client';

export class CriteriaScoreInput {
  @IsString()
  @IsNotEmpty()
  criteriaId!: string;

  @IsNumber()
  @Min(0)
  @IsNotEmpty()
  scoreEarned!: number;
}

export class EvaluateSubmissionDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CriteriaScoreInput)
  @IsNotEmpty({ message: 'Шалгуурын үнэлгээний оноонууд (criteriaScores) хоосон байж болохгүй' })
  criteriaScores!: CriteriaScoreInput[];

  @IsString()
  @IsOptional()
  feedback?: string;

  @IsEnum(CBTStatus, { message: 'Чадамжийн төлөв буруу байна (NOT_EVALUATED, COMPETENT, NOT_YET_COMPETENT, RE_ASSESSMENT_REQ)' })
  @IsNotEmpty()
  cbtResult!: CBTStatus;
}
