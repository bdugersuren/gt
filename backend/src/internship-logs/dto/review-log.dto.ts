import { IsNotEmpty, IsBoolean, IsString, IsOptional } from 'class-validator';

export class ReviewLogDto {
  @IsBoolean({ message: 'Баталгаажуулалт нь boolean (true/false) утга байна' })
  @IsNotEmpty()
  isApproved!: boolean;

  @IsString()
  @IsOptional()
  mentorFeedback?: string;
}
