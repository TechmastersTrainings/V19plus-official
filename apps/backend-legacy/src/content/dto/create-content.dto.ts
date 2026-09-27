import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class CreateContentDto {
  @IsString({ message: 'Title must be a string' })
  @IsNotEmpty({ message: 'Title is required' })
  title!: string;

  @IsString({ message: 'Slug must be a string' })
  @IsNotEmpty({ message: 'Slug is required' })
  slug!: string;

  @IsString({ message: 'Description must be a string' })
  @IsNotEmpty({ message: 'Description is required' })
  description!: string;

  @IsEnum(['MOVIE', 'SERIES', 'DOCUMENTARY'], { message: 'Type must be MOVIE, SERIES, or DOCUMENTARY' })
  type!: 'MOVIE' | 'SERIES' | 'DOCUMENTARY';

  @IsInt({ message: 'Release year must be an integer' })
  @Min(1888, { message: 'Release year must be 1888 or later' })
  @Max(new Date().getFullYear() + 5, { message: 'Release year is too far in the future' })
  releaseYear!: number;

  @IsString({ message: 'Rating must be a string' })
  @IsNotEmpty({ message: 'Rating is required' })
  rating!: string;

  @IsOptional()
  @IsNumber({}, { message: 'IMDb score must be a number' })
  @Min(0)
  @Max(10)
  imdbScore?: number;

  @IsOptional()
  @IsInt({ message: 'Duration must be an integer' })
  @Min(1, { message: 'Duration must be at least 1 minute' })
  duration?: number;

  @IsOptional()
  @IsString({ message: 'Thumbnail URL must be a string' })
  thumbnailUrl?: string;

  @IsOptional()
  @IsString({ message: 'Backdrop URL must be a string' })
  backdropUrl?: string;

  @IsOptional()
  @IsString({ message: 'Video URL must be a string' })
  videoUrl?: string;

  @IsOptional()
  @IsString({ message: 'Trailer URL must be a string' })
  trailerUrl?: string;

  @IsOptional()
  @IsBoolean({ message: 'isOriginal must be a boolean' })
  isOriginal?: boolean;

  @IsOptional()
  @IsBoolean({ message: 'isFeatured must be a boolean' })
  isFeatured?: boolean;

  @IsOptional()
  @IsBoolean({ message: 'isPublished must be a boolean' })
  isPublished?: boolean;

  @IsOptional()
  @IsArray({ message: 'Genre must be an array of strings' })
  @IsString({ each: true, message: 'Each genre must be a string' })
  genre?: string[];

  @IsOptional()
  @IsArray({ message: 'Tags must be an array of strings' })
  @IsString({ each: true, message: 'Each tag must be a string' })
  tags?: string[];

  @IsOptional()
  @IsString()
  language?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsArray()
  cast?: any[];

  @IsOptional()
  @IsArray()
  seasons?: any[];
}
