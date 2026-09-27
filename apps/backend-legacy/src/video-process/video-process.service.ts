import { Injectable, Logger } from '@nestjs/common';
import * as path from 'path';
import * as fs from 'fs';
import * as crypto from 'crypto';
import * as ffmpeg from 'fluent-ffmpeg';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { FirebaseService } from '../firebase/firebase.service';
import { RedisService } from '../redis/redis.service';

@Injectable()
export class VideoProcessService {
  private readonly logger = new Logger(VideoProcessService.name);
  private s3Client: S3Client | null = null;

  constructor(
    private readonly firebase: FirebaseService,
    private readonly redis: RedisService,
  ) {
    if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
      this.s3Client = new S3Client({
        region: process.env.AWS_REGION || 'us-east-1',
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        },
      });
      this.logger.log('☁️ S3 Client initialized for video uploads');
    } else {
      this.logger.log('☁️ S3 Client disabled (running in Bunny Stream / Firebase Storage mode)');
    }
  }

  async createBunnyVideo(title: string, contentId: string, episodeId?: string) {
    const libraryId = process.env.BUNNY_STREAM_LIBRARY_ID || '762875';
    const apiKey = process.env.BUNNY_STREAM_API_KEY || 'f2fe276f-479e-4998-ba198ffa33b3-85d3-42d7';

    this.logger.log(`Creating Bunny Stream video for ${contentId} (episode: ${episodeId || 'none'})`);

    const response = await fetch(`https://video.bunnycdn.com/library/${libraryId}/videos`, {
      method: 'POST',
      headers: {
        AccessKey: apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ title: title || `Video_${contentId}` }),
    });

    if (!response.ok) {
      const errText = await response.text();
      this.logger.error(`Bunny Stream API Create Error: ${errText}`);
      throw new Error(`Failed to create video entry in Bunny Stream: ${errText}`);
    }

    const bunnyData = (await response.json()) as any;
    const videoGuid = bunnyData.guid;

    // Generate TUS upload authorization signature (24h expiration)
    const expirationTime = Math.floor(Date.now() / 1000) + 86400;
    const signatureString = `${libraryId}${apiKey}${expirationTime}${videoGuid}`;
    const signature = crypto.createHash('sha256').update(signatureString).digest('hex');

    const uniqueId = episodeId || contentId;
    const cdnHost = process.env.BUNNY_STREAM_CDN_HOST || 'vz-5385b21b-c9e.b-cdn.net';
    const initialUrl = `https://${cdnHost}/play/${libraryId}/${videoGuid}`;

    // Record initial status in Firestore
    await this.updateDatabaseStatus(contentId, uniqueId, !!episodeId, initialUrl, 'processing', initialUrl);

    // Save bunnyVideoGuid on the record
    try {
      const docRef = this.firebase.firestore.collection('content').doc(contentId);
      if (episodeId) {
        const doc = await docRef.get();
        if (doc.exists) {
          const seasons = (doc.data() as any).seasons || [];
          for (const s of seasons) {
            for (const ep of s.episodes) {
              if (ep.id === episodeId) {
                ep.bunnyVideoGuid = videoGuid;
                ep.status = 'processing';
                ep.transcodeStatus = 'processing';
              }
            }
          }
          await docRef.update({ seasons });
        }
      } else {
        await docRef.update({ bunnyVideoGuid: videoGuid, status: 'processing', transcodeStatus: 'processing' });
      }
    } catch (e) {
      this.logger.warn(`Failed to save bunnyVideoGuid for ${uniqueId}:`, e);
    }

    return {
      videoGuid,
      libraryId,
      signature,
      expirationTime,
      tusEndpoint: 'https://video.bunnycdn.com/tusupload',
    };
  }

  async migrateExistingVideosToBunny() {
    const libraryId = process.env.BUNNY_STREAM_LIBRARY_ID || '762875';
    const apiKey = process.env.BUNNY_STREAM_API_KEY || 'f2fe276f-479e-4998-ba198ffa33b3-85d3-42d7';

    this.logger.log('🚀 Starting automated server-to-server migration of existing videos to Bunny Stream...');

    const snap = await this.firebase.firestore.collection('content').get();
    let queuedCount = 0;
    const migratedTitles: string[] = [];

    for (const doc of snap.docs) {
      const data = doc.data() as any;
      let updatedSeasons = false;

      // 1. Check main content videoUrl
      if (data.videoUrl && !data.videoUrl.includes('bunny') && !data.videoUrl.includes('b-cdn.net') && !data.videoUrl.includes('mediadelivery.net')) {
        try {
          const fetchRes = await fetch(`https://video.bunnycdn.com/library/${libraryId}/videos/fetch`, {
            method: 'POST',
            headers: {
              AccessKey: apiKey,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              url: data.videoUrl,
              title: data.title || `Movie_${doc.id}`,
            }),
          });

          if (fetchRes.ok) {
            const fetchJson = (await fetchRes.json()) as any;
            const videoGuid = fetchJson.id || fetchJson.guid;
            await doc.ref.update({
              bunnyVideoGuid: videoGuid,
              status: 'processing',
              transcodeStatus: 'processing',
            });
            queuedCount++;
            migratedTitles.push(data.title);
            this.logger.log(`Queued Bunny Stream fetch for content "${data.title}" (GUID: ${videoGuid})`);
          } else {
            const errText = await fetchRes.text();
            this.logger.error(`Failed to fetch content "${data.title}" into Bunny: ${errText}`);
          }
        } catch (e) {
          this.logger.error(`Migration error for content "${data.title}":`, e);
        }
      }

      // 2. Check episodes inside seasons
      if (data.seasons && Array.isArray(data.seasons)) {
        for (const season of data.seasons) {
          for (const ep of season.episodes || []) {
            if (ep.videoUrl && !ep.videoUrl.includes('bunny') && !ep.videoUrl.includes('b-cdn.net') && !ep.videoUrl.includes('mediadelivery.net')) {
              try {
                const fetchRes = await fetch(`https://video.bunnycdn.com/library/${libraryId}/videos/fetch`, {
                  method: 'POST',
                  headers: {
                    AccessKey: apiKey,
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    url: ep.videoUrl,
                    title: `${data.title} - S${season.number}E${ep.number} - ${ep.title}`,
                  }),
                });

                if (fetchRes.ok) {
                  const fetchJson = (await fetchRes.json()) as any;
                  const videoGuid = fetchJson.id || fetchJson.guid;
                  ep.bunnyVideoGuid = videoGuid;
                  ep.status = 'processing';
                  ep.transcodeStatus = 'processing';
                  updatedSeasons = true;
                  queuedCount++;
                  migratedTitles.push(`${data.title} S${season.number}E${ep.number}`);
                  this.logger.log(`Queued Bunny Stream fetch for episode "${ep.title}" (GUID: ${videoGuid})`);
                }
              } catch (e) {
                this.logger.error(`Migration error for episode "${ep.title}":`, e);
              }
            }
          }
        }

        if (updatedSeasons) {
          await doc.ref.update({ seasons: data.seasons });
        }
      }
    }

    await this.redis.del('content:featured');
    await this.redis.del('content:trending');

    return {
      message: `Successfully queued ${queuedCount} videos for automated server-to-server migration to Bunny Stream.`,
      queuedCount,
      migratedTitles,
    };
  }

  async handleBunnyWebhook(body: any) {
    this.logger.log(`Received Bunny Stream Webhook notification:`, body);
    const videoGuid = body.VideoGuid || body.videoGuid || body.guid;
    const libraryId = body.VideoLibraryId || body.videoLibraryId || process.env.BUNNY_STREAM_LIBRARY_ID || '762875';
    const status = body.Status !== undefined ? Number(body.Status) : undefined;

    if (!videoGuid) return { message: 'No VideoGuid in webhook' };

    // Status 3 in Bunny Stream = Transcoding Finished / Ready
    if (status === 3 || status === undefined) {
      const cdnHost = process.env.BUNNY_STREAM_CDN_HOST || 'vz-5385b21b-c9e.b-cdn.net';
      const hlsUrl = `https://${cdnHost}/play/${libraryId}/${videoGuid}`;
      const thumbnailUrl = `https://${cdnHost}/${videoGuid}/thumbnail.jpg`;

      // Find content doc by bunnyVideoGuid or query
      const snap = await this.firebase.firestore.collection('content')
        .where('bunnyVideoGuid', '==', videoGuid)
        .get();

      if (!snap.empty) {
        const docRef = snap.docs[0].ref;
        await docRef.update({
          videoUrl: hlsUrl,
          hlsUrl: hlsUrl,
          thumbnailUrl: thumbnailUrl,
          status: 'ready',
          transcodeStatus: 'ready',
        });
        this.logger.log(`✅ Content ${snap.docs[0].id} updated to 'ready' via Bunny Webhook!`);
      } else {
        // Check inside seasons/episodes
        const allSnap = await this.firebase.firestore.collection('content').get();
        for (const doc of allSnap.docs) {
          const data = doc.data() as any;
          let updated = false;
          if (data.seasons) {
            for (const s of data.seasons) {
              for (const ep of s.episodes || []) {
                if (ep.bunnyVideoGuid === videoGuid) {
                  ep.videoUrl = hlsUrl;
                  ep.hlsUrl = hlsUrl;
                  ep.thumbnailUrl = thumbnailUrl;
                  ep.status = 'ready';
                  ep.transcodeStatus = 'ready';
                  updated = true;
                }
              }
            }
            if (updated) {
              await doc.ref.update({ seasons: data.seasons });
              this.logger.log(`✅ Episode in Content ${doc.id} updated to 'ready' via Bunny Webhook!`);
            }
          }
        }
      }

      await this.redis.del('content:featured');
      await this.redis.del('content:trending');
    }

    return { message: 'Bunny Webhook processed' };
  }

  async uploadFileToFirebase(filePath: string, destPath: string): Promise<string> {
    const bucket = this.firebase.storage.bucket();
    const isM3u8 = destPath.endsWith('.m3u8');
    const isTs = destPath.endsWith('.ts');

    const cacheControl = isM3u8
      ? 'public, max-age=3600'
      : isTs
      ? 'public, max-age=31536000, immutable'
      : 'public, max-age=31536000';

    const contentType = isM3u8
      ? 'application/x-mpegURL'
      : isTs
      ? 'video/mp2t'
      : 'video/mp4';

    const [file] = await bucket.upload(filePath, {
      destination: destPath,
      metadata: {
        contentType,
        cacheControl,
      },
    });

    try {
      await file.makePublic();
    } catch (e) {
      // In case uniform bucket-level access is enabled
    }

    return `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(destPath)}?alt=media`;
  }

  async uploadFileToS3(filePath: string, s3Key: string): Promise<string> {
    const bucket = process.env.AWS_S3_BUCKET || 'v19plus-assets';
    const region = process.env.AWS_REGION || 'us-east-1';

    if (!this.s3Client) {
      throw new Error('S3 client not initialized');
    }

    const fileStream = fs.createReadStream(filePath);
    await this.s3Client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: s3Key,
        Body: fileStream,
        ACL: 'public-read',
        CacheControl: s3Key.endsWith('.m3u8')
          ? 'public, max-age=3600'
          : s3Key.endsWith('.ts')
          ? 'public, max-age=31536000, immutable'
          : 'public, max-age=31536000',
      }),
    );

    return `https://${bucket}.s3.${region}.amazonaws.com/${s3Key}`;
  }

  async transcodeHls(inputFilePath: string, contentId: string, isEpisode = false, episodeId?: string): Promise<string> {
    const uniqueId = episodeId || contentId;
    const outputDir = path.join(process.cwd(), 'uploads', uniqueId);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const masterPlaylistPath = path.join(outputDir, 'master.m3u8');
    const resolutions = [
      { width: 426, height: 240, name: '240p', bitrate: '400k', maxrate: '450k', bufsize: '600k', bw: 400000 },
      { width: 854, height: 480, name: '480p', bitrate: '1200k', maxrate: '1350k', bufsize: '1800k', bw: 1200000 },
      { width: 1280, height: 720, name: '720p', bitrate: '2500k', maxrate: '2750k', bufsize: '3750k', bw: 2500000 },
      { width: 1920, height: 1080, name: '1080p', bitrate: '4500k', maxrate: '4950k', bufsize: '6750k', bw: 4500000 },
    ];

    let initialVideoUrl: string;
    try {
      if (this.s3Client) {
        initialVideoUrl = await this.uploadFileToS3(inputFilePath, `videos/raw/${uniqueId}/source.mp4`);
      } else {
        initialVideoUrl = await this.uploadFileToFirebase(inputFilePath, `videos/raw/${uniqueId}/source.mp4`);
      }
      this.logger.log(`✅ Source video uploaded & accessible at ${initialVideoUrl}`);
    } catch (e) {
      this.logger.warn(`Source video pre-upload warning for ${uniqueId}:`, e);
      initialVideoUrl = `https://storage.googleapis.com/${this.firebase.storage.bucket().name}/videos/raw/${uniqueId}/source.mp4`;
    }

    await this.updateDatabaseStatus(contentId, uniqueId, isEpisode, initialVideoUrl, 'processing');

    this.runTranscode(inputFilePath, outputDir, masterPlaylistPath, resolutions, uniqueId, isEpisode, contentId)
      .catch((err) => this.logger.error(`Failed to transcode HLS video for ${uniqueId}:`, err));

    return initialVideoUrl;
  }

  async transcodeHlsFromUrl(videoUrl: string, contentId: string, isEpisode = false, episodeId?: string): Promise<string> {
    const uniqueId = episodeId || contentId;
    const outputDir = path.join(process.cwd(), 'uploads', uniqueId);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const masterPlaylistPath = path.join(outputDir, 'master.m3u8');
    const resolutions = [
      { width: 426, height: 240, name: '240p', bitrate: '400k', maxrate: '450k', bufsize: '600k', bw: 400000 },
      { width: 854, height: 480, name: '480p', bitrate: '1200k', maxrate: '1350k', bufsize: '1800k', bw: 1200000 },
      { width: 1280, height: 720, name: '720p', bitrate: '2500k', maxrate: '2750k', bufsize: '3750k', bw: 2500000 },
      { width: 1920, height: 1080, name: '1080p', bitrate: '4500k', maxrate: '4950k', bw: 4500000 },
    ];

    await this.updateDatabaseStatus(contentId, uniqueId, isEpisode, videoUrl, 'processing');

    this.runTranscode(videoUrl, outputDir, masterPlaylistPath, resolutions, uniqueId, isEpisode, contentId)
      .catch((err) => this.logger.error(`Failed to transcode HLS video from URL for ${uniqueId}:`, err));

    return 'Transcoding started in background';
  }

  private async updateDatabaseStatus(
    contentId: string,
    uniqueId: string,
    isEpisode: boolean,
    videoUrl: string,
    status: 'processing' | 'ready' | 'failed',
    hlsUrl?: string
  ) {
    try {
      const docRef = this.firebase.firestore.collection('content').doc(contentId);
      if (isEpisode) {
        const doc = await docRef.get();
        if (doc.exists) {
          const data = doc.data() as any;
          const seasons = data.seasons || [];
          for (const season of seasons) {
            for (const ep of season.episodes) {
              if (ep.id === uniqueId) {
                ep.videoUrl = hlsUrl || videoUrl;
                ep.rawVideoUrl = ep.rawVideoUrl || videoUrl;
                ep.hlsUrl = hlsUrl || ep.hlsUrl;
                ep.transcodeStatus = status;
                ep.status = status;
              }
            }
          }
          await docRef.update({ seasons });
        }
      } else {
        const updates: any = {
          videoUrl: hlsUrl || videoUrl,
          rawVideoUrl: videoUrl,
          transcodeStatus: status,
          status: status,
        };
        if (hlsUrl) updates.hlsUrl = hlsUrl;
        await docRef.update(updates);
      }

      await this.redis.del('content:featured');
      await this.redis.del('content:trending');
      this.logger.log(`✅ Database status updated to '${status}' for ${uniqueId}`);
    } catch (e) {
      this.logger.error(`Failed to update database status for ${uniqueId}:`, e);
    }
  }

  private runTranscode(
    inputPath: string,
    outputDir: string,
    masterPath: string,
    resolutions: Array<any>,
    uniqueId: string,
    isEpisode: boolean,
    contentId: string,
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      this.logger.log(`🎬 HLS Adaptive Bitrate Transcoding started for ${uniqueId}`);

      let masterContent = '#EXTM3U\n#EXT-X-VERSION:3\n';
      let completedResolutions = 0;

      resolutions.forEach((res) => {
        const resPath = path.join(outputDir, `${res.name}.m3u8`);

        ffmpeg(inputPath)
          .outputOptions([
            `-vf scale=w='min(${res.width},iw)':h='min(${res.height},ih)':force_original_aspect_ratio=decrease,pad=ceil(ow/2)*2:ceil(oh/2)*2`,
            '-c:v libx264',
            '-preset superfast',
            '-threads 0',
            '-pix_fmt yuv420p',
            '-g 96',
            '-keyint_min 96',
            `-b:v ${res.bitrate}`,
            `-maxrate ${res.maxrate}`,
            `-bufsize ${res.bufsize}`,
            '-c:a aac',
            '-ar 48000',
            '-b:a 128k',
            '-hls_time 8',
            '-hls_playlist_type event',
            `-hls_segment_filename ${path.join(outputDir, `${res.name}_%03d.ts`)}`,
          ])
          .output(resPath)
          .on('end', async () => {
            this.logger.log(`✅ Rendition ${res.name} generated for ${uniqueId}`);
            completedResolutions++;

            masterContent += `#EXT-X-STREAM-INF:BANDWIDTH=${res.bw},RESOLUTION=${res.width}x${res.height}\n${res.name}.m3u8\n`;

            if (completedResolutions === resolutions.length) {
              fs.writeFileSync(masterPath, masterContent);
              this.logger.log(`🎉 Master HLS playlist created for ${uniqueId}`);

              let masterM3u8Url = '';

              if (this.s3Client) {
                try {
                  const files = fs.readdirSync(outputDir);
                  for (const file of files) {
                    const filePath = path.join(outputDir, file);
                    const uploadedUrl = await this.uploadFileToS3(filePath, `hls/${uniqueId}/${file}`);
                    if (file === 'master.m3u8') masterM3u8Url = uploadedUrl;
                  }
                  this.logger.log(`☁️ Uploaded HLS segments to S3 for ${uniqueId}`);
                } catch (s3Err) {
                  this.logger.error(`S3 uploads failed for ${uniqueId}:`, s3Err);
                }
              } else {
                try {
                  const files = fs.readdirSync(outputDir);
                  for (const file of files) {
                    const filePath = path.join(outputDir, file);
                    const uploadedUrl = await this.uploadFileToFirebase(filePath, `hls/${uniqueId}/${file}`);
                    if (file === 'master.m3u8') masterM3u8Url = uploadedUrl;
                  }
                  this.logger.log(`🔥 Uploaded HLS segments to Firebase Storage for ${uniqueId}`);
                } catch (fbErr) {
                  this.logger.error(`Firebase Storage uploads failed for ${uniqueId}:`, fbErr);
                }
              }

              if (!masterM3u8Url) {
                const bucketName = this.firebase.storage.bucket().name;
                masterM3u8Url = `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodeURIComponent(`hls/${uniqueId}/master.m3u8`)}?alt=media`;
              }

              await this.updateDatabaseStatus(contentId, uniqueId, isEpisode, masterM3u8Url, 'ready', masterM3u8Url);

              try {
                fs.rmSync(outputDir, { recursive: true, force: true });
                this.logger.log(`🧹 Temp transcoding directory cleaned for ${uniqueId}`);
              } catch (cleanupErr) {
                this.logger.warn(`Failed to clean temp dir for ${uniqueId}:`, cleanupErr);
              }

              resolve();
            }
          })
          .on('error', async (err) => {
            this.logger.error(`❌ Transcode error on resolution ${res.name}:`, err);
            await this.updateDatabaseStatus(contentId, uniqueId, isEpisode, inputPath, 'failed');
            reject(err);
          })
          .run();
      });
    });
  }
}
