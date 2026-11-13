import { NextResponse } from 'next/server';
import { FALLBACK_CATALOG } from '../../../../data/fallbackCatalog';

export const dynamic = 'force-dynamic';

const BACKEND_URL =
  process.env.BACKEND_URL ||
  (process.env.NODE_ENV === 'production'
    ? 'https://v19plus-official.onrender.com'
    : 'http://localhost:8000');

export async function GET() {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);
    const backendRes = await fetch(`${BACKEND_URL}/api/content/trending`, {
      headers: { Accept: 'application/json' },
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
    // Fallback
  }

  return NextResponse.json(FALLBACK_CATALOG);
}

