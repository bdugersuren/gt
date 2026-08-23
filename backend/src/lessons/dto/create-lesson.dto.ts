import { IsNotEmpty, IsString, IsInt, Min, IsOptional } from 'class-validator';

export class CreateLessonDto {
  @IsString()
  @IsNotEmpty({ message: 'Лекцийн нэр хоосон байж болохгүй' })
  title!: string;

  @IsInt({ message: 'Дараалал нь бүхэл тоо байх ёстой' })
  @Min(1, { message: 'Дараалал нь хамгийн багадаа 1 байна' })
  @IsNotEmpty()
  order!: number;

  @IsString()
  @IsNotEmpty({ message: 'Агуулгын төрөл (contentType) хоосон байж болохгүй' })
  contentType!: string; // e.g. MARKDOWN, VIDEO_HLS, PDF, QUIZ, PRACTICAL_LAB

  @IsString()
  @IsOptional()
  contentBody?: string;

  @IsString()
  @IsOptional()
  videoUrl?: string;

  @IsString()
  @IsOptional()
  pdfUrl?: string;

  @IsString()
  @IsNotEmpty({ message: 'Модулийн ID хоосон байж болохгүй' })
  moduleId!: string;
}
