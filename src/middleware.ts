import { defineMiddleware } from 'astro:middleware';
import { verifySession } from './lib/auth/session';

export const onRequest = defineMiddleware(async ({ request, cookies, redirect, locals }, next) => {
  const url = new URL(request.url);

  // Public routes that don't require authentication
  const publicPaths = [
    '/sign-in',
    '/sign-up',
    '/api/auth/sign-in',
    '/api/auth/sign-up',
    '/api/auth/sign-out',
  ];

  // Check if current path is public
  const isPublicPath = publicPaths.some(path => url.pathname === path || url.pathname.startsWith('/api/auth/'));

  // If it's a public path, continue without authentication
  if (isPublicPath) {
    return next();
  }

  // Get session cookie
  const sessionToken = cookies.get('session')?.value;

  // If no session, redirect to sign-in
  if (!sessionToken) {
    return redirect('/sign-in');
  }

  // Verify session
  const session = await verifySession(sessionToken);

  // If session is invalid, clear cookie and redirect to sign-in
  if (!session) {
    cookies.delete('session', { path: '/' });
    return redirect('/sign-in');
  }

  // Add session to locals for use in pages/components
  locals.session = session;
  locals.user = {
    id: session.userId,
    workosUserId: session.workosUserId,
    email: session.email,
    name: session.name,
    role: session.role,
  };
  locals.organization = {
    id: session.organizationId,
    workosOrgId: session.workosOrgId,
  };

  return next();
});
