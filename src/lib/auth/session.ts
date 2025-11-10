import { jwtVerify, SignJWT, type JWTPayload } from 'jose';

// Get JWT secret from environment or use default for development
const getJWTSecret = () => {
  // This will be set at runtime by Astro
  const secret = process.env.WORKOS_COOKIE_PASSWORD || 'treeshop-super-secret-cookie-password-minimum-32-chars-long';
  return new TextEncoder().encode(secret);
};

export interface SessionPayload extends JWTPayload {
  userId: string;
  workosUserId: string;
  organizationId: string;
  workosOrgId: string;
  email: string;
  name: string;
  role: string;
}

export async function createSessionToken(payload: SessionPayload): Promise<string> {
  const JWT_SECRET = getJWTSecret();
  return await new SignJWT(payload as JWTPayload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(JWT_SECRET);
}

export async function verifySession(token: string): Promise<SessionPayload | null> {
  try {
    const JWT_SECRET = getJWTSecret();
    const { payload } = await jwtVerify(token, JWT_SECRET);

    // Validate that payload has required fields
    if (
      typeof payload.userId === 'string' &&
      typeof payload.workosUserId === 'string' &&
      typeof payload.organizationId === 'string' &&
      typeof payload.workosOrgId === 'string' &&
      typeof payload.email === 'string' &&
      typeof payload.name === 'string' &&
      typeof payload.role === 'string'
    ) {
      return payload as SessionPayload;
    }

    return null;
  } catch (error) {
    console.error('Session verification failed:', error);
    return null;
  }
}

export function getSessionFromCookies(cookieHeader: string | null): string | null {
  if (!cookieHeader) return null;

  const cookies = Object.fromEntries(
    cookieHeader.split('; ').map(c => {
      const [key, ...valueParts] = c.split('=');
      return [key, valueParts.join('=')];
    })
  );

  return cookies.session || null;
}

export function createSessionCookie(token: string): string {
  const maxAge = 7 * 24 * 60 * 60; // 7 days in seconds
  return `session=${token}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${maxAge}`;
}

export function clearSessionCookie(): string {
  return 'session=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0';
}
