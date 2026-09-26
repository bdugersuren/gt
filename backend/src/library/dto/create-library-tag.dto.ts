import { IsString } from 'class-validator';

export class CreateLibraryTagDto {
  @IsString() name!: string;
}
