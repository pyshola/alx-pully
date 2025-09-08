import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { Database } from '@/types/database'
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from 'ioredis'

const redis = new Redis(process.env.UPSTASH_REDIS_URL!)

const ratelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.tokenBucket(10, '10 s', 10),
})

export async function middleware(req: NextRequest) {
  const ip = req.ip ?? 'anonymous'
  const { success, limit, remaining, reset } = await ratelimit.limit(ip)

  if (!success) {
    return new NextResponse('Too many requests.', {
      status: 429,
      headers: {
        'X-RateLimit-Limit': limit.toString(),
        'X-RateLimit-Remaining': remaining.toString(),
        'X-RateLimit-Reset': reset.toString(),
      },
    })
  }
  const res = NextResponse.next()
  const supabase = createMiddlewareClient<Database>({ req, res })

  const {
    data: { session },
  } = await supabase.auth.getSession()

  const { pathname } = req.nextUrl

  // Public routes that don't require authentication
  const publicRoutes = ['/login', '/register', '/']

  // Protected routes that require authentication
  const protectedRoutes = ['/dashboard', '/polls/create']

  // Auth routes that should redirect if user is already logged in
  const authRoutes = ['/login', '/register']

  // Allow access to public assets and API routes
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/favicon.ico') ||
    pathname.startsWith('/images') ||
    pathname.startsWith('/icons')
  ) {
    return res
  }

  // Redirect authenticated users away from auth pages
  if (session && authRoutes.includes(pathname)) {
    return NextResponse.redirect(new URL('/dashboard', req.url))
  }

  // Redirect unauthenticated users to login for protected routes
  if (!session && protectedRoutes.some(route => pathname.startsWith(route))) {
    const redirectUrl = new URL('/login', req.url)
    redirectUrl.searchParams.set('redirectTo', pathname)
    return NextResponse.redirect(redirectUrl)
  }

  // Allow polls page access for both authenticated and unauthenticated users
  if (pathname === '/polls') {
    return res
  }

  // Allow access to individual poll pages
  if (pathname.startsWith('/polls/') && !pathname.startsWith('/polls/create')) {
    return res
  }

  return res
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
