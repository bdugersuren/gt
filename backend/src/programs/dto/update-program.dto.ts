import { IsIn, IsInt, IsNotEmpty, IsOptional, IsString, Max, Min } from 'class-validator';

export class UpdateProgramDto {
  @IsOptional() @IsString() @IsNotEmpty() name?: string;
  @IsOptional() @IsString() @IsNotEmpty() code?: string;
  @IsOptional() @IsString() @IsNotEmpty() shortName?: string;
  @IsOptional() @IsInt() @Min(1) @Max(120) durationMonths?: number;
  @IsOptional() @IsIn(['STANDARD', 'SHORT_COURSE']) programType?: 'STANDARD' | 'SHORT_COURSE';
  @IsOptional() @IsIn(['PROFESSIONAL_EDUCATION_III_IV', 'TECHNICAL_EDUCATION_V_VI', 'VOCATIONAL_TRAINING_I_V']) qualificationLevel?: 'PROFESSIONAL_EDUCATION_III_IV' | 'TECHNICAL_EDUCATION_V_VI' | 'VOCATIONAL_TRAINING_I_V';
  @IsOptional() @IsString() @IsNotEmpty() departmentId?: string;
}
