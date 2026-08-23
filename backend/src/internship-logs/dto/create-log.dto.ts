import { IsNotEmpty, IsString, IsNumber, IsBoolean, IsDateString, Min } from 'class-validator';

export class CreateLogDto {
  @IsDateString({}, { message: 'Огноо буруу форматтай байна (YYYY-MM-DD)' })
  @IsNotEmpty({ message: 'Огноо хоосон байж болохгүй' })
  logDate!: string;

  @IsNumber({}, { message: 'Ажилласан цаг нь тоо байх ёстой' })
  @Min(0.5, { message: 'Ажилласан цаг хамгийн багадаа 0.5 цаг байна' })
  @IsNotEmpty()
  hoursWorked!: number;

  @IsString()
  @IsNotEmpty({ message: 'Өдрийн ажлын тайлан хоосон байж болохгүй' })
  workSummary!: string;

  @IsBoolean({ message: 'ХАБЭА мөрдсөн эсэх нь boolean (true/false) утга байна' })
  @IsNotEmpty()
  safetyFollowed!: boolean;
}
