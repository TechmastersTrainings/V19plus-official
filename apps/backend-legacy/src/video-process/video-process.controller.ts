import { Controller, Post, UseInterceptors, UploadedFile, Body, UseGuards, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { VideoProcessService } from './video-process.service';
import { AuthGuard } from '../auth/auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { diskStorage } from 'multer';
import * as path from 'path';
import * as fs from 'fs';

@Controller('video-process')
export class VideoProcessController {
  constructor(private readonly videoProcessService: VideoProcessService) {}

  @Post('create-bunny-video')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('ADMIN')
  async createBunnyVideo(
    @Body('title') title: string,
    @Body('contentId') contentId: string,
    @Body('episodeId') episodeId?: string,
  ) {
    if (!contentId) throw new BadRequestException('contentId is required');

    return this.videoProcessService.createBunnyVideo(title, contentId, episodeId);
  }

  @Post('bunny-webhook')
  async bunnyWebhook(@Body() body: any) {
    return this.videoProcessService.handleBunnyWebhook(body);
  }

  @Post('migrate-to-bunny')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('ADMIN')
  async migrateToBunny() {
    return this.videoProcessService.migrateExistingVideosToBunny();
  }

  @Post('upload')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('ADMIN')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (req, file, callback) => {
          const tempDir = path.join(process.cwd(), 'uploads', 'temp');
          if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
          }
          callback(null, tempDir);
        },
        filename: (req, file, callback) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          const ext = path.extname(file.originalname);
          callback(null, file.fieldname + '-' + uniqueSuffix + ext);
        },
      }),
      fileFilter: (req, file, callback) => {
        if (!file.originalname.match(/\.(mp4|mkv|avi|mov)$/)) {
          return callback(new BadRequestException('Only video files (mp4, mkv, avi, mov) are allowed!'), false);
        }
        callback(null, true);
      },
    }),
  )
  async uploadVideo(
    @UploadedFile() file: Express.Multer.File,
    @Body('contentId') contentId: string,
    @Body('episodeId') episodeId?: string,
  ) {
    if (!file) {
      throw new BadRequestException('Video file is required');
    }
    if (!contentId) {
      fs.unlinkSync(file.path);
      throw new BadRequestException('Content ID is required');
    }

    const videoUrl = await this.videoProcessService.transcodeHls(
      file.path,
      contentId,
      !!episodeId,
      episodeId,
    );

    return {
      message: 'Transcoding started in background',
      videoUrl,
    };
  }

  @Post('transcode-url')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('ADMIN')
  async transcodeFromUrl(
    @Body('videoUrl') videoUrl: string,
    @Body('contentId') contentId: string,
    @Body('episodeId') episodeId?: string,
  ) {
    if (!videoUrl) throw new BadRequestException('videoUrl is required');
    if (!contentId) throw new BadRequestException('contentId is required');

    await this.videoProcessService.transcodeHlsFromUrl(videoUrl, contentId, !!episodeId, episodeId);
    return {
      message: 'Multi-bitrate transcoding started (180p, 240p, 360p, 480p, 720p, 1080p)',
      status: 'PROCESSING',
    };
  }
}
