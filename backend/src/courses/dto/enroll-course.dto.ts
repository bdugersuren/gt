import { IsNotEmpty, IsEnum, IsOptional, IsString, IsDateString } from 'class-validator';
import { EnrollmentType } from '@prisma/client';

export class EnrollCourseDto {
  @IsEnum(EnrollmentType, { message: 'Бүртгэлийн төрөл буруу байна (INDIVIDUAL эсвэл CLASS_BATCH)' })
  @IsNotEmpty()
  type!: EnrollmentType;

  @IsString()
  @IsOptional()
  studentId?: string;

  @IsString()
  @IsOptional()
  classGroupId?: string;

  @IsDateString({}, { message: 'Эхлэх огноо зөв DateString байх ёстой' })
  @IsNotEmpty()
  startDate!: string;

  @IsDateString({}, { message: 'Дуусах огноо зөв DateString байх ёстой' })
  @IsNotEmpty()
  endDate!: string;
}
