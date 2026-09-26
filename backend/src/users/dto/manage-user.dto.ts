import { IsArray, IsEmail, IsEnum, IsInt, IsOptional, IsString, MinLength } from 'class-validator';
import { Role } from '@prisma/client';

export class ManageUserDto {
  @IsString() @MinLength(3) username!: string;
  @IsEmail() email!: string;
  @IsString() @MinLength(2) fullName!: string;
  @IsString() @MinLength(2) code!: string;
  @IsOptional() @IsString() registerNumber?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() @MinLength(12) password?: string;
  @IsArray() @IsEnum(Role, { each: true }) roles!: Role[];
  @IsOptional() @IsString() departmentId?: string;
  @IsOptional() @IsString() companyId?: string;
  @IsOptional() @IsString() companyName?: string;
  @IsOptional() @IsInt() enrollmentYear?: number;
}

export class UpdateManagedUserDto extends ManageUserDto {}
