import { IsString, Length } from 'class-validator';

export class LoginDto {
  @IsString()
  @Length(3, 100)
  identifier: string;

  @IsString()
  @Length(6, 100)
  password: string;
}
