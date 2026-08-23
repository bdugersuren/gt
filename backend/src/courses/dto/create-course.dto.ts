import { IsNotEmpty, IsString, IsBoolean, IsOptional, IsUUID, Length } from 'class-validator';

export class CreateCourseDto {
  @IsString()
  @IsNotEmpty({ message: 'Хичээлийн нэр хоосон байж болохгүй' })
  title!: string;

  @IsString()
  @IsNotEmpty({ message: 'Хичээлийн код хоосон байж болохгүй' })
  @Length(2, 20, { message: 'Хичээлийн код 2-оос 20 тэмдэгт байх ёстой' })
  code!: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  coverImage?: string;

  @IsBoolean({ message: 'isCBT нь boolean байх ёстой' })
  @IsNotEmpty()
  isCBT!: boolean;

  @IsString()
  @IsNotEmpty({ message: 'Тэнхимийн ID хоосон байж болохгүй' })
  @IsUUID('4', { message: 'Тэнхимийн ID UUID форматтай байх ёстой' })
  departmentId!: string;

  @IsString()
  @IsNotEmpty({ message: 'Багшийн ID хоосон байж болохгүй' })
  @IsUUID('4', { message: 'Багшийн ID UUID форматтай байх ёстой' })
  teacherId!: string;
}
