import { IsNotEmpty, IsString, Length } from 'class-validator';

export class CreateClassGroupDto {
  @IsString()
  @IsNotEmpty({ message: 'Ангийн нэр хоосон байж болохгүй' })
  name!: string;

  @IsString()
  @IsNotEmpty({ message: 'Ангийн код хоосон байж болохгүй' })
  @Length(2, 20, { message: 'Ангийн код 2-оос 20 тэмдэгт байх ёстой' })
  code!: string;

  @IsString()
  @IsNotEmpty({ message: 'Хичээлийн жил хоосон байж болохгүй' })
  academicYear!: string;

  @IsString()
  @IsNotEmpty({ message: 'Тэнхимийн ID хоосон байж болохгүй' })
  departmentId!: string;
}
