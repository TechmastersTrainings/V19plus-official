import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AuthGuard } from './auth.guard';
import { RolesGuard } from './roles.guard';
import { GoogleStrategy } from './strategies/google.strategy';

import { RedisModule } from '../redis/redis.module';

@Module({
  imports: [
    RedisModule,
    JwtModule.register({}),
  ],
  controllers: [AuthController],
  providers: [AuthService, AuthGuard, RolesGuard, GoogleStrategy],
  exports: [AuthGuard, RolesGuard, JwtModule],
})
export class AuthModule {}
