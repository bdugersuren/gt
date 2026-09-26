import { IsInt, IsNotEmpty, IsOptional, IsString, Length, Min } from 'class-validator';

export class CreateClassGroupDto {
  /** Optional legacy override. New clients let the backend generate identity. */
  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: 'Ангийн нэр хоосон байж болохгүй' })
  name?: string;

  /** Optional legacy override. New clients let the backend generate identity. */
  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: 'Ангийн код хоосон байж болохгүй' })
  @Length(2, 20, { message: 'Ангийн код 2-оос 20 тэмдэгт байх ёстой' })
  code?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  academicYearId?: string;

  /** @deprecated Use academicYearId. Kept for one compatibility release. */
  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: 'Хичээлийн жил хоосон байж болохгүй' })
  academicYear?: string;

  @IsString()
  @IsNotEmpty({ message: 'Тэнхимийн ID хоосон байж болохгүй' })
  departmentId!: string;

  @IsString()
  @IsNotEmpty({ message: 'Хөтөлбөрийн ID хоосон байж болохгүй' })
  programId!: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  gradeLevel?: number;

  @IsOptional()
  @IsInt()
  @Min(1900)
  cohortYear?: number;

  @IsOptional()
  @IsInt()
  @Min(1900)
  graduationYear?: number;
}
