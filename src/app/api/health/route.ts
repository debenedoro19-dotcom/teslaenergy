import { NextResponse } from 'next/server';

/**
 * GET /api/health
 * Returns a sanitized status check — confirms required env vars are present
 * without exposing their values.
 */
export async function GET() {
  const required = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'NEXT_PUBLIC_SITE_URL',
  ];

  const missing = required?.filter((key) => !process.env[key]);

  if (missing?.length > 0) {
    return NextResponse?.json(
      { status: 'degraded', missing },
      { status: 503 }
    );
  }

  return NextResponse?.json(
    { status: 'ok', timestamp: new Date()?.toISOString() },
    { status: 200 }
  );
}
