import { type NextRequest } from 'next/server';
import createIntlMiddleware from 'next-intl/middleware';

const locales = ['es', 'en'];
const defaultLocale = 'es';

// Public routes that don't require auth
const publicRoutes = ['/auth', '/'];

const intlMiddleware = createIntlMiddleware({
  locales,
  defaultLocale,
  localePrefix: 'always',
});

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Strip locale prefix to check route
  const localePattern = new RegExp(`^/(${locales.join('|')})`);
  const strippedPath = pathname.replace(localePattern, '') || '/';

  // If it's a public route, just run intl middleware
  const isPublic = publicRoutes.some(
    (r) => strippedPath === r || strippedPath.startsWith(r + '/')
  );

  // Run intl middleware for locale handling
  const response = intlMiddleware(request);

  // Auth guard: redirect to /auth if no token and not public
  if (!isPublic) {
    // We rely on client-side auth guard (AuthProvider) for Firebase
    // Middleware only handles i18n routing here
    return response;
  }

  return response;
}

export const config = {
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
};
