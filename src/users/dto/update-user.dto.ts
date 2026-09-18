import { IsOptional, IsString, IsUrl, Length } from 'class-validator';

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  @Length(1, 100)
  name?: string;

  @IsOptional()
  @IsUrl({
    require_protocol: true,
    protocols: ['http', 'https'],
  }, { message: 'avatarUrl phải là URL hợp lệ (http/https). Vui lòng upload ảnh lên storage trước.' })
  avatarUrl?: string;
}
