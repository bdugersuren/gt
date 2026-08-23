import { IsString, IsOptional, IsInt, IsNumber, Min, IsArray } from 'class-validator';

export class UpdateQuizDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsInt()
  @Min(1)
  @IsOptional()
  timeLimitMin?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  passScore?: number;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  questionIds?: string[];
}
