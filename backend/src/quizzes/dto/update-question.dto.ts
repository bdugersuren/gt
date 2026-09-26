import { IsString, IsOptional, IsNumber, Min, IsEnum, IsArray, ValidateNested, IsBoolean, IsInt } from 'class-validator';
import { Type } from 'class-transformer';
import { QuestionType } from '@prisma/client';

class UpdateOptionDto { @IsString() value!: string; @IsString() @IsOptional() matchValue?: string; @IsBoolean() @IsOptional() isCorrect?: boolean; @IsInt() @IsOptional() order?: number; }

export class UpdateQuestionDto {
  @IsString()
  @IsOptional()
  text?: string;

  @IsEnum(QuestionType)
  @IsOptional()
  type?: QuestionType;

  @IsArray() @ValidateNested({ each: true }) @Type(() => UpdateOptionDto) @IsOptional()
  options?: UpdateOptionDto[];

  /** @deprecated Use options. */
  @IsOptional() optionsJson?: any;
  /** @deprecated Use options[].isCorrect. */
  @IsString() @IsOptional() correctAnswer?: string;

  @IsString()
  @IsOptional()
  explanation?: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  points?: number;
}
