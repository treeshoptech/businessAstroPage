# TreeShop WorkOS Authentication System

Complete WorkOS authentication system with MUI templates, Convex backend, and JWT session management.

## Architecture Overview

### Components Built

1. **WorkOS Integration** - User management and organization handling
2. **Convex Backend** - Organizations and Users tables with queries/mutations
3. **JWT Session Management** - Secure HTTP-only cookies with 7-day expiration
4. **MUI Auth Forms** - Professional sign-in and two-step sign-up flows
5. **Protected Routes** - Middleware-based authentication
6. **User Profile UI** - Dashboard with user dropdown and sign-out

---

## File Structure

```
businessAstroPage/
├── convex/
│   ├── organizations.ts       # Organization CRUD operations
│   ├── users.ts              # User CRUD operations
│   └── schema.ts             # Database schema (already existed)
│
├── src/
│   ├── components/
│   │   ├── Auth/
│   │   │   ├── SignInForm.tsx        # MUI sign-in form
│   │   │   └── SignUpForm.tsx        # MUI two-step sign-up
│   │   └── SimpleDashboard.tsx       # Updated with user profile
│   │
│   ├── lib/
│   │   └── auth/
│   │       └── session.ts            # JWT creation/verification
│   │
│   ├── pages/
│   │   ├── api/auth/
│   │   │   ├── sign-in.ts           # POST /api/auth/sign-in
│   │   │   ├── sign-up.ts           # POST /api/auth/sign-up
│   │   │   └── sign-out.ts          # POST /api/auth/sign-out
│   │   ├── sign-in.astro            # Sign-in page
│   │   ├── sign-up.astro            # Sign-up page
│   │   └── dashboard-demo.astro     # Protected dashboard
│   │
│   ├── middleware.ts                 # Auth middleware
│   └── env.d.ts                      # TypeScript types
│
└── .env                              # Environment variables
```

---

## How It Works

### 1. Sign Up Flow

**Step 1: Account Creation**
1. User visits `/sign-up`
2. Enters: name, email, password
3. Clicks "Next"

**Step 2: Company Setup**
1. Enters: company name, address, city, state, zip, phone
2. Clicks "Complete Setup"

**Backend Process:**
1. Creates organization in WorkOS
2. Creates user in WorkOS
3. Links user to organization (as owner)
4. Creates organization in Convex
5. Creates user in Convex
6. Generates JWT session token
7. Sets HTTP-only cookie
8. Redirects to `/dashboard-demo`

### 2. Sign In Flow

1. User visits `/sign-in`
2. Enters email and password
3. WorkOS authenticates credentials
4. Fetches organization and user from Convex
5. Generates JWT session token
6. Sets HTTP-only cookie
7. Redirects to `/dashboard-demo`

### 3. Protected Routes

All routes except public paths require authentication:

**Public Routes:**
- `/sign-in`
- `/sign-up`
- `/api/auth/*`
- `/` (homepage)

**Protected Routes:**
- Everything else (e.g., `/dashboard-demo`, `/equipment`, etc.)

**Middleware Process:**
1. Checks for session cookie
2. Verifies JWT token
3. If invalid/missing → redirect to `/sign-in`
4. If valid → adds user/org data to `Astro.locals`

### 4. Session Management

**JWT Payload:**
```typescript
{
  userId: string;           // Convex user ID
  workosUserId: string;     // WorkOS user ID
  organizationId: string;   // Convex org ID
  workosOrgId: string;      // WorkOS org ID
  email: string;
  name: string;
  role: string;             // owner, admin, manager, etc.
}
```

**Cookie Settings:**
- Name: `session`
- HttpOnly: `true` (prevents XSS)
- SameSite: `Lax` (prevents CSRF)
- Max-Age: `604800` (7 days)
- Path: `/`

### 5. User Profile Dropdown

Located in right sidebar of dashboard:

**Displays:**
- User avatar (initials)
- User name
- Organization name
- User role (e.g., "OWNER")

