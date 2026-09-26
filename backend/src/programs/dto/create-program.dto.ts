import { IsIn, IsInt, IsNotEmpty, IsOptional, IsString, Max, Min } from 'class-validator';

export class CreateProgramDto {
  @IsString() @IsNotEmpty() name!: string;
  @IsString() @IsNotEmpty() code!: string;
  @IsOptional() @IsString() @IsNotEmpty() shortName?: string;
  @IsInt() @Min(1) @Max(120) durationMonths!: number;
  @IsOptional() @IsIn(['STANDARD', 'SHORT_COURSE']) programType?: 'STANDARD' | 'SHORT_COURSE';
  @IsIn(['PROFESSIONAL_EDUCATION_III_IV', 'TECHNICAL_EDUCATION_V_VI', 'VOCATIONAL_TRAINING_I_V']) qualificationLevel!: 'PROFESSIONAL_EDUCATION_III_IV' | 'TECHNICAL_EDUCATION_V_VI' | 'VOCATIONAL_TRAINING_I_V';
  @IsString() @IsNotEmpty() departmentId!: string;
}

export class CreateProgramGradeCourseDto {
  @IsIn([1, 2, 3]) gradeLevel!: number;
  @IsString() @IsNotEmpty() academicYear!: string;
  @IsString() @IsNotEmpty() courseId!: string;
  @IsIn([true, false]) isRequired!: boolean;
}
