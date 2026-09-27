import { Controller, Get, Put, Param, UseGuards } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';

@Controller('notification')
@UseGuards(AuthGuard)
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get()
  list(@CurrentUser('userId') userId: string) {
    return this.notificationService.listNotifications(userId);
  }

  @Put(':id/read')
  markRead(
    @CurrentUser('userId') userId: string,
    @Param('id') id: string
  ) {
    return this.notificationService.markAsRead(userId, id);
  }
}
