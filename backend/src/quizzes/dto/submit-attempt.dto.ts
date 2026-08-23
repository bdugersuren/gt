import { IsNotEmpty } from 'class-validator';

export class SubmitAttemptDto {
  @IsNotEmpty({ message: 'Хариултууд (answersJson) хоосон байж болохгүй' })
  answersJson!: Record<string, string>; // Maps questionId -> studentAnswer
}
