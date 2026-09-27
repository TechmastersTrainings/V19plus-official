import { Module } from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { AuthModule } from '../auth/auth.module';
import { SettingsModule } from '../settings/settings.module';
import { ContentModule } from '../content/content.module';

@Module({
  imports: [AuthModule, SettingsModule, ContentModule],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
