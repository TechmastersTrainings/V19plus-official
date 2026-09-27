import { Injectable, Logger } from '@nestjs/common';
import { FirebaseService } from '../firebase/firebase.service';
import { RedisService } from '../redis/redis.service';

@Injectable()
export class SearchService {
  private readonly logger = new Logger(SearchService.name);

  constructor(
    private readonly firebase: FirebaseService,
    private readonly redis: RedisService,
  ) {}

  private mapContent(c: any) {
    if (!c) return null;
    return {
      ...c,
      genre: c.genres || c.genre || [],
      genres: undefined,
    };
  }

  async search(rawQuery: string) {
    const q = rawQuery.trim();
    if (!q || q.length < 2) {
      return { results: [], query: q, total: 0 };
    }

    // Cache full search results for 2 minutes
    const cacheKey = `search:results:${q.toLowerCase()}`;
    const cached = await this.redis.get<any>(cacheKey);
    if (cached) return cached;

    // Firestore doesn't support full-text search, so we fetch all published and filter in memory.
    // In a real production app, you would use Algolia or Typesense here.
    const snap = await this.firebase.firestore.collection('content').where('isPublished', '==', true).get();
    let items = snap.docs.map(d => ({ id: d.id, ...d.data() })) as any[];
    
    const lowerQ = q.toLowerCase();
    items = items.filter(item => {
      const matchTitle = item.title?.toLowerCase().includes(lowerQ);
      const matchDesc = item.description?.toLowerCase().includes(lowerQ);
      const matchGenre = (item.genre || []).some((g: string) => g.toLowerCase().includes(lowerQ));
      const matchCast = (item.cast || []).some((c: any) => c.name?.toLowerCase().includes(lowerQ));
      return matchTitle || matchDesc || matchGenre || matchCast;
    });

    items.sort((a, b) => (b.imdbScore || 0) - (a.imdbScore || 0));
    items = items.slice(0, 40);

    const results = items.map((item) => this.mapContent(item));
    const response = { results, query: q, total: results.length };

    await this.redis.set(cacheKey, response, 120);
    return response;
  }

  async suggestions(rawQuery: string) {
    const q = rawQuery.trim().toLowerCase();
    if (!q || q.length < 1) return [];

    const cacheKey = `search:suggestions:${q}`;
    const cached = await this.redis.get<any[]>(cacheKey);
    if (cached) return cached;

    const snap = await this.firebase.firestore.collection('content').where('isPublished', '==', true).get();
    let contents = snap.docs.map(d => ({ id: d.id, ...d.data() })) as any[];

    contents = contents.filter(item => {
      const matchTitle = item.title?.toLowerCase().includes(q);
      const matchGenre = (item.genre || []).some((g: string) => g.toLowerCase().includes(q));
      return matchTitle || matchGenre;
    });

    contents.sort((a, b) => (b.releaseYear || 0) - (a.releaseYear || 0));
    contents = contents.slice(0, 8);

    const suggestions = contents.map((c) => ({
      title: c.title,
      slug: c.slug,
      thumbnailUrl: c.thumbnailUrl,
      type: c.type,
      releaseYear: c.releaseYear,
    }));

    await this.redis.set(cacheKey, suggestions, 300);
    return suggestions;
  }
}
