import { IsEmail, IsOptional, IsString, Length, Matches, MaxLength } from 'class-validator';

export class RegisterDto {
  @IsString() @Length(3, 50)
  username!: string;

  @IsEmail() @MaxLength(254)
  email!: string;

  @IsString() @Length(12, 128)
  @Matches(/[A-Z]/, { message: 'Нууц үг дор хаяж нэг том үсэгтэй байна' })
  @Matches(/[a-z]/, { message: 'Нууц үг дор хаяж нэг жижиг үсэгтэй байна' })
  @Matches(/[0-9]/, { message: 'Нууц үг дор хаяж нэг тоотой байна' })
  password!: string;

  @IsString() @Length(2, 120)
  fullName!: string;

  @IsOptional() @IsString() @MaxLength(20)
  registerNumber?: string;

  @IsString() @Length(2, 40)
  code!: string;
}

export class ForgotPasswordDto {
  @IsEmail() @MaxLength(254)
  email!: string;
}

