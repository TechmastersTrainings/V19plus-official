import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Middleware: Allow requests through to the Next.js client application
 * where Firebase client-side authentication observer (browserLocalPersistence)
 * manages session restoration and client route protection.
 */
export function middleware(request: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|logo.png|api).*)'],
};

