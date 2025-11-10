# TreeShop Environment Variables Setup Guide

Complete guide for setting up all required environment variables for TreeShop web application.

---

## Current Configuration Status

✅ **WorkOS** - Configured for authentication and organization management
✅ **Convex** - Configured for real-time database
✅ **Google Maps API** - Configured for geocoding and mapping
✅ **Google OAuth** - Client ID configured

---

## Environment Variables Breakdown

### 1. WorkOS (Authentication & Multi-Tenancy)

```bash
WORKOS_API_KEY=sk_test_YOUR_WORKOS_API_KEY_HERE
WORKOS_CLIENT_ID=client_YOUR_WORKOS_CLIENT_ID_HERE
WORKOS_REDIRECT_URI=http://localhost:3000/auth/callback
WORKOS_COOKIE_PASSWORD=your-super-secret-cookie-password-minimum-32-characters-long
```

**What it does:**
- User authentication (email/password, SSO)
- Organization management (multi-tenant structure)
- User invitations and role management
- Session management with secure cookies

**Key Points:**
- `WORKOS_API_KEY` - Test environment key (starts with `sk_test_`)
- `WORKOS_CLIENT_ID` - Your TreeShop application ID
- `WORKOS_REDIRECT_URI` - Where users return after auth (update for production)
- `WORKOS_COOKIE_PASSWORD` - Must be 32+ characters for security

**Production Update Needed:**
- Change `WORKOS_REDIRECT_URI` to `https://treeshop.app/auth/callback`
- Generate new cookie password for production environment

---

### 2. Convex (Real-Time Database)

```bash
CONVEX_DEPLOYMENT=dev:your-deployment-name
NEXT_PUBLIC_CONVEX_URL=https://your-deployment-name.convex.cloud
PUBLIC_CONVEX_URL=https://your-deployment-name.convex.cloud
```

**What it does:**
- Real-time data synchronization
- Server-side functions (queries, mutations, actions)
- Automatic subscriptions and live updates
- Schema validation and migrations

**Key Points:**
- `CONVEX_DEPLOYMENT` - Your deployment identifier (dev/prod)
- `NEXT_PUBLIC_CONVEX_URL` - Client-side access URL (exposed to browser)
- `PUBLIC_CONVEX_URL` - Astro equivalent (Astro uses PUBLIC_ prefix)

**Production Update Needed:**
- Deploy production Convex instance
- Update to `prod:your-prod-deployment` format
- Update URLs to production Convex cloud instance

---

### 3. Google Maps API

```bash
PUBLIC_GOOGLE_MAPS_API_KEY=AIzaSy_YOUR_GOOGLE_MAPS_API_KEY_HERE
GOOGLE_MAPS_API_KEY=AIzaSy_YOUR_GOOGLE_MAPS_API_KEY_HERE
```

**What it does:**
- Address autocomplete (Places API)
- Geocoding (address to coordinates)
- Distance Matrix API (drive time calculation)
- Maps JavaScript API (map display)
- Directions API (route planning)

**Required APIs to Enable:**
- ✅ Maps JavaScript API
- ✅ Places API (Autocomplete)
- ✅ Geocoding API
- ✅ Distance Matrix API
- ⚠️ Directions API (if route display needed)

**Key Points:**
- Same key used for client and server
- `PUBLIC_` prefix exposes to browser (required for Maps JS API)
- Both prefixes included for Astro/Next compatibility

**Security Notes:**
- API key restrictions recommended for production:
  - HTTP referrer restrictions: `https://treeshop.app/*`
  - API restrictions: Only enable needed APIs
  - Usage limits: Set daily quotas

---

### 4. Google OAuth 2.0

```bash
GOOGLE_CLIENT_ID=YOUR_CLIENT_ID_HERE.apps.googleusercontent.com
```

**What it does:**
- "Sign in with Google" functionality
- Google Calendar API access (for scheduling)
- Gmail API access (for email notifications - future)

**Key Points:**
- OAuth Client ID for web application
- Requires authorized redirect URIs configured in Google Cloud Console
- Used with WorkOS for Google SSO integration

**Authorized Redirect URIs (must be configured in Google Cloud Console):**
- Development: `http://localhost:3000/auth/callback`
- Development: `http://localhost:4321/auth/callback`
- Production: `https://treeshop.app/auth/callback`

**Required OAuth Scopes:**
- `https://www.googleapis.com/auth/userinfo.email` - User email
- `https://www.googleapis.com/auth/userinfo.profile` - User profile
- `https://www.googleapis.com/auth/calendar` - Calendar access (for scheduling)

