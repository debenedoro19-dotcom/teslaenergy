import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

// ─── In-memory rate limiter (per IP, resets on cold start) ───────────────────
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

const RATE_LIMIT_RULES: Record<string, { max: number; windowMs: number }> = {
  '/login':           { max: 10,  windowMs: 60_000 },   // 10 attempts / min
  '/register':        { max: 5,   windowMs: 60_000 },   // 5 attempts / min
  '/forgot-password': { max: 5,   windowMs: 60_000 },   // 5 attempts / min
  '/reset-password':  { max: 5,   windowMs: 60_000 },   // 5 attempts / min
  '/api/':            { max: 60,  windowMs: 60_000 },   // 60 req / min for API
};

function getRateLimitRule(pathname: string) {
  for (const [prefix, rule] of Object.entries(RATE_LIMIT_RULES)) {
    if (pathname.startsWith(prefix)) return rule;
  }
  return null;
}

function getClientIp(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  );
}

function checkRateLimit(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(key);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + windowMs });
    return true; // allowed
  }

  if (entry.count >= max) return false; // blocked

  entry.count += 1;
  return true; // allowed
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function getProjectRef(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  return url.match(/https:\/\/([^.]+)\./)?.[1] ?? '';
}

function injectTokenFromHeader(request: NextRequest): void {
  const token = request.headers.get('x-sb-token');
  if (!token) return;
  const hasCookie = request.cookies.getAll().some((c) => c.name.includes('auth-token'));
  if (hasCookie) return;
  request.cookies.set(`sb-${getProjectRef()}-auth-token`, token);
}

// ─── Middleware ───────────────────────────────────────────────────────────────
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ── Rate limiting (POST requests only for auth routes) ──────────────────
  const rule = getRateLimitRule(pathname);
  if (rule && request.method === 'POST') {
    const ip = getClientIp(request);
    const key = `${ip}:${pathname}`;
    const allowed = checkRateLimit(key, rule.max, rule.windowMs);

    if (!allowed) {
      return new NextResponse(
        JSON.stringify({ error: 'Too many requests. Please try again later.' }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': String(Math.ceil(rule.windowMs / 1000)),
          },
        }
      );
    }
  }

  injectTokenFromHeader(request);
  const supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value);
            supabaseResponse.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  await supabase.auth.getUser();

  // ── Safe security headers (won't break iframe preview) ──────────────────
  supabaseResponse.headers.set('X-Content-Type-Options', 'nosniff');
  supabaseResponse.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  supabaseResponse.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

  return supabaseResponse;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
