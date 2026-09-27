import { Controller, Get, Post, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { StreamingService } from '../streaming/streaming.service';
import { UpsertHistoryDto } from '../streaming/dto/upsert-history.dto';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';

@Controller('history')
@UseGuards(AuthGuard)
export class HistoryController {
  constructor(private readonly streamingService: StreamingService) {}

  @Get()
  getHistory(@CurrentUser('userId') userId: string) {
    return this.streamingService.getHistory(userId);
  }

  @Get(':contentId')
  getProgress(
    @CurrentUser('userId') userId: string,
    @Param('contentId') contentId: string,
    @Query('episodeId') episodeId?: string
  ) {
    return this.streamingService.getProgress(userId, contentId, episodeId);
  }

  @Post()
  upsert(
    @CurrentUser('userId') userId: string,
    @Body() body: UpsertHistoryDto
  ) {
    return this.streamingService.upsert(userId, body);
  }

  @Delete(':contentId')
  remove(
    @CurrentUser('userId') userId: string,
    @Param('contentId') contentId: string
  ) {
    return this.streamingService.removeFromHistory(userId, contentId);
  }
}