---

## App Configuration

```bash
PUBLIC_APP_URL=http://localhost:4321
NODE_ENV=development
```

**What it does:**
- Base URL for the application
- Environment mode for logging/debugging

**Production Values:**
```bash
PUBLIC_APP_URL=https://treeshop.app
NODE_ENV=production
```

---

## Complete .env File Template

```bash
# WorkOS Authentication & Organization Management
WORKOS_API_KEY=sk_test_YOUR_WORKOS_API_KEY_HERE
WORKOS_CLIENT_ID=client_YOUR_WORKOS_CLIENT_ID_HERE
WORKOS_REDIRECT_URI=http://localhost:3000/auth/callback
WORKOS_COOKIE_PASSWORD=your-super-secret-cookie-password-minimum-32-characters-long

# Convex Real-time Database
CONVEX_DEPLOYMENT=dev:your-deployment-name
NEXT_PUBLIC_CONVEX_URL=https://your-deployment-name.convex.cloud
PUBLIC_CONVEX_URL=https://your-deployment-name.convex.cloud

# Google Maps API & OAuth
PUBLIC_GOOGLE_MAPS_API_KEY=AIzaSy_YOUR_GOOGLE_MAPS_API_KEY_HERE
GOOGLE_MAPS_API_KEY=AIzaSy_YOUR_GOOGLE_MAPS_API_KEY_HERE
GOOGLE_CLIENT_ID=YOUR_CLIENT_ID_HERE.apps.googleusercontent.com

# App Configuration
PUBLIC_APP_URL=http://localhost:4321
NODE_ENV=development
```

> **Note:** Replace all placeholder values with your actual credentials.
> The actual values are stored securely in your local `.env` file (not committed to git).

---

## Verification Checklist

### WorkOS Setup:
- [ ] WorkOS account created at workos.com
- [ ] TreeShop application registered
- [ ] Test API key copied
- [ ] Redirect URI configured in WorkOS dashboard
- [ ] Cookie password is 32+ characters

### Convex Setup:
- [ ] Convex account created at convex.dev
- [ ] Development deployment created (patient-raccoon-944)
- [ ] Schema deployed (`npx convex dev`)
- [ ] Test data seeded (optional)

### Google Cloud Console:
- [ ] Project created (or existing project selected)
- [ ] Maps JavaScript API enabled
- [ ] Places API enabled
- [ ] Geocoding API enabled
- [ ] Distance Matrix API enabled
- [ ] Billing account linked (required for Maps APIs)
- [ ] API key created with restrictions
- [ ] OAuth 2.0 Client ID created
- [ ] Authorized redirect URIs configured

### Local Environment:
- [ ] `.env` file created in project root
- [ ] All variables copied from above
- [ ] `.env` added to `.gitignore` (security)
- [ ] Dev server restarted after adding `.env`

---

## Testing the Configuration

### Test WorkOS:
```bash
# Start dev server
npm run dev

# Visit: http://localhost:4321/auth/login
# Should redirect to WorkOS hosted auth page
```

### Test Convex:
```bash
# Open browser console on any page
# Run:
console.log(import.meta.env.PUBLIC_CONVEX_URL)
// Should output: https://patient-raccoon-944.convex.cloud

# Check Convex dashboard for active connections
```

### Test Google Maps:
```bash
# Visit a page with AddressAutocomplete component
# Start typing an address
# Should see autocomplete suggestions appear
```

### Test Google OAuth:
```bash
# Click "Sign in with Google" button
# Should redirect to Google sign-in page
# After signin, should redirect back to app
```

---

## Production Deployment Checklist

### Before Deploying to Production:

1. **WorkOS Production Setup:**
   - [ ] Upgrade to production WorkOS plan
   - [ ] Create production API key (starts with `sk_live_`)
   - [ ] Update `WORKOS_REDIRECT_URI` to `https://treeshop.app/auth/callback`
   - [ ] Generate new secure `WORKOS_COOKIE_PASSWORD` (64+ chars recommended)
   - [ ] Configure production domain in WorkOS dashboard

2. **Convex Production Setup:**
   - [ ] Deploy production Convex instance
   - [ ] Run schema migrations
   - [ ] Update `CONVEX_DEPLOYMENT` to `prod:your-prod-deployment`
   - [ ] Update both URL variables to production URLs
   - [ ] Test database connection from staging environment

