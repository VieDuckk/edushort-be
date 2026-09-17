import { IsInt, IsOptional, IsString, Length, Min } from 'class-validator';

export class UpdateVideoDto {
  @IsOptional()
  @IsString()
  @Length(1, 200)
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  categoryId?: number;
}
