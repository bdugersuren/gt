import { IsNotEmpty, IsString, Length } from 'class-validator';

export class CreateDepartmentDto {
  @IsString()
  @IsNotEmpty({ message: 'Тэнхимийн нэр хоосон байж болохгүй' })
  name!: string;

  @IsString()
  @IsNotEmpty({ message: 'Тэнхимийн код хоосон байж болохгүй' })
  @Length(2, 10, { message: 'Тэнхимийн код 2-оос 10 тэмдэгт байх ёстой' })
  code!: string;
}
