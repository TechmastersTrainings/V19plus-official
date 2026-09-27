import { Controller, Get, Post, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ContentService } from './content.service';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';

@Controller('watchlist')
@UseGuards(AuthGuard)
export class WatchlistController {
  constructor(private readonly contentService: ContentService) {}

  @Get()
  getWatchlist(@CurrentUser('userId') userId: string) {
    return this.contentService.getWatchlist(userId);
  }

  @Post()
  add(
    @CurrentUser('userId') userId: string,
    @Body('contentId') contentId: string
  ) {
    return this.contentService.addToWatchlist(userId, contentId);
  }

  @Delete(':contentId')
  remove(
    @CurrentUser('userId') userId: string,
    @Param('contentId') contentId: string
  ) {
    return this.contentService.removeFromWatchlist(userId, contentId);
  }
}
