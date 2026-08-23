import { ArrayMaxSize, ArrayNotEmpty, ArrayUnique, IsArray, IsEnum, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { EnrollmentStatus } from '@prisma/client';

export class UpdateEnrollmentStatusDto {
  @IsArray()
  @ArrayNotEmpty({ message: 'Enrollment сонгоно уу' })
  @ArrayMaxSize(500)
  @ArrayUnique()
  @IsUUID('4', { each: true })
  enrollmentIds!: string[];

  @IsEnum(EnrollmentStatus)
  status!: EnrollmentStatus;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
