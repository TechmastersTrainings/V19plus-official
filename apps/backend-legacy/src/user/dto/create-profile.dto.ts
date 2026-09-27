import { IsBoolean, IsOptional, IsString, Length, MinLength } from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateProfileDto {
  @IsString({ message: 'Name must be a string' })
  @MinLength(1, { message: 'Name cannot be empty' })
  @Transform(({ value }) => value?.trim())
  name!: string;

  @IsOptional()
  @IsString({ message: 'Avatar color must be a string' })
  avatarColor?: string;

  @IsOptional()
  @IsBoolean({ message: 'isKids must be a boolean' })
  isKids?: boolean;

  @IsOptional()
  @IsString({ message: 'PIN must be a string' })
  @Length(4, 4, { message: 'PIN must be exactly 4 digits' })
  pin?: string;
}
