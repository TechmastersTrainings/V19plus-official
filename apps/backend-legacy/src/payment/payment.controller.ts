import { Controller, Get, UseGuards } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';

@Controller('payment')
@UseGuards(AuthGuard)
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Get('history')
  getHistory(@CurrentUser('userId') userId: string) {
    return this.paymentService.listPayments(userId);
  }
}
