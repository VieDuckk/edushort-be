import { IsArray, IsInt, IsNotEmpty } from 'class-validator';

export class SubmitAnswerDto {
  @IsInt()
  @IsNotEmpty()
  questionId: number;

  @IsInt()
  @IsNotEmpty()
  selectedOptionId: number;

  @IsArray()
  @IsInt({ each: true })
  videoIds: number[];
}
