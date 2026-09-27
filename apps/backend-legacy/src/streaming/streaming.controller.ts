import { Controller, Get, Post, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { StreamingService } from './streaming.service';
import { UpsertHistoryDto } from './dto/upsert-history.dto';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';

@Controller('streaming')
@UseGuards(AuthGuard)
export class StreamingController {
  constructor(private readonly streamingService: StreamingService) {}

  @Get('history')
  async getHistory(@CurrentUser('userId') userId: string) {
    return this.streamingService.getHistory(userId);
  }

  @Get('progress/:contentId')
  async getProgress(
    @CurrentUser('userId') userId: string,
    @Param('contentId') contentId: string,
    @Query('episodeId') episodeId?: string,
  ) {
    return this.streamingService.getProgress(userId, contentId, episodeId);
  }

  @Post('history')
  async upsert(
    @CurrentUser('userId') userId: string,
    @Body() dto: UpsertHistoryDto,
  ) {
    return this.streamingService.upsert(userId, dto);
  }

  @Delete('history/:contentId')
  async removeFromHistory(
    @CurrentUser('userId') userId: string,
    @Param('contentId') contentId: string,
  ) {
    return this.streamingService.removeFromHistory(userId, contentId);
  }
}
