import { IsString, IsNotEmpty, IsArray, IsOptional } from 'class-validator';

export class CreatePollDto {
  @IsString()
  @IsNotEmpty()
  question!: string;

  @IsArray()
  @IsString({ each: true })
  options!: string[];
}
