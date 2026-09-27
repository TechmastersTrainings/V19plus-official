import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { RedisModule } from './redis/redis.module';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { ContentModule } from './content/content.module';
import { StreamingModule } from './streaming/streaming.module';
import { SubscriptionModule } from './subscription/subscription.module';
import { PaymentModule } from './payment/payment.module';
import { VideoProcessModule } from './video-process/video-process.module';
import { NotificationModule } from './notification/notification.module';
import { SearchModule } from './search/search.module';
import { SettingsModule } from './settings/settings.module';
import { AdminModule } from './admin/admin.module';
import { FirebaseModule } from './firebase/firebase.module';
import { HealthController } from './health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [
        '.env',
        '../../.env',
      ],
    }),
    ThrottlerModule.forRoot([{
      ttl: 60 * 1000,
      limit: 100,
    }]),
    RedisModule,
    AuthModule,
    UserModule,
    ContentModule,
    StreamingModule,
    SubscriptionModule,
    PaymentModule,
    VideoProcessModule,
    NotificationModule,
    SearchModule,
    SettingsModule,
    AdminModule,
    FirebaseModule,
  ],
  controllers: [HealthController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
