import { IsString, Matches } from 'class-validator';

export class CreateUploadUrlDto {
  @IsString()
  fileName: string;

  @IsString()
  @Matches(/^(video|image)\//, {
    message: 'contentType must be a video or image MIME type',
  })
  contentType: string;
}
