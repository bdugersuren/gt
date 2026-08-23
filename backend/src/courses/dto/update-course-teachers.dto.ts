import { ArrayNotEmpty, ArrayUnique, IsArray, IsUUID } from 'class-validator';

export class UpdateCourseTeachersDto {
  @IsArray({ message: 'teacherIds нь массив байх ёстой' })
  @ArrayNotEmpty({ message: 'Хамгийн багадаа нэг багш сонгоно уу' })
  @ArrayUnique({ message: 'Багшийн ID давхардаж болохгүй' })
  @IsUUID('4', { each: true, message: 'Багшийн ID бүр UUID форматтай байх ёстой' })
  teacherIds!: string[];
}
