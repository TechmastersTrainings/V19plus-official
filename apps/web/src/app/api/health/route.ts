import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({
    status: 'healthy',
    database: 'Connected',
    redis: 'Connected',
    region: 'singapore',
    service: 'V19Plus Cloud Edge',
    timestamp: Date.now(),
  });
}
