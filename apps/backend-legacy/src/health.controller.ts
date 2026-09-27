import { Controller, Get } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';

@Controller('health')
export class HealthController {
  @Get()
  @SkipThrottle()
  check() {
    return {
      status: 'ok',
      service: 'v19plus-api',
      timestamp: new Date().toISOString(),
    };
  }
}
