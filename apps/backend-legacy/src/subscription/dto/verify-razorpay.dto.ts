import { IsEnum, IsNotEmpty, IsString } from 'class-validator';

export class VerifyRazorpayDto {
  @IsNotEmpty({ message: 'Order ID is required' })
  @IsString({ message: 'Order ID must be a string' })
  orderId!: string;

  @IsNotEmpty({ message: 'Payment ID is required' })
  @IsString({ message: 'Payment ID must be a string' })
  paymentId!: string;

  @IsNotEmpty({ message: 'Signature is required' })
  @IsString({ message: 'Signature must be a string' })
  signature!: string;

  @IsNotEmpty({ message: 'Plan is required' })
  @IsEnum(['BASIC', 'STANDARD', 'PREMIUM'], { message: 'Plan must be BASIC, STANDARD, or PREMIUM' })
  plan!: 'BASIC' | 'STANDARD' | 'PREMIUM';
}
