import { IsInt, IsOptional, IsString, Length, Min } from 'class-validator';

export class CreateVideoDto {
  @IsString()
  @Length(1, 200)
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsString()
  videoKey: string;

  @IsOptional()
  @IsString()
  thumbnailKey?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  duration?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  fileSize?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  categoryId?: number;
}
