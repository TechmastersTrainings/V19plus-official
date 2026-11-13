import { NextRequest, NextResponse } from 'next/server';
import { FALLBACK_CATALOG } from '../../../../data/fallbackCatalog';

export const dynamic = 'force-dynamic';

const BACKEND_URL =
  process.env.BACKEND_URL ||
  (process.env.NODE_ENV === 'production'
    ? 'https://v19plus-official.onrender.com'
    : 'http://localhost:8000');

export async function GET(
  _request: NextRequest,
  { params }: { params: { slug: string } }
) {
  const slug = params?.slug?.toLowerCase().trim();

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4500);
    const backendRes = await fetch(`${BACKEND_URL}/api/content/${slug}`, {
      headers: { Accept: 'application/json' },
      signal: controller.signal,
      cache: 'no-store',
    });
    clearTimeout(timeoutId);

    if (backendRes.ok) {
      const data = await backendRes.json();
      if (data && (data.id || data.title)) {
        return NextResponse.json(data);
      }
    }
  } catch {
    // Fallback
  }

  const found =
    FALLBACK_CATALOG.find((c) => c.slug.toLowerCase() === slug) ||
    FALLBACK_CATALOG.find(
      (c) =>
        c.slug.toLowerCase().includes(slug) ||
        slug.includes(c.slug.toLowerCase()) ||
        (c.master_storage_key || '').toLowerCase().includes(slug)
    ) ||
    FALLBACK_CATALOG[0];

  return NextResponse.json(found);
}

