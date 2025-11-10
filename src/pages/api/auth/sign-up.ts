import type { APIRoute } from 'astro';
import { WorkOS } from '@workos-inc/node';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '../../../../convex/_generated/api';
import { createSessionToken, createSessionCookie } from '../../../lib/auth/session';

const workos = new WorkOS(import.meta.env.WORKOS_API_KEY);
const convex = new ConvexHttpClient(import.meta.env.PUBLIC_CONVEX_URL);

export const POST: APIRoute = async ({ request }) => {
  try {
    const {
      email,
      password,
      name,
      companyName,
      address,
      city,
      state,
      zip,
      latitude,
      longitude,
      phone,
    } = await request.json();

    // Validate required fields
    if (!email || !password || !name || !companyName || !address || !city || !state || !zip) {
      return new Response(
        JSON.stringify({
          error: 'Missing required fields',
          required: ['email', 'password', 'name', 'companyName', 'address', 'city', 'state', 'zip'],
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Split name into first and last
    const nameParts = name.trim().split(' ');
    const firstName = nameParts[0];
    const lastName = nameParts.slice(1).join(' ') || '';

    // 1. Create organization in WorkOS
    const organization = await workos.organizations.createOrganization({
      name: companyName,
    });

    // 2. Create user in WorkOS
    const user = await workos.userManagement.createUser({
      email,
      password,
      firstName,
      lastName,
      emailVerified: false,
    });

    // 3. Create organization membership (link user to org as owner)
    await workos.userManagement.createOrganizationMembership({
      userId: user.id,
      organizationId: organization.id,
      roleSlug: 'owner',
    });

    // 4. Create Organization in Convex
    const convexOrgId = await convex.mutation(api.organizations.create, {
      workosOrgId: organization.id,
      name: companyName,
      address,
      city,
      state,
      zip,
      latitude: latitude || 0,
      longitude: longitude || 0,
      phone,
      email,
    });

    // 5. Create User in Convex
    const convexUserId = await convex.mutation(api.users.create, {
      workosUserId: user.id,
      email,
      name,
      organizationId: convexOrgId,
      role: 'owner',
    });

    // 6. Create session token
    const sessionToken = await createSessionToken({
      userId: convexUserId,
      workosUserId: user.id,
      organizationId: convexOrgId,
      workosOrgId: organization.id,
      email: user.email,
      name,
      role: 'owner',
    });

    // Return success with session cookie
    return new Response(
      JSON.stringify({
        success: true,
        user: {
          id: convexUserId,
          email: user.email,
          name,
          role: 'owner',
        },
        organization: {
          id: convexOrgId,
          name: companyName,
        },
      }),
      {
        status: 201,
        headers: {
          'Content-Type': 'application/json',
          'Set-Cookie': createSessionCookie(sessionToken),
        },
      }
    );
  } catch (error: any) {
    console.error('Sign-up error:', error);

    return new Response(
      JSON.stringify({
        error: error.message || 'Registration failed',
        details: error.toString(),
      }),
      {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
};
