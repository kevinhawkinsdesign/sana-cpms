// middleware.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const supportedCountries = ['rw', 'ke']

// Add redirect paths that should be handled by Next.js redirects
const redirectPaths = [
  '/scan',
  '/aftersalesrequest', 
  '/fleet',
  '/pro',
  '/kabisa-sessions',
  '/evp-sessions',
  '/embassy',
  '/vin-form',
  '/export-form',
  '/zipline-dashboard',
  '/feedback',
  '/unsupported',
  '/commercial-vehicle',
  '/commercial-vehicles',
  '/passenger-vehicle',
  '/passenger-vehicles',
  '/charger-brochure',
  '/vehicle-brochure',
  '/support'
]

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const host = request.headers.get('host') || ''

  // Handle country routing FIRST - before any other checks
  // Redirect root to default country (rw)
  if (pathname === '/') {
    // You can change this to any default country code
    const defaultCountry = 'rw'
    return NextResponse.redirect(new URL(`/${defaultCountry}`, request.url))
  }

  // Add SEO headers for test subdomain
  if (host === 'test.gokabisa.com') {
    const response = NextResponse.next()
    response.headers.set('X-Robots-Tag', 'noindex, nofollow, noarchive, nosnippet')
    response.headers.set('X-Frame-Options', 'DENY')
    return response
  }

  // Skip middleware for _next, api, static files, sentry example, and redirect paths
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/sentry-example-page') ||
    pathname.includes('.') || // static files like .ico, .png, etc.
    redirectPaths.includes(pathname) // Skip redirect paths to let Next.js handle them
  ) {
    return NextResponse.next()
  }

  // Check if path starts with a country code
  const segments = pathname.split('/').filter(Boolean)
  const firstSegment = segments[0]?.toLowerCase()

  // If first segment is not a supported country and path is not empty
  if (segments.length > 0 && !supportedCountries.includes(firstSegment)) {
    // Invite deep-links arrive without a country (/invite?token=…) from the
    // email — keep the path + token and just default the country, instead of
    // dropping everything and bouncing to the home page.
    if (firstSegment === 'invite') {
      const url = new URL(`/rw${pathname}`, request.url)
      url.search = request.nextUrl.search
      return NextResponse.redirect(url)
    }
    return NextResponse.redirect(new URL('/rw', request.url))
  }

  // If country code is uppercase, redirect to lowercase
  if (segments[0] !== firstSegment) {
    const newPath = `/${firstSegment}${pathname.substring(segments[0].length + 1)}`
    return NextResponse.redirect(new URL(newPath, request.url))
  }

  // Handle auth routes with country prefix
  const isAuthRoute = pathname.includes('/auth/login') || 
                      pathname.includes('/auth/signup') || 
                      pathname.includes('/auth/forgot-password') || 
                      pathname.includes('/auth/reset-password')

  if (isAuthRoute) {
    // For the new auth system, we'll let the client-side handle redirects
    // since we can't access localStorage in middleware
    return NextResponse.next()
  }

  // Handle dashboard routes with country prefix
  if (pathname.includes('/dashboard')) {
    const isDashboardAuthRoute = pathname.includes('/dashboard/auth/login') || 
                                pathname.includes('/dashboard/auth/signup') || 
                                pathname.includes('/dashboard/auth/forgot-password') || 
                                pathname.includes('/dashboard/auth/reset-password')

    // For the new auth system, we'll let the client-side handle redirects
    // since we can't access localStorage in middleware
    return NextResponse.next()
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}