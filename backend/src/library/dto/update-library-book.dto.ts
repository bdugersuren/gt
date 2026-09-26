import { IsArray, IsBoolean, IsInt, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';

export class UpdateLibraryBookDto {
  @IsOptional() @IsString() title?: string;
  @IsOptional() @IsString() subtitle?: string;
  @IsOptional() @IsString() author?: string;
  @IsOptional() @IsString() isbn?: string;
  @IsOptional() @IsString() publisher?: string;
  @IsOptional() @IsInt() @Min(1000) @Max(3000) publishedYear?: number;
  @IsOptional() @IsString() language?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsUUID() pdfAssetId?: string;
  @IsOptional() @IsUUID() coverAssetId?: string;
  @IsOptional() @IsBoolean() downloadAllowed?: boolean;
  @IsOptional() @IsArray() @IsUUID('4', { each: true }) categoryIds?: string[];
  @IsOptional() @IsArray() @IsString({ each: true }) tagNames?: string[];
  @IsOptional() @IsArray() @IsUUID('4', { each: true }) courseIds?: string[];
  @IsOptional() @IsArray() @IsUUID('4', { each: true }) programIds?: string[];
}
