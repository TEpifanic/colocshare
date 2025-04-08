import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import { verifyJwtToken } from './lib/jwt';

export async function middleware(req: NextRequest) {
  // Récupérer le token depuis les cookies
  const token = req.cookies.get('auth_token')?.value || '';
  const authHeader = req.headers.get('Authorization')?.split(' ')[1] || '';
  
  // Vérifier le token (soit du cookie, soit du header)
  const verificationResult = token 
    ? await verifyJwtToken(token)
    : authHeader 
      ? await verifyJwtToken(authHeader)
      : { isValid: false, isExpiredByInactivity: false };

  const { isValid, isExpiredByInactivity } = verificationResult;

  const isAuthenticated = isValid;

  const isAuthPage = req.nextUrl.pathname.startsWith('/auth');
  const isDashboardPage = req.nextUrl.pathname.startsWith('/dashboard');
  const isApiAuthRoute = req.nextUrl.pathname.startsWith('/api/auth');
  const isRefreshTokenRoute = req.nextUrl.pathname === '/api/auth/refresh-token';

  // Ne pas interférer avec la route de rafraîchissement du token
  if (isRefreshTokenRoute) {
    return NextResponse.next();
  }

  // Ne pas interférer avec les routes d'API d'authentification
  if (isApiAuthRoute) {
    return NextResponse.next();
  }

  // Si le token est expiré par inactivité, rediriger vers la page de connexion avec un paramètre
  if (isExpiredByInactivity && !isAuthPage) {
    return NextResponse.redirect(new URL('/auth/signin?session_expired=true', req.url));
  }

  // Rediriger les utilisateurs authentifiés hors des pages d'authentification
  if (isAuthenticated && isAuthPage) {
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }

  // Rediriger les utilisateurs non authentifiés vers la page de connexion
  if (!isAuthenticated && isDashboardPage) {
    return NextResponse.redirect(new URL('/auth/signin', req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/auth/:path*', 
    '/dashboard/:path*',
    '/api/auth/:path*'
  ],
}; 