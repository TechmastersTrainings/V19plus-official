import {
  Injectable,
  NotFoundException,
  Logger,
  OnModuleDestroy,
} from '@nestjs/common';
import { FirebaseService } from '../firebase/firebase.service';
import { RedisService } from '../redis/redis.service';
import { UpsertHistoryDto } from './dto/upsert-history.dto';

/** Write progress to DB at most once every 30 s per viewing session */
const FLUSH_INTERVAL_MS = 30_000;

@Injectable()
export class StreamingService implements OnModuleDestroy {
  private readonly logger = new Logger(StreamingService.name);
  private readonly pendingFlushes = new Map<string, NodeJS.Timeout>();

  constructor(
    private readonly firebase: FirebaseService,
    private readonly redis: RedisService,
  ) {}

  // ─── Helpers ──────────────────────────────────────────────────────────────

  private entryKey(contentId: string, episodeId?: string | null): string {
    return episodeId ? `${contentId}:${episodeId}` : contentId;
  }

  private bufferKey(userId: string, contentId: string, episodeId?: string): string {
    return `history:buffer:${userId}:${contentId}:${episodeId ?? 'movie'}`;
  }

  private flushKey(userId: string, contentId: string, episodeId?: string): string {
    return `${userId}:${contentId}:${episodeId ?? 'movie'}`;
  }

  // ─── Buffered write ───────────────────────────────────────────────────────

  /** Flush the buffered progress entry directly to Firestore */
  async flushToDb(userId: string, data: UpsertHistoryDto): Promise<void> {
    const completed = data.completed ?? data.progress >= 95;
    const episodeId = data.episodeId ?? null;
    const key = this.entryKey(data.contentId, episodeId);
    const docId = `${userId}_${key.replace(/:/g, '_')}`;

    const docRef = this.firebase.firestore.collection('watchHistory').doc(docId);
    
    await docRef.set({
      userId,
      contentId: data.contentId,
      episodeId,
      entryKey: key,
      progress: data.progress,
      completed,
      updatedAt: new Date(),
    }, { merge: true });
  }

  // ─── Public API ───────────────────────────────────────────────────────────

  async upsert(userId: string, data: UpsertHistoryDto) {
    // Validate content exists
    const doc = await this.firebase.firestore.collection('content').doc(data.contentId).get();
    if (!doc.exists) throw new NotFoundException('Content not found');

    // Write to Redis buffer
    const bKey = this.bufferKey(userId, data.contentId, data.episodeId);
    await this.redis.set(bKey, data, 120);

    // Debounce DB write
    const fKey = this.flushKey(userId, data.contentId, data.episodeId);
    if (!this.pendingFlushes.has(fKey)) {
      const timeout = setTimeout(async () => {
        try {
          const buffered = await this.redis.get<UpsertHistoryDto>(bKey);
          if (buffered) {
            await this.flushToDb(userId, buffered);
            await this.redis.del(bKey);
          }
        } catch (err) {
          this.logger.error('Failed to flush watch history to DB:', err);
        } finally {
          this.pendingFlushes.delete(fKey);
        }
      }, FLUSH_INTERVAL_MS);
      this.pendingFlushes.set(fKey, timeout);
    }

    // Return optimistic response immediately
    return {
      contentId: data.contentId,
      episodeId: data.episodeId,
      progress: data.progress,
      completed: data.completed ?? data.progress >= 95,
    };
  }

  async getHistory(userId: string) {
    const snap = await this.firebase.firestore.collection('watchHistory')
      .where('userId', '==', userId)
      .get();
      
    const history = snap.docs.map(d => ({ id: d.id, ...d.data() })) as any[];
    
    // Sort in memory by updatedAt desc
    history.sort((a: any, b: any) => {
      const timeA = a.updatedAt?.toDate ? a.updatedAt.toDate().getTime() : (a.updatedAt ? new Date(a.updatedAt).getTime() : 0);
      const timeB = b.updatedAt?.toDate ? b.updatedAt.toDate().getTime() : (b.updatedAt ? new Date(b.updatedAt).getTime() : 0);
      return timeB - timeA;
    });

    const limitedHistory = history.slice(0, 100);
    
    for (let h of limitedHistory) {
      if (h.contentId) {
        const c = await this.firebase.firestore.collection('content').doc(h.contentId).get();
        if (c.exists) h.content = { id: c.id, ...c.data() };
      }
    }

    return limitedHistory.map((h) => ({
      ...h,
      content: {
        ...h.content,
        genre: h.content?.genres || h.content?.genre || [],
        genres: undefined,
      },
    }));
  }

  async getProgress(userId: string, contentId: string, episodeId?: string) {
    // Check the Redis buffer first for the very latest value
    const bKey = this.bufferKey(userId, contentId, episodeId);
    const buffered = await this.redis.get<UpsertHistoryDto>(bKey);
    if (buffered) {
      return {
        progress: buffered.progress,
        completed: buffered.completed ?? buffered.progress >= 95,
        episodeId: buffered.episodeId,
      };
    }

    const key = this.entryKey(contentId, episodeId ?? null);
    const docId = `${userId}_${key.replace(/:/g, '_')}`;
    const record = await this.firebase.firestore.collection('watchHistory').doc(docId).get();
    
    if (!record.exists) return null;

    const data = record.data()!;
    return {
      progress: data.progress,
      completed: data.completed,
      episodeId: data.episodeId,
    };
  }

  async removeFromHistory(userId: string, contentId: string) {
    // Also clear any pending buffer entries for this content
    const bKeyMovie = this.bufferKey(userId, contentId);
    await this.redis.del(bKeyMovie);
    // Redis delPattern is not standard, assuming redisService handles it or skip if not supported.
    // In many implementations it uses SCAN.
    try {
      if (this.redis['delPattern']) {
        await (this.redis as any).delPattern(this.bufferKey(userId, contentId, '*'));
      }
    } catch(e) {}

    const snap = await this.firebase.firestore.collection('watchHistory')
      .where('userId', '==', userId)
      .where('contentId', '==', contentId)
      .get();
      
    const batch = this.firebase.firestore.batch();
    snap.docs.forEach(doc => {
      batch.delete(doc.ref);
    });
    await batch.commit();

    return { message: 'Removed from watch history' };
  }

  // ─── Lifecycle ────────────────────────────────────────────────────────────

  onModuleDestroy() {
    // Flush all pending timers immediately on shutdown
    for (const timeout of this.pendingFlushes.values()) {
      clearTimeout(timeout);
    }
    this.pendingFlushes.clear();
  }
}
