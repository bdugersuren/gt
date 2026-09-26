import { IsNotEmpty, IsOptional, IsString, Length } from 'class-validator';

export class UpdateDepartmentDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @IsOptional()
  @IsString()
  @Length(2, 10)
  code?: string;
}
