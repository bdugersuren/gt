import { IsString, IsOptional, IsNumber, Min, IsEnum } from 'class-validator';
import { QuestionType } from '@prisma/client';

export class UpdateQuestionDto {
  @IsString()
  @IsOptional()
  text?: string;

  @IsEnum(QuestionType)
  @IsOptional()
  type?: QuestionType;

  @IsOptional()
  optionsJson?: any;

  @IsString()
  @IsOptional()
  correctAnswer?: string;

  @IsString()
  @IsOptional()
  explanation?: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  points?: number;
}
