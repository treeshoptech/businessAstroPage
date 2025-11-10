import type { APIRoute } from 'astro';
import { WorkOS } from '@workos-inc/node';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '../../../../convex/_generated/api';
import { createSessionToken, createSessionCookie } from '../../../lib/auth/session';

const workos = new WorkOS(import.meta.env.WORKOS_API_KEY);
const convex = new ConvexHttpClient(import.meta.env.PUBLIC_CONVEX_URL);

export const POST: APIRoute = async ({ request }) => {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return new Response(
        JSON.stringify({ error: 'Email and password are required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Authenticate with WorkOS
    const { user } = await workos.userManagement.authenticateWithPassword({
      email,
      password,
      clientId: import.meta.env.WORKOS_CLIENT_ID,
    });

    // Fetch user's organization memberships
    const memberships = await workos.userManagement.listOrganizationMemberships({
      userId: user.id,
    });

    if (!memberships.data || memberships.data.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No organization found for this user' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Get the first organization membership
    const membership = memberships.data[0];
    const workosOrgId = membership.organizationId;

    // Get or create organization in Convex
    let organization = await convex.query(api.organizations.getByWorkosId, {
      workosOrgId,
    });

    if (!organization) {
      // Auto-create organization on first sign-in
      const workosOrg = await workos.organizations.getOrganization(workosOrgId);
      const orgId = await convex.mutation(api.organizations.create, {
        workosOrgId: workosOrgId,
        name: workosOrg.name,
        address: '',
        city: '',
        state: '',
        zip: '',
        phone: '',
        latitude: 0,
        longitude: 0,
      });
      organization = await convex.query(api.organizations.getById, { id: orgId });
    }

    // Get or create user in Convex
    let convexUser = await convex.query(api.users.getByWorkosId, {
      workosUserId: user.id,
    });

    if (!convexUser) {
      // Auto-create user on first sign-in
      const userId = await convex.mutation(api.users.create, {
        workosUserId: user.id,
        email: user.email,
        name: `${user.firstName} ${user.lastName}`.trim(),
        organizationId: organization._id,
        role: 'owner', // Default to owner for first user
      });
      convexUser = await convex.query(api.users.getById, { id: userId });
    }

    // Create session token
    const sessionToken = await createSessionToken({
      userId: convexUser._id,
      workosUserId: user.id,
      organizationId: organization._id,
      workosOrgId: workosOrgId,
      email: user.email,
      name: `${user.firstName} ${user.lastName}`.trim(),
      role: convexUser.role,
    });

    // Return success with session cookie
    return new Response(
      JSON.stringify({
        success: true,
        user: {
          id: convexUser._id,
          email: user.email,
          name: `${user.firstName} ${user.lastName}`.trim(),
          role: convexUser.role,
        },
        organization: {
          id: organization._id,
          name: organization.name,
        },
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Set-Cookie': createSessionCookie(sessionToken),
        },
      }
    );
  } catch (error: any) {
    console.error('Sign-in error:', error);

    return new Response(
      JSON.stringify({
        error: error.message || 'Authentication failed',
        details: error.toString(),
      }),
      {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
};
