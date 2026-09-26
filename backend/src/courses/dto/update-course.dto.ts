import { IsArray, IsBoolean, IsNotEmpty, IsOptional, IsString, IsUUID, Length } from 'class-validator';

export class UpdateCourseDto {
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

  @IsBoolean()
  isCBT!: boolean;

  @IsUUID('4')
  departmentId!: string;

  @IsArray()
  @IsUUID('4', { each: true })
  teacherIds!: string[];
}
