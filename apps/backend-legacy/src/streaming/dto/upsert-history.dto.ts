import { IsBoolean, IsNotEmpty, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

export class UpsertHistoryDto {
  @IsString({ message: 'Content ID must be a string' })
  @IsNotEmpty({ message: 'Content ID is required' })
  contentId!: string;

  @IsOptional()
  @IsString({ message: 'Episode ID must be a string' })
  @IsNotEmpty({ message: 'Episode ID cannot be empty' })
  episodeId?: string;

  @IsNumber({}, { message: 'Progress must be a number' })
  @Min(0, { message: 'Progress cannot be less than 0' })
  @Max(100, { message: 'Progress cannot exceed 100' })
  progress!: number;

  @IsOptional()
  @IsBoolean({ message: 'Completed must be a boolean' })
  completed?: boolean;
}
