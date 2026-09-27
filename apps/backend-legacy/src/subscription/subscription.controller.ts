import { Controller, Get, Post, Body, Req, Res, UseGuards, RawBodyRequest } from '@nestjs/common';
import { Request, Response } from 'express';
import { SubscriptionService } from './subscription.service';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { CheckoutDto } from './dto/checkout.dto';
import { VerifyRazorpayDto } from './dto/verify-razorpay.dto';

@Controller('subscription')
export class SubscriptionController {
  constructor(private readonly subscriptionService: SubscriptionService) {}

  @Get('plans')
  getPlans() {
    return this.subscriptionService.getPlans();
  }

  @Get('current')
  @UseGuards(AuthGuard)
  getCurrent(@CurrentUser('userId') userId: string) {
    return this.subscriptionService.getCurrentSubscription(userId);
  }

  @Post('checkout')
  @UseGuards(AuthGuard)
  checkout(
    @CurrentUser('userId') userId: string,
    @Body() body: CheckoutDto
  ) {
    return this.subscriptionService.createCheckoutSession(userId, body.plan);
  }

  @Post('cancel')
  @UseGuards(AuthGuard)
  cancel(@CurrentUser('userId') userId: string) {
    return this.subscriptionService.cancelSubscription(userId);
  }

  @Post('webhook')
  async webhook(
    @Req() req: RawBodyRequest<Request>,
    @Res() res: Response
  ) {
    const signature = req.headers['stripe-signature'] as string;
    const rawBody = req.rawBody || Buffer.from((req as any).body);
    const result = await this.subscriptionService.handleWebhook(rawBody, signature);
    return res.json(result);
  }

  @Post('razorpay/order')
  @UseGuards(AuthGuard)
  createRazorpayOrder(
    @CurrentUser('userId') userId: string,
    @Body() body: CheckoutDto
  ) {
    return this.subscriptionService.createRazorpayOrder(userId, body.plan);
  }

  @Post('razorpay/verify')
  @UseGuards(AuthGuard)
  verifyRazorpayPayment(
    @CurrentUser('userId') userId: string,
    @Body() body: VerifyRazorpayDto
  ) {
    return this.subscriptionService.verifyRazorpayPayment(userId, body);
  }
}