**Menu Items:**
- Profile (placeholder)
- Settings (placeholder)
- Sign out (functional)

---

## API Endpoints

### POST `/api/auth/sign-in`

**Request:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response (Success):**
```json
{
  "success": true,
  "user": {
    "id": "convex_user_id",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "owner"
  },
  "organization": {
    "id": "convex_org_id",
    "name": "TreeShop Services LLC"
  }
}
```

**Sets Cookie:**
```
session=<jwt_token>; HttpOnly; Path=/; SameSite=Lax; Max-Age=604800
```

### POST `/api/auth/sign-up`

**Request:**
```json
{
  "name": "John Doe",
  "email": "user@example.com",
  "password": "password123",
  "companyName": "TreeShop Services LLC",
  "address": "123 Main St",
  "city": "New Smyrna Beach",
  "state": "FL",
  "zip": "32168",
  "phone": "(555) 123-4567",
  "latitude": 29.025,
  "longitude": -80.927
}
```

**Response (Success):**
```json
{
  "success": true,
  "user": {
    "id": "convex_user_id",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "owner"
  },
  "organization": {
    "id": "convex_org_id",
    "name": "TreeShop Services LLC"
  }
}
```

### POST `/api/auth/sign-out`

**Response:**
```json
{
  "success": true
}
```

**Clears Cookie:**
```
session=; HttpOnly; Path=/; Max-Age=0
```

---

## Convex Functions

### Organizations

**`organizations.create`**
```typescript
await convex.mutation(api.organizations.create, {
  workosOrgId: string,
  name: string,
  address: string,
  city: string,
  state: string,
  zip: string,
  latitude: number,
  longitude: number,
  phone?: string,
  email?: string,
});
```

**`organizations.getByWorkosId`**
```typescript
await convex.query(api.organizations.getByWorkosId, {
  workosOrgId: string,
});
```

**`organizations.getById`**
```typescript
await convex.query(api.organizations.getById, {
  id: Id<"organizations">,
});
```

### Users

**`users.create`**
```typescript
await convex.mutation(api.users.create, {
  workosUserId: string,
  email: string,
  name: string,
  organizationId: Id<"organizations">,
  role: "owner" | "admin" | "manager" | "estimator" | "crew_leader" | "crew_member",
  avatarUrl?: string,
});
```

**`users.getByWorkosId`**
```typescript
await convex.query(api.users.getByWorkosId, {
  workosUserId: string,
});
```

**`users.getByEmail`**
```typescript
await convex.query(api.users.getByEmail, {
  email: string,
});
```

**`users.getByOrganization`**
```typescript
await convex.query(api.users.getByOrganization, {
  organizationId: Id<"organizations">,
});
```

---

## Testing the System

### Step 1: Start Development Servers

```bash
# Terminal 1: Start Astro
npm run dev

# Terminal 2: Start Convex (if not running)
npm run convex
```

### Step 2: Create a Test Account

1. Visit `http://localhost:4321/sign-up`
2. **Step 1 - Account:**
   - Name: `John Doe`
   - Email: `test@treeshop.app`
   - Password: `password123`
   - Click "Next"
3. **Step 2 - Company:**
   - Company Name: `TreeShop Test Company`
   - Address: `123 Test Street`
   - City: `New Smyrna Beach`
   - State: `FL`
   - ZIP: `32168`
   - Phone: `(555) 123-4567`
   - Click "Complete Setup"
4. Should redirect to `/dashboard-demo` with user profile visible

### Step 3: Test Sign In

1. Visit `http://localhost:4321/sign-in`
2. Enter email: `test@treeshop.app`
3. Enter password: `password123`
4. Click "Sign in"
5. Should redirect to `/dashboard-demo`

### Step 4: Test Protected Routes

1. Clear cookies or sign out
2. Try to visit `/dashboard-demo`
3. Should redirect to `/sign-in`

### Step 5: Test Sign Out

1. Sign in first
2. Click user avatar in right sidebar
3. Click "Sign out"
4. Should redirect to `/sign-in`
5. Verify you can't access `/dashboard-demo` without signing in

