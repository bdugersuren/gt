import { IsOptional, IsString } from 'class-validator';

export class CreateLibraryCategoryDto {
  @IsString() name!: string;
  @IsString() code!: string;
  @IsOptional() @IsString() description?: string;
}
