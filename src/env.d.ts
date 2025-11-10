/// <reference types="astro/client" />

interface ImportMetaEnv {
  readonly WORKOS_API_KEY: string;
  readonly WORKOS_CLIENT_ID: string;
  readonly WORKOS_COOKIE_PASSWORD: string;
  readonly WORKOS_REDIRECT_URI: string;
  readonly PUBLIC_CONVEX_URL: string;
  readonly PUBLIC_GOOGLE_MAPS_API_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare namespace App {
  interface Locals {
    session?: {
      userId: string;
      workosUserId: string;
      organizationId: string;
      workosOrgId: string;
      email: string;
      name: string;
      role: string;
    };
    user?: {
      id: string;
      workosUserId: string;
      email: string;
      name: string;
      role: string;
    };
    organization?: {
      id: string;
      workosOrgId: string;
    };
  }
}
