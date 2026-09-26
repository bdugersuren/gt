import { IsArray, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class PromotionQueryDto {
  @IsString() @IsNotEmpty() fromClassGroupId!: string;
  @IsString() @IsNotEmpty() academicYear!: string;
  @IsOptional() @IsString() toClassGroupId?: string;
}

export class ApprovePromotionDto extends PromotionQueryDto {
  @IsString() @IsNotEmpty() declare toClassGroupId: string;
  @IsArray() @IsString({ each: true }) studentIds!: string[];
}

export class RejectPromotionDto extends ApprovePromotionDto {
  @IsString() @IsNotEmpty() reason!: string;
}

export class GraduateDto {
  @IsArray() @IsString({ each: true }) studentIds!: string[];
  @IsString() @IsNotEmpty() fromClassGroupId!: string;
  @IsString() @IsNotEmpty() academicYear!: string;
  @IsOptional() @IsString() reason?: string;
}