3. **Google APIs Production Setup:**
   - [ ] Review API usage and set appropriate quotas
   - [ ] Add production domain to API key restrictions
   - [ ] Add production OAuth redirect URIs
   - [ ] Enable billing alerts
   - [ ] Consider separate API key for production (recommended)

4. **Security Hardening:**
   - [ ] Use Vercel environment variables (never commit .env to git)
   - [ ] Enable environment variable encryption
   - [ ] Set up monitoring for API key usage
   - [ ] Configure rate limiting
   - [ ] Enable CORS restrictions where applicable

5. **Domain Configuration:**
   - [ ] Update `PUBLIC_APP_URL` to `https://treeshop.app`
   - [ ] Configure DNS for treeshop.app
   - [ ] Set up SSL certificate (Vercel handles automatically)
   - [ ] Test all auth flows on production domain

---

## Troubleshooting

### "WorkOS authentication not working"
- Check `WORKOS_REDIRECT_URI` matches exactly what's in WorkOS dashboard
- Verify cookie password is 32+ characters
- Check browser console for CORS errors
- Ensure `PUBLIC_APP_URL` matches current domain

### "Convex queries failing"
- Verify deployment name format: `dev:deployment-name` or `prod:deployment-name`
- Check Convex dashboard for deployment status
- Ensure schema is deployed: `npx convex dev` or `npx convex deploy`
- Verify URL includes `.convex.cloud` suffix

### "Google Maps not loading"
- Check API key is prefixed with `PUBLIC_` for client-side access
- Verify required APIs are enabled in Google Cloud Console
- Check browser console for API errors
- Ensure billing is enabled (required for Maps APIs)
- Verify domain restrictions allow localhost for dev

### "Google OAuth 'redirect_uri_mismatch' error"
- Check exact redirect URI in Google Cloud Console OAuth settings
- Must include protocol: `http://` or `https://`
- Must include port for localhost: `http://localhost:4321/auth/callback`
- Case-sensitive - check exact match

---

## Cost Estimates (Production)

### WorkOS:
- **Dev/Test:** Free (up to 1 organization)
- **Production:** $125/month (up to 1000 users)
- **Enterprise:** Custom pricing for SSO/SCIM

### Convex:
- **Starter:** Free (1GB storage, 1M function calls/month)
- **Professional:** $25/month (10GB storage, 10M calls)
- **Enterprise:** Custom pricing

### Google Maps APIs:
- **Free Tier:** $200 credit/month
- **Usage-Based:**
  - Maps JavaScript API: $7 per 1000 loads
  - Places Autocomplete: $2.83 per 1000 requests (basic)
  - Geocoding: $5 per 1000 requests
  - Distance Matrix: $5 per 1000 elements

**Estimated Monthly Cost (100 proposals/month):**
- WorkOS: $0 (dev) → $125 (prod with team)
- Convex: $0 (within free tier initially)
- Google Maps: ~$50-100 depending on usage
- **Total:** ~$175-225/month for production

---

## Security Best Practices

1. **Never commit `.env` to git**
   - Already in `.gitignore` ✅
   - Use `.env.example` for documentation only

2. **Rotate keys regularly**
   - WorkOS API keys: Every 90 days
   - Google API keys: Every 180 days
   - Cookie passwords: Every 365 days

3. **Use environment-specific keys**
   - Separate dev/staging/prod keys
   - Different Google API keys per environment
   - Different WorkOS environments

4. **Monitor usage**
   - Set up alerts for unusual API usage
   - Monitor Convex function execution
   - Track WorkOS authentication attempts

5. **Restrict access**
   - API key restrictions (domain, IP)
   - Role-based access control (WorkOS)
   - Minimum necessary OAuth scopes

---

## Quick Reference

**Start Development:**
```bash
npm run dev
# Runs on http://localhost:4321
```

**Convex Development:**
```bash
npx convex dev
# Watches schema changes and deploys automatically
```

**Deploy to Production:**
```bash
# Update .env with production values
npm run build
npx convex deploy --prod
# Deploy to Vercel with environment variables configured
```

---

## Support & Documentation

- **WorkOS Docs:** https://workos.com/docs
- **Convex Docs:** https://docs.convex.dev
- **Google Maps Docs:** https://developers.google.com/maps/documentation
- **Google OAuth Docs:** https://developers.google.com/identity/protocols/oauth2

---

**Last Updated:** 2025-01-14
**Environment:** Development (Test Keys)
**Status:** ✅ All Systems Configured

**Next Steps:**
1. Test authentication flow
2. Seed test data in Convex
3. Configure production environment variables
4. Set up Vercel deployment
