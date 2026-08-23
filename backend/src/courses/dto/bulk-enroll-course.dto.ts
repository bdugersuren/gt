import { ArrayMaxSize, ArrayNotEmpty, ArrayUnique, IsArray, IsDateString, IsUUID } from 'class-validator';

export class BulkEnrollCourseDto {
  @IsArray()
  @ArrayNotEmpty({ message: 'Хамгийн багадаа нэг суралцагч сонгоно уу' })
  @ArrayMaxSize(500, { message: 'Нэг удаад хамгийн ихдээ 500 суралцагч нэмнэ' })
  @ArrayUnique({ message: 'Суралцагчийн ID давхардаж болохгүй' })
  @IsUUID('4', { each: true, message: 'Суралцагчийн ID бүр UUID байх ёстой' })
  studentIds!: string[];

  @IsDateString({}, { message: 'Эхлэх огноо буруу байна' })
  startDate!: string;

  @IsDateString({}, { message: 'Дуусах огноо буруу байна' })
  endDate!: string;
}