---

## Environment Variables

Required in `.env`:

```bash
# WorkOS Authentication
WORKOS_API_KEY=sk_test_...
WORKOS_CLIENT_ID=client_...
WORKOS_COOKIE_PASSWORD=treeshop-super-secret-cookie-password-minimum-32-chars-long
WORKOS_REDIRECT_URI=http://localhost:4321/auth/callback

# Convex Backend
PUBLIC_CONVEX_URL=https://watchful-jackal-831.convex.cloud

# Google Maps (for dashboard)
PUBLIC_GOOGLE_MAPS_API_KEY=AIza...
```

---

## Security Features

1. **HTTP-only cookies** - JavaScript cannot access session token
2. **JWT verification** - Every request validates token signature
3. **7-day expiration** - Sessions auto-expire after a week
4. **SameSite=Lax** - Prevents CSRF attacks
5. **Password validation** - Minimum 8 characters enforced
6. **Email validation** - Valid email format required
7. **Middleware protection** - All non-public routes require auth

---

## User Roles

Defined in Convex schema:

- `owner` - Full access (first user in organization)
- `admin` - Administrative access
- `manager` - Management functions
- `estimator` - Pricing and proposals
- `crew_leader` - Field operations leader
- `crew_member` - Field crew member

---

## Next Steps

### Immediate Improvements

1. **Email Verification** - Add WorkOS email verification flow
2. **Password Reset** - Implement forgot password functionality
3. **Google OAuth** - Add "Sign in with Google" button
4. **Geocoding** - Auto-fill lat/lng from address in sign-up
5. **Profile Editing** - Make Profile menu item functional
6. **Settings Page** - Build organization settings page

### Future Enhancements

1. **Team Invitations** - Invite additional users to organization
2. **Role Management** - Change user roles
3. **Multi-org Support** - Let users belong to multiple organizations
4. **Session Refresh** - Implement token refresh before expiration
5. **Activity Logging** - Track sign-ins and user actions
6. **2FA** - Add two-factor authentication option

---

## Troubleshooting

### "No organization found for this user"

**Cause:** User exists in WorkOS but not linked to an organization.

**Fix:**
1. Check WorkOS dashboard: https://dashboard.workos.com
2. Verify organization membership exists
3. Or delete user and re-register

### "Organization not found in database"

**Cause:** Organization exists in WorkOS but not in Convex.

**Fix:**
1. Check Convex dashboard: https://dashboard.convex.dev
2. Verify organization was created
3. Run sign-up again to create missing record

### Session keeps expiring

**Cause:** JWT_SECRET changed or cookie deleted.

**Fix:**
1. Verify `WORKOS_COOKIE_PASSWORD` in `.env` is stable
2. Check browser cookie storage
3. Sign in again to create new session

### Middleware redirecting incorrectly

**Cause:** Path not in public routes list.

**Fix:**
1. Edit `/src/middleware.ts`
2. Add path to `publicPaths` array
3. Restart dev server

---

## Production Deployment

### Before Deploying:

1. **Update Environment Variables:**
   - Change `WORKOS_REDIRECT_URI` to production URL
   - Use production WorkOS API key
   - Generate secure `WORKOS_COOKIE_PASSWORD` (32+ chars)

2. **Enable HTTPS:**
   - Session cookies require secure connection
   - Update cookie settings to `Secure: true`

3. **Configure CORS:**
   - Restrict API calls to your domain
   - Update WorkOS allowed redirect URIs

4. **Test Thoroughly:**
   - Sign up new account
   - Sign in/out multiple times
   - Test all protected routes
   - Verify session expiration

---

## Support

Built with:
- **WorkOS** - https://workos.com/docs
- **Convex** - https://docs.convex.dev
- **Astro** - https://docs.astro.build
- **MUI** - https://mui.com/material-ui
- **jose** - https://github.com/panva/jose

For issues, check:
1. WorkOS dashboard logs
2. Convex function logs
3. Browser console errors
4. Network tab for API responses
