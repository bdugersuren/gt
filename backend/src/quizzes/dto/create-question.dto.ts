import { IsNotEmpty, IsString, IsEnum, IsOptional, IsNumber, Min, IsArray, ValidateNested, IsBoolean, IsInt } from 'class-validator';
import { Type } from 'class-transformer';
import { QuestionType } from '@prisma/client';

export class QuestionOptionDto {
  @IsString() @IsNotEmpty() value!: string;
  @IsString() @IsOptional() matchValue?: string;
  @IsBoolean() @IsOptional() isCorrect?: boolean;
  @IsInt() @IsOptional() order?: number;
}

export class CreateQuestionDto {
  @IsString()
  @IsNotEmpty({ message: 'Асуултын текст хоосон байж болохгүй' })
  text!: string;

  @IsEnum(QuestionType, { message: 'Асуултын төрөл буруу байна (MULTIPLE_CHOICE, TRUE_FALSE, SHORT_ANSWER, MATCHING)' })
  @IsNotEmpty()
  type!: QuestionType;

  @IsArray() @ValidateNested({ each: true }) @Type(() => QuestionOptionDto) @IsOptional()
  options?: QuestionOptionDto[];

  /** @deprecated Use options. */
  @IsOptional()
  optionsJson?: any;

  /** @deprecated Use options[].isCorrect. */
  @IsString() @IsOptional()
  correctAnswer?: string;

  @IsString()
  @IsOptional()
  explanation?: string;

  @IsNumber({}, { message: 'Оноо нь тоо байх ёстой' })
  @Min(0, { message: 'Оноо хамгийн багадаа 0 байна' })
  @IsOptional()
  points?: number;

  @IsString()
  @IsNotEmpty({ message: 'Хичээлийн ID хоосон байж болохгүй' })
  courseId!: string;
}
