import { IsArray, IsNotEmpty, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class QuizAnswerInputDto {
  @IsString() @IsNotEmpty() questionId!: string;
  @IsString() @IsOptional() answerText?: string;
  @IsArray() @IsString({ each: true }) @IsOptional() selectedOptionIds?: string[];
}

export class SubmitAttemptDto {
  @IsArray() @ValidateNested({ each: true }) @Type(() => QuizAnswerInputDto) @IsOptional()
  answers?: QuizAnswerInputDto[];

  /** @deprecated Use answers. */
  @IsOptional() answersJson?: Record<string, string>;
}
