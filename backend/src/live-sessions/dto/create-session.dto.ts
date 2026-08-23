import { IsString, IsNotEmpty, IsOptional, IsDateString, IsArray } from 'class-validator';

export class CreateLiveSessionDto {
  @IsString()
  @IsNotEmpty({ message: 'Live хичээлийн гарчиг хоосон байж болохгүй' })
  title!: string;

  @IsString()
  @IsNotEmpty({ message: 'Курсийн ID хоосон байж болохгүй' })
  courseId!: string;

  @IsDateString()
  @IsOptional()
  scheduledAt?: string;
}
