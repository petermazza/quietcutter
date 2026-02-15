# QuietCutter Routing Issue - Handoff Document

## 🔴 **CRITICAL ISSUE**

**Problem:** All `/api/admin/*` routes hang indefinitely in the browser. Requests never reach the Express server.

**Affected URLs:**
- `https://quietcutter.com/api/admin/test`
- `https://quietcutter.com/api/admin/contact-messages`
- Any route under `/api/admin/*`

**Working URLs:**
- `https://quietcutter.com` (homepage loads)
- `https://quietcutter.com/api/contact` (contact form works, emails send)
- Other `/api/*` routes (need to verify)

---

## 📊 **CURRENT STATUS**

**Deployment:** Railway (https://railway.app)
**Repository:** https://github.com/petermazza/quietcutter
**Latest Commit:** `6a00ba2` - "Add workaround: contact messages accessible via /api/projects?admin=contact"

**Server Logs Show:**
```
[ROUTES] Registering admin routes...
[ROUTES] Admin routes registered
Routes registered
Setting up static file serving...
```

**What's NOT in logs:**
- No `[ADMIN TEST]` messages (endpoint never hit)
- No `[STATIC]` messages (static middleware logging not appearing)
- No errors

---

## 🔍 **ROOT CAUSE (SUSPECTED)**

The static file serving middleware is intercepting `/api/admin/*` routes before they reach the Express route handlers.

**Evidence:**
1. Routes are registered successfully (logs confirm)
2. Requests never hit the endpoint handlers (no logs)
3. Browser hangs indefinitely (no response)
4. Other `/api/*` routes work (e.g., `/api/contact`)

---

## 🛠️ **ATTEMPTED FIXES**

### 1. **Modified Static Middleware** (`server/static.ts`)
```typescript
app.use((req, res, next) => {
  if (req.path.startsWith('/api')) {
    return next(); // Should pass through API routes
  }
  res.sendFile(path.resolve(distPath, "index.html"));
});
```
**Result:** Still hangs

### 2. **Moved Admin Routes to Beginning**
Registered `/api/admin/*` routes BEFORE auth, BEFORE everything else.
**Result:** Still hangs

### 3. **Added Extensive Logging**
Added console.log statements at:
- Route registration
- Endpoint entry points
- Static middleware
**Result:** Only registration logs appear, endpoint logs never show

### 4. **Created Workaround**
Added query parameter to existing endpoint: `/api/projects?admin=contact`
**Status:** Not yet tested/verified

---

## 🎯 **NEXT STEPS TO DEBUG**

### **Option 1: Check Railway Proxy/CDN**
Railway might have a proxy or CDN caching layer that's interfering.
- Check Railway settings for any proxy configuration
- Try disabling any caching
- Check if there's a custom domain with Cloudflare or similar

### **Option 2: Test Locally**
The issue might be Railway-specific:
```bash
cd /Users/petermazza/Downloads/QuietCutter
npm install
npm run build
npm start
```
Then try: `http://localhost:5000/api/admin/test`

If it works locally, it's a Railway configuration issue.

### **Option 3: Check Browser Cache**
Clear Safari cache completely or try in incognito/different browser.

### **Option 4: Inspect Network Request**
Open Safari Developer Tools → Network tab → Try the endpoint
- Does the request even leave the browser?
- What's the status code?
- Are there any redirects?

---

## 📁 **RELEVANT FILES**

### **Route Registration**
- `server/routes.ts` (lines 150-182) - Admin routes registered first
- `server/index.ts` (line 229) - Routes registered before static files

### **Static File Serving**
- `server/static.ts` (lines 21-29) - Middleware with /api check
- `server/index.ts` (line 302) - Static serving setup

### **Admin Endpoints**
- `/api/admin/test` - Simple test endpoint (should return JSON immediately)
- `/api/admin/contact-messages` - Database query for contact messages

---

## 🔧 **QUICK FIX (TEMPORARY)**

Use the workaround endpoint:
```
https://quietcutter.com/api/projects?admin=contact
```

This bypasses the `/api/admin/*` routing issue by adding contact messages to an existing working endpoint.

---

## 👥 **WHO CAN HELP**

### **Option 1: Railway Support**
- Email: team@railway.app
- Discord: https://discord.gg/railway
- Ask: "Why are requests to /api/admin/* routes hanging but other /api/* routes work?"

### **Option 2: Full-Stack Developer**
Someone with Express.js + Railway experience who can:
1. Debug the routing issue
2. Check Railway proxy/CDN settings
3. Test locally to isolate the problem

### **Option 3: DevOps/Infrastructure Engineer**
Someone who can:
1. Check Railway deployment configuration
2. Verify proxy/CDN settings
3. Check for any middleware or routing conflicts

---

## 📞 **HANDOFF INFORMATION**

**Repository:** https://github.com/petermazza/quietcutter
**Railway Project:** QuietCutter (user needs to grant access)
**Database:** PostgreSQL on Railway
**Current Status:** Production site works, admin endpoints don't

**To Grant Railway Access:**
1. Go to Railway dashboard
2. Project Settings → Members
3. Invite developer by email

**To Test Issue:**
1. Visit: `https://quietcutter.com/api/admin/test`
2. Should return: `{"success": true, "message": "Admin routing works!"}`
3. Actually does: Hangs indefinitely

---

## 🎯 **EXPECTED BEHAVIOR**

When visiting `https://quietcutter.com/api/admin/test`, should see:
```json
{"success": true, "message": "Admin routing works!"}
```

And in Railway logs should see:
```
[ADMIN TEST] Endpoint hit!
```

---

**Last Updated:** 2026-02-15 01:00 AM EST
**Created By:** Cascade AI
**Status:** Unresolved - Needs expert debugging
