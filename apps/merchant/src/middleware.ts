import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { UserRole } from '@/types';

// Simple JWT decoder (for middleware only - doesn't validate signature)
function decodeJwtPayload(token: string): any {
  try {
    const base64Payload = token.split('.')[1];
    const payload = Buffer.from(base64Payload, 'base64').toString('utf-8');
    return JSON.parse(payload);
  } catch {
    return null;
  }
}

const PUBLIC_ROUTES = ['/login'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check if it's a public route
  const isPublicRoute = PUBLIC_ROUTES.some((route) => pathname.startsWith(route));

  if (isPublicRoute) {
    return NextResponse.next();
  }

  // Get token from cookie or localStorage (via cookie set by client)
  const token = request.cookies.get('merchant_token')?.value ||
    request.cookies.get('access_token')?.value ||
    request.headers.get('authorization')?.replace('Bearer ', '');

  // If no token, redirect to login
  if (!token) {
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  // Decode token to get user role
  const payload = decodeJwtPayload(token);

  if (!payload) {
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  const userRole = payload.role as UserRole;

  // Merchant app only allows MERCHANT role
  if (userRole !== UserRole.MERCHANT) {
    // Redirect to appropriate app
    if ([UserRole.SUPER_ADMIN, UserRole.COMPANY_ADMIN, UserRole.BRANCH_MANAGER].includes(userRole)) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
    if (userRole === UserRole.COURIER) {
      return NextResponse.redirect(new URL('/courier/tasks', request.url));
    }
    // Unknown role, redirect to login
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|public).*)',
  ],
};
