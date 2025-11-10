# Testing WorkOS Authentication

## Quick Test Guide

### Prerequisites
- Convex dev server running: `npm run convex`
- Astro dev server running: `npm run dev`
- WorkOS credentials in `.env`

---

## Test 1: Sign Up New User

1. **Open**: http://localhost:3000/sign-up

2. **Step 1 - Create Account:**
   - Name: `Test User`
   - Email: `test@treeshop.app`
   - Password: `testpassword123`
   - Click **Next**

3. **Step 2 - Company Setup:**
   - Company Name: `Test Tree Services`
   - Address: `123 Test St`
   - City: `New Smyrna Beach`
   - State: `FL`
   - ZIP: `32168`
   - Phone: `555-123-4567`
   - Click **Complete Setup**

4. **Expected Result:**
   - Redirects to `/dashboard-demo`
   - User profile shows in right sidebar
   - Avatar displays "TU" (initials)
   - Shows "Test User" and "Test Tree Services"

---

## Test 2: Sign In Existing User

1. **Open**: http://localhost:3000/sign-in

2. **Enter Credentials:**
   - Email: `test@treeshop.app`
   - Password: `testpassword123`
   - Click **Sign in**

3. **Expected Result:**
   - Redirects to `/dashboard-demo`
   - User profile visible in sidebar

---

## Test 3: Protected Routes

1. **Clear Cookies** (or use incognito window)

2. **Try to access**: http://localhost:3000/dashboard-demo

3. **Expected Result:**
   - Immediately redirects to `/sign-in`
   - Cannot access dashboard without authentication

4. **Sign in again**

5. **Try protected routes:**
   - `/equipment` - should work
   - `/dashboard-demo` - should work
   - Any other route - should work

---

## Test 4: Session Persistence

1. **Sign in** at `/sign-in`

2. **Close browser tab**

3. **Open new tab** to http://localhost:3000/dashboard-demo

4. **Expected Result:**
   - Still logged in (session persists)
   - Dashboard loads without redirect

5. **Session expires in 7 days** (auto sign-out)

---

## Test 5: Sign Out

1. **While signed in**, click **user avatar** in right sidebar

2. **Click "Sign out"** from dropdown menu

3. **Expected Result:**
   - Redirects to `/sign-in`
   - Session cookie cleared
   - Cannot access `/dashboard-demo` anymore

---

## Test 6: User Profile Menu

1. **Sign in** to dashboard

2. **Click user avatar** in right sidebar

3. **Verify menu shows:**
   - User name: "Test User"
   - Email: "test@treeshop.app"
   - Organization: "Test Tree Services"
   - Role: "OWNER" (in blue)
   - Menu items: Profile, Settings, Sign out

4. **Click anywhere outside** menu to close

---

## Verification Checklist

### WorkOS Dashboard
Visit: https://dashboard.workos.com

- [ ] Organization created: "Test Tree Services"
- [ ] User created: test@treeshop.app
- [ ] User is member of organization
- [ ] Organization membership role: "owner"

### Convex Dashboard
Visit: https://dashboard.convex.dev

- [ ] Table `organizations` has new record
- [ ] Table `users` has new record
- [ ] `users.organizationId` links to `organizations._id`
- [ ] `organizations.workosOrgId` matches WorkOS org ID
- [ ] `users.workosUserId` matches WorkOS user ID

### Browser DevTools

**Application > Cookies:**
- [ ] Cookie name: `session`
- [ ] Cookie is HttpOnly: ✓
- [ ] Cookie path: `/`
- [ ] Cookie expires: ~7 days from now

**Console:**
- [ ] No errors during sign-up
- [ ] No errors during sign-in
- [ ] No errors on protected routes

**Network Tab:**
- [ ] POST `/api/auth/sign-up` returns 201
- [ ] POST `/api/auth/sign-in` returns 200
- [ ] POST `/api/auth/sign-out` returns 200
- [ ] Session cookie set after sign-up/sign-in
- [ ] Session cookie cleared after sign-out

---

## Common Issues & Fixes

### Issue: "No organization found for this user"

**Cause:** WorkOS and Convex out of sync

**Fix:**
1. Delete user in WorkOS dashboard
2. Delete records in Convex tables
3. Sign up again

### Issue: Redirect loop at /sign-in

**Cause:** Middleware configuration

**Fix:**
1. Check `/src/middleware.ts` public paths
2. Verify `/sign-in` is in public routes
3. Clear cookies and try again

### Issue: Session immediately expires

**Cause:** JWT secret mismatch

**Fix:**
1. Check `WORKOS_COOKIE_PASSWORD` in `.env`
2. Restart both dev servers
3. Clear cookies and sign in again

### Issue: Can't access Convex data

**Cause:** Convex dev server not running

**Fix:**
1. Run `npm run convex` in separate terminal
2. Verify `PUBLIC_CONVEX_URL` in `.env`
3. Check Convex dashboard for deployment status

---

## Production Testing

Before deploying to production:

1. **Update .env for production:**
   - [ ] Change `WORKOS_REDIRECT_URI` to production URL
   - [ ] Use production WorkOS API key
   - [ ] Generate secure 32+ char `WORKOS_COOKIE_PASSWORD`
   - [ ] Set production `PUBLIC_CONVEX_URL`

2. **Test sign-up flow** on production domain

3. **Test sign-in flow** on production domain

4. **Verify HTTPS** enforced for session cookies

5. **Check middleware** protects all routes

6. **Test session persistence** across devices

7. **Verify sign-out** clears session completely

---

## Performance Benchmarks

Expected response times (local dev):

- Sign-up: 1-3 seconds (creates WorkOS + Convex records)
- Sign-in: 500-1000ms (validates + queries)
- Sign-out: <100ms (clears cookie)
- Protected route check: <10ms (JWT verify)

---

## Next Features to Test

Once basic auth works:

1. **Email verification** - WorkOS email verification flow
2. **Password reset** - Forgot password functionality
3. **Google OAuth** - Sign in with Google
4. **Profile editing** - Update user name, avatar
5. **Team invitations** - Invite additional users
6. **Role management** - Change user roles

---

## Support & Debugging

### Check Logs:

**Convex Logs:**
```bash
npm run convex -- logs
```

**Astro Server:**
Check terminal running `npm run dev`

**Browser Console:**
Press F12 → Console tab

### Useful Commands:

```bash
# View Convex data
npx convex dashboard

# Clear Convex data (DEV ONLY!)
npx convex delete organizations
npx convex delete users

# Check WorkOS users
curl https://api.workos.com/users \
  -H "Authorization: Bearer $WORKOS_API_KEY"
```

---

## Success Criteria

Authentication system is working when:

- ✅ New users can sign up with company details
- ✅ Existing users can sign in with email/password
- ✅ Sessions persist for 7 days
- ✅ Protected routes redirect to sign-in when not authenticated
- ✅ User profile displays in dashboard sidebar
- ✅ Sign-out clears session and redirects to sign-in
- ✅ No console errors or warnings
- ✅ WorkOS and Convex data synced correctly
- ✅ User roles display correctly
- ✅ Organization name shows in profile

All tests passing = Ready for production! 🚀
