import { IsDateString, IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { EnrollmentSource } from '@prisma/client';

export class EnrollCourseDto {
  @IsEnum(EnrollmentSource, { message: 'Бүртгэлийн source буруу байна' })
  @IsOptional()
  source?: EnrollmentSource;

  /** @deprecated Use source. */
  @IsOptional()
  @IsString()
  type?: string;

  @IsString()
  @IsOptional()
  studentId?: string;

  @IsString()
  @IsOptional()
  classGroupId?: string;

  @IsString()
  @IsOptional()
  curriculumItemId?: string;

  @IsDateString({}, { message: 'Эхлэх огноо зөв DateString байх ёстой' })
  @IsNotEmpty()
  startDate!: string;

  @IsDateString({}, { message: 'Дуусах огноо зөв DateString байх ёстой' })
  @IsOptional()
  endDate?: string;
}
