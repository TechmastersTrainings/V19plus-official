import { IsOptional, IsString, MinLength } from 'class-validator';
import { Transform } from 'class-transformer';

export class UpdateProfileDto {
  @IsOptional()
  @IsString({ message: 'Name must be a string' })
  @MinLength(1, { message: 'Name cannot be empty' })
  @Transform(({ value }) => value?.trim())
  name?: string;

  @IsOptional()
  @IsString({ message: 'Avatar URL must be a string' })
  avatarUrl?: string;
}
