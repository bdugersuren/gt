import { IsInt, IsNotEmpty, IsOptional, IsString, Length, Min } from 'class-validator';

export class UpdateClassGroupDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @IsOptional()
  @IsString()
  @Length(2, 20)
  code?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  academicYearId?: string;

  /** @deprecated Use academicYearId. */
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  academicYear?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  departmentId?: string;

  @IsOptional()
  @IsString()
  programId?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  gradeLevel?: number;

  @IsOptional()
  @IsInt()
  @Min(1900)
  cohortYear?: number;

  @IsOptional()
  @IsInt()
  @Min(1900)
  graduationYear?: number;
}
