import { IsEnum, IsNotEmpty } from 'class-validator';

export class CheckoutDto {
  @IsNotEmpty({ message: 'Plan is required' })
  @IsEnum(['BASIC', 'STANDARD', 'PREMIUM'], { message: 'Plan must be BASIC, STANDARD, or PREMIUM' })
  plan!: 'BASIC' | 'STANDARD' | 'PREMIUM';
}
