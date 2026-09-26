import { IsNotEmpty, IsOptional, IsString, IsUUID, IsUrl } from 'class-validator';

export class CreateSubmissionDto {
  @IsString()
  @IsNotEmpty()
  assignmentId!: string;

  @IsOptional()
  @IsString()
  linkUrl?: string;

  @IsOptional()
  @IsUUID()
  assetId?: string;
}
