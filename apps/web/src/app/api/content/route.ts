import { NextRequest, NextResponse } from 'next/server';
import { FALLBACK_CATALOG } from '../../../data/fallbackCatalog';

export const dynamic = 'force-dynamic';

const BACKEND_URL =
  process.env.BACKEND_URL ||
  (process.env.NODE_ENV === 'production'
    ? 'https://v19plus-official.onrender.com'
    : 'http://localhost:8000');

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const typeFilter = searchParams.get('type');
  const genreFilter = searchParams.get('genre');
  const limit = parseInt(searchParams.get('limit') || '100', 10);

  // Try fetching from Render backend with a fast 2-second timeout
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);
    const backendRes = await fetch(`${BACKEND_URL}/api/content?${searchParams.toString()}`, {
      headers: {
        Accept: 'application/json',
      },
      signal: controller.signal,
      cache: 'no-store',
    });
    clearTimeout(timeoutId);

    if (backendRes.ok) {
      const data = await backendRes.json();
      const items = Array.isArray(data) ? data : data?.items;
      if (Array.isArray(items) && items.length > 0) {
        return NextResponse.json(data);
      }
    }
  } catch {
    // Backend hibernating, rate-limited (429), or cold start - fall through to resilient fallback
  }

  // Resilient Fallback - 100% online
  let results = [...FALLBACK_CATALOG];
  if (typeFilter && typeFilter !== 'ALL') {
    results = results.filter(
      (item) => (item.contentType || item.content_type || item.type || '').toUpperCase() === typeFilter.toUpperCase()
    );
  }
  if (genreFilter && genreFilter !== 'ALL') {
    results = results.filter((item) =>
      item.genres?.some((g) => g.slug === genreFilter || g.id === genreFilter)
    );
  }

  const items = results.slice(0, limit);
  return NextResponse.json({
    items,
    total: results.length,
    page: 1,
    limit,
    pages: 1,
    fallback: true,
  });
}

