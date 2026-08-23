import { IsNotEmpty, IsString } from 'class-validator';

export class AddPrerequisiteDto {
  @IsString()
  @IsNotEmpty({ message: 'Урьдчилсан нөхцөл лекцийн ID хоосон байж болохгүй' })
  prerequisiteId!: string;
}
