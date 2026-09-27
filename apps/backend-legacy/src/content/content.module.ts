import { Module } from '@nestjs/common';
import { ContentService } from './content.service';
import { ContentController } from './content.controller';
import { WatchlistController } from './watchlist.controller';
import { HistoryController } from './history.controller';
import { CategoriesController } from './categories.controller';
import { AuthModule } from '../auth/auth.module';
import { StreamingModule } from '../streaming/streaming.module';

@Module({
  imports: [
    AuthModule,
    StreamingModule,
  ],
  controllers: [
    ContentController,
    WatchlistController,
    HistoryController,
    CategoriesController,
  ],
  providers: [ContentService],
  exports: [ContentService],
})
export class ContentModule {}
