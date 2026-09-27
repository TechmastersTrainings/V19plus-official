import { Injectable, OnModuleDestroy, Logger } from '@nestjs/common';
import Redis from 'ioredis';

class MemoryRedis {
  private store = new Map<string, { value: string; expiresAt?: number }>();

  private purgeExpired(key: string) {
    const entry = this.store.get(key);
    if (entry?.expiresAt && entry.expiresAt < Date.now()) {
      this.store.delete(key);
    }
  }

  async get(key: string): Promise<string | null> {
    this.purgeExpired(key);
    return this.store.get(key)?.value ?? null;
  }

  async set(key: string, value: string, mode?: string, ttl?: number): Promise<'OK'> {
    const expiresAt = mode === 'EX' && ttl ? Date.now() + ttl * 1000 : undefined;
    this.store.set(key, { value, expiresAt });
    return 'OK';
  }

  async del(...keys: string[]): Promise<number> {
    let count = 0;
    keys.forEach((k) => { if (this.store.delete(k)) count++; });
    return count;
  }

  async keys(pattern: string): Promise<string[]> {
    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
    return [...this.store.keys()].filter((k) => regex.test(k));
  }
}

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: Redis | MemoryRedis;
  private isMemory = false;

  constructor() {
    const redisUrl = process.env.REDIS_URL || '';
    if (redisUrl.startsWith('memory://') || !redisUrl) {
      this.isMemory = true;
      this.client = new MemoryRedis();
      this.logger.log('📦 Using in-memory Redis mock (local dev)');
    } else {
      const redisClient = new Redis(redisUrl, {
        maxRetriesPerRequest: 3,
        lazyConnect: true,
        retryStrategy(times) {
          if (times > 3) return null;
          return Math.min(times * 50, 2000);
        },
      });

      redisClient.connect().catch(() => this.logger.warn('⚠️ Redis connection failed — caching disabled'));
      redisClient.on('connect', () => this.logger.log('✅ Redis connected successfully'));
      redisClient.on('error', (err) => this.logger.error('❌ Redis error:', err));
      
      this.client = redisClient;
    }
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const val = await this.client.get(key);
      return val ? JSON.parse(val) : null;
    } catch {
      return null;
    }
  }

  async set(key: string, value: unknown, ttlSeconds = 600): Promise<void> {
    try {
      await this.client.set(key, JSON.stringify(value), 'EX', ttlSeconds);
    } catch (err) {
      this.logger.error(`Failed to write cache for key ${key}:`, err);
    }
  }

  async del(key: string): Promise<void> {
    try {
      await this.client.del(key);
    } catch {}
  }

  async delPattern(pattern: string): Promise<void> {
    try {
      const keys = await this.client.keys(pattern);
      if (keys.length > 0) {
        await this.client.del(...keys);
      }
    } catch {}
  }

  onModuleDestroy() {
    if (!this.isMemory && this.client instanceof Redis) {
      this.client.disconnect();
    }
  }
}
