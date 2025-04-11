import { NextResponse } from 'next/server'
import { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'

// Configure which paths should be protected
const protectedPaths = [
  '/',
  '/dashboard',
  '/profile',
  '/settings',
  '/admin',
  '/hotel-setup',
  '/hotels/settings'
]

// Paths that should be accessible to logged in users (redirect to dashboard if logged in)
const authRoutes = [
  '/login',
  '/signup',
  '/forgot-password',
]


export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  
  // Get the token with explicit options
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
    secureCookie: process.env.NODE_ENV === "production"
  })
  
  // Log for debugging
  console.log(`Middleware path: ${pathname}, Has token: ${!!token}`)
  
  // For protected paths without a token, redirect to login
  if (protectedPaths.some(p => pathname === p || pathname.startsWith(`${p}/`)) && !token) {
    console.log('Protected path, no token - redirecting to login')
    const url = new URL('/login', request.url)
    url.searchParams.set('callbackUrl', pathname)
    return NextResponse.redirect(url)
  }
  
  // For login/auth paths with a token, redirect to dashboard
  if (authRoutes.some(p => pathname === p || pathname.startsWith(`${p}/`)) && token) {
    console.log('Auth path with token - redirecting to dashboard')
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }
  
  return NextResponse.next()
}

// Configure which paths the middleware should run on
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!api|_next/static|_next/image|favicon.ico|public).*)',
  ],
}