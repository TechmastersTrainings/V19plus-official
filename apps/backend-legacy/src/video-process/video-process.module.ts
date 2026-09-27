import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { VideoProcessService } from './video-process.service';
import { VideoProcessController } from './video-process.controller';
import { AuthModule } from '../auth/auth.module';
import { RedisModule } from '../redis/redis.module';
import * as fs from 'fs';

@Module({
  imports: [
    AuthModule,
    RedisModule,
    MulterModule.register({
      dest: './uploads/temp',
    }),
  ],
  controllers: [VideoProcessController],
  providers: [VideoProcessService],
  exports: [VideoProcessService],
})
export class VideoProcessModule {
  constructor() {
    // Ensure temp and upload directories exist
    if (!fs.existsSync('./uploads/temp')) {
      fs.mkdirSync('./uploads/temp', { recursive: true });
    }
  }
}
