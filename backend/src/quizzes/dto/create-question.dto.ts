import { IsNotEmpty, IsString, IsEnum, IsOptional, IsNumber, Min } from 'class-validator';
import { QuestionType } from '@prisma/client';

export class CreateQuestionDto {
  @IsString()
  @IsNotEmpty({ message: 'Асуултын текст хоосон байж болохгүй' })
  text!: string;

  @IsEnum(QuestionType, { message: 'Асуултын төрөл буруу байна (MULTIPLE_CHOICE, TRUE_FALSE, SHORT_ANSWER, MATCHING)' })
  @IsNotEmpty()
  type!: QuestionType;

  @IsNotEmpty({ message: 'Асуултын сонголтууд (optionsJson) заавал байх ёстой' })
  optionsJson!: any; // Array of options or option matching pairs

  @IsString()
  @IsNotEmpty({ message: 'Зөв хариулт хоосон байж болохгүй' })
  correctAnswer!: string;

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
