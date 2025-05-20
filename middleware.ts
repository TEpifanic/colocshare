import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import { verifyJwtToken } from './lib/jwt';

// Cache pour les vérifications de jetons
const tokenVerificationCache = new Map<string, { isValid: boolean; isExpiredByInactivity: boolean; timestamp: number; userId?: string | null }>();
const CACHE_DURATION = 60 * 1000; // 1 minute

// Fonction optimisée pour vérifier le jeton avec mise en cache
async function verifyTokenWithCache(token: string) {
  if (!token) return { isValid: false, isExpiredByInactivity: false };
  
  // Vérifier le cache
  const cachedVerification = tokenVerificationCache.get(token);
  const now = Date.now();
  
  if (cachedVerification && (now - cachedVerification.timestamp < CACHE_DURATION)) {
    return {
      isValid: cachedVerification.isValid,
      isExpiredByInactivity: cachedVerification.isExpiredByInactivity,
      userId: cachedVerification.userId
    };
  }
  
  // Vérifier le jeton
  const verificationResult = await verifyJwtToken(token);
  
  // Mettre en cache le résultat
  tokenVerificationCache.set(token, {
    isValid: verificationResult.isValid,
    isExpiredByInactivity: verificationResult.isExpiredByInactivity || false,
    userId: verificationResult.userId,
    timestamp: now
  });
  
  // Nettoyer le cache (supprimer les entrées obsolètes)
  for (const [cachedToken, cachedValue] of tokenVerificationCache.entries()) {
    if (now - cachedValue.timestamp > CACHE_DURATION) {
      tokenVerificationCache.delete(cachedToken);
    }
  }
  
  return verificationResult;
}

export async function middleware(req: NextRequest) {
  // Routes publiques qui ne nécessitent pas de vérification
  const publicRoutes = ['/api/auth/refresh-token', '/api/auth/session'];
  const currentPath = req.nextUrl.pathname;
  
  if (publicRoutes.includes(currentPath)) {
    return NextResponse.next();
  }
  
  // Récupérer le token depuis les cookies
  const token = req.cookies.get('auth_token')?.value || '';
  const authHeader = req.headers.get('Authorization')?.split(' ')[1] || '';
  
  // Vérifier le token (soit du cookie, soit du header)
  const verificationResult = token 
    ? await verifyTokenWithCache(token)
    : authHeader 
      ? await verifyTokenWithCache(authHeader)
      : { isValid: false, isExpiredByInactivity: false };

  const { isValid, isExpiredByInactivity } = verificationResult;

  const isAuthenticated = isValid;

  const isAuthPage = req.nextUrl.pathname.startsWith('/auth');
  const isDashboardPage = req.nextUrl.pathname.startsWith('/dashboard');
  const isApiAuthRoute = req.nextUrl.pathname.startsWith('/api/auth');
  const isRootPage = req.nextUrl.pathname === '/';

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
  
  // Rediriger les utilisateurs non authentifiés depuis la page d'accueil vers la page de connexion
  if (!isAuthenticated && isRootPage) {
    return NextResponse.redirect(new URL('/auth/signin', req.url));
  }
  
  // Rediriger les utilisateurs authentifiés depuis la page d'accueil vers le dashboard
  if (isAuthenticated && isRootPage) {
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/',
    '/auth/:path*', 
    '/dashboard/:path*',
    '/api/auth/:path*'
  ],
}; 