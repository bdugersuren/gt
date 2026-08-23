import { IsNotEmpty, IsString, IsInt, Min } from 'class-validator';

export class CreateModuleDto {
  @IsString()
  @IsNotEmpty({ message: 'Модулийн нэр хоосон байж болохгүй' })
  title!: string;

  @IsInt({ message: 'Дараалал нь бүхэл тоо байх ёстой' })
  @Min(1, { message: 'Дараалал нь хамгийн багадаа 1 байна' })
  @IsNotEmpty()
  order!: number;

  @IsString()
  @IsNotEmpty({ message: 'Хичээлийн ID хоосон байж болохгүй' })
  courseId!: string;
}
