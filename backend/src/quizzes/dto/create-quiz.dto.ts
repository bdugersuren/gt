import { IsNotEmpty, IsString, IsInt, IsNumber, Min, IsArray } from 'class-validator';

export class CreateQuizDto {
  @IsString()
  @IsNotEmpty({ message: 'Тестийн нэр хоосон байж болохгүй' })
  title!: string;

  @IsInt({ message: 'Хугацааны хязгаар нь минут байх ёстой (бүхэл тоо)' })
  @Min(1, { message: 'Хугацаа хамгийн багадаа 1 минут байна' })
  @IsNotEmpty()
  timeLimitMin!: number;

  @IsNumber({}, { message: 'Тэнцэх оноо нь тоо байх ёстой' })
  @Min(0)
  @IsNotEmpty()
  passScore!: number;

  @IsString()
  @IsNotEmpty({ message: 'Лекцийн ID хоосон байж болохгүй' })
  lessonId!: string;

  @IsArray({ message: 'Асуултын ID-ууд нь массив байх ёстой' })
  @IsString({ each: true, message: 'Асуултын ID бүр тэмдэгт мөр байх ёстой' })
  @IsNotEmpty({ each: true })
  questionIds!: string[];
}
