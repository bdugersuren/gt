import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, Max, Min, ValidateNested } from 'class-validator';
import { CurriculumVersionStatus, ElectiveSelectionType } from '@prisma/client';

export class CreateCurriculumVersionDto {
  @IsOptional() @IsString() @IsNotEmpty() versionName?: string;
  @IsOptional() @IsString() academicYearId?: string;
  /** @deprecated Use academicYearId. */
  @IsOptional() @IsString() @IsNotEmpty() academicYear?: string;
  @IsInt() @Min(1) @Max(24) semesterCount!: number;
}

export class UpdateCurriculumVersionDto {
  @IsOptional() @IsString() @IsNotEmpty() versionName?: string;
  @IsOptional() @IsString() academicYearId?: string;
  /** @deprecated Use academicYearId. */
  @IsOptional() @IsString() @IsNotEmpty() academicYear?: string;
  @IsOptional() @IsInt() @Min(1) @Max(24) semesterCount?: number;
}

export class CreateCategoryDto {
  @IsString() @IsNotEmpty() name!: string;
  @IsString() @IsNotEmpty() code!: string;
  @IsOptional() @IsInt() sortOrder?: number;
  @IsOptional() @IsBoolean() isRequired?: boolean;
}

export class CreateElectiveGroupDto {
  @IsString() @IsNotEmpty() code!: string;
  @IsString() @IsNotEmpty() name!: string;
  @IsOptional() @IsInt() @Min(0) minimumCredits?: number;
  @IsOptional() @IsInt() @Min(0) minimumCourseCount?: number;
  @IsOptional() @IsEnum(ElectiveSelectionType) selectionType?: ElectiveSelectionType;
}

export class SemesterAllocationDto {
  @IsInt() @Min(1) semesterNumber!: number;
  @IsInt() @Min(0) credits!: number;
  @IsOptional() @IsInt() @Min(0) hours?: number;
}

export class CreateCurriculumItemDto {
  @IsString() @IsNotEmpty() categoryId!: string;
  @IsString() @IsNotEmpty() courseId!: string;
  @IsInt() @Min(1) sequenceNumber!: number;
  @IsOptional() @IsInt() @Min(1) gradeLevel?: number;
  @IsOptional() @IsInt() @Min(0) theoryHours?: number;
  @IsOptional() @IsInt() @Min(0) schoolPracticeHours?: number;
  @IsOptional() @IsInt() @Min(0) workplacePracticeHours?: number;
  @IsOptional() @IsBoolean() isRequired?: boolean;
  @IsOptional() @IsString() electiveGroupId?: string;
  @IsOptional() @IsString() notes?: string;
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => SemesterAllocationDto)
  semesterAllocations?: SemesterAllocationDto[];
}

export class UpdateCurriculumItemDto extends CreateCurriculumItemDto {}

export class CreateSemesterAllocationDto extends SemesterAllocationDto {}
