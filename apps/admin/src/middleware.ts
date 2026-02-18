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

// ─────────────────────────────────────────
// Route Permission Map
// ─────────────────────────────────────────

const ROUTE_PERMISSIONS: Record<string, UserRole[]> = {
  '/dashboard': [UserRole.SUPER_ADMIN, UserRole.COMPANY_ADMIN, UserRole.BRANCH_MANAGER],
  '/shipments': [UserRole.SUPER_ADMIN, UserRole.COMPANY_ADMIN, UserRole.BRANCH_MANAGER],
  '/merchants': [UserRole.SUPER_ADMIN, UserRole.COMPANY_ADMIN],
  '/couriers': [UserRole.SUPER_ADMIN, UserRole.COMPANY_ADMIN, UserRole.BRANCH_MANAGER],
  '/branches': [UserRole.SUPER_ADMIN, UserRole.COMPANY_ADMIN],
  '/pricing': [UserRole.SUPER_ADMIN, UserRole.COMPANY_ADMIN],
  '/cod': [UserRole.SUPER_ADMIN, UserRole.COMPANY_ADMIN],
  '/settings': [UserRole.SUPER_ADMIN, UserRole.COMPANY_ADMIN],
};

const PUBLIC_ROUTES = ['/login', '/tracking'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check if it's a public route
  const isPublicRoute = PUBLIC_ROUTES.some((route) => pathname.startsWith(route));

  if (isPublicRoute) {
    return NextResponse.next();
  }

  // Get token from cookie or authorization header
  const token = request.cookies.get('access_token')?.value ||
    request.headers.get('authorization')?.replace('Bearer ', '');

  // If no token, redirect to login
  if (!token) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Decode token to get user role
  const payload = decodeJwtPayload(token);

  if (!payload) {
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  const userRole = payload.role as UserRole;

  // Check if user is trying to access wrong app
  // Admin app only allows SUPER_ADMIN, COMPANY_ADMIN, BRANCH_MANAGER
  if ([UserRole.MERCHANT, UserRole.COURIER].includes(userRole)) {
    // Redirect to appropriate app
    if (userRole === UserRole.MERCHANT) {
      return NextResponse.redirect(new URL('/merchant/dashboard', request.url));
    }
    if (userRole === UserRole.COURIER) {
      return NextResponse.redirect(new URL('/courier/tasks', request.url));
    }
  }

  // Check route permissions
  const routePattern = Object.keys(ROUTE_PERMISSIONS).find((route) =>
    pathname.startsWith(route)
  );

  if (routePattern) {
    const allowedRoles = ROUTE_PERMISSIONS[routePattern];
    
    if (!allowedRoles.includes(userRole)) {
      const forbiddenUrl = new URL('/403', request.url);
      return NextResponse.redirect(forbiddenUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|public).*)',
  ],
};
