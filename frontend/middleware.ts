import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const accessToken = request.cookies.get('books4all_access_token')?.value;
  const isLoggedIn = !!accessToken;

  // Redirect logged-in users away from auth pages
  if (isLoggedIn && pathname.startsWith('/auth')) {
    return NextResponse.redirect(new URL('/browse', request.url));
  }

  // Redirect non-logged-in users away from protected pages
  const protectedPaths = ['/seller', '/orders', '/cart', '/checkout'];
  const isProtectedPath = protectedPaths.some((path) => pathname.startsWith(path));

  if (!isLoggedIn && isProtectedPath) {
    const loginUrl = new URL('/auth/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Match auth pages
    '/auth/:path*',
    // Match protected pages
    '/seller/:path*',
    '/orders/:path*',
    '/cart/:path*',
    '/checkout/:path*',
  ],
};
