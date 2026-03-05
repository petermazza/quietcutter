# QuietCutter — Final Testing Checklist

**Base URL:** `https://quietcutter-production-f345.up.railway.app`
**Date:** February 15, 2026

---

## Prerequisites

Before testing, confirm these environment variables are set on Railway:

| Variable | Required For | How to Check |
|----------|-------------|--------------|
| `RESEND_API_KEY` | Contact form email delivery | Submit contact form, check Railway logs for "Using RESEND_API_KEY from environment" |
| `VITE_AUTH0_DOMAIN` | Google/social OAuth login | If missing, only email/password auth is available |
| `VITE_AUTH0_CLIENT_ID` | Google/social OAuth login | If missing, only email/password auth is available |
| `STRIPE_SECRET_KEY` | Payments & Pro subscription | Run console command: `fetch('/api/stripe/products').then(r=>r.json()).then(d=>console.log(d))` |
| `DATABASE_URL` | Everything | App won't start without it |

> **Note:** If `VITE_AUTH0_DOMAIN` and `VITE_AUTH0_CLIENT_ID` are not set, skip all Auth0/Google OAuth tests. Email/password sign-in/sign-up will still work.

---

# SIGNED OUT (Guest)

## 1. Pages & Navigation

### 1.1 Homepage
- [ ] Navigate to `/` — Page loads with QuietCutter logo, tagline "Make Every Second Count", upload card, and preset selector
- [ ] Header shows: logo, **Home** (bold/active), About, Blog, Contact links, and a "Sign in" button
- [ ] Footer shows: copyright text, About, Blog, Contact links, and Instagram icon
- [ ] "Sign in" button is visible in the header (desktop) or mobile menu (mobile)
- [ ] Upload area shows drag-and-drop zone with supported file types listed

### 1.2 About Page
- [ ] Navigate to `/about` — Page loads with three feature cards (Zap, Clock, Wand2 icons)
- [ ] Header nav highlights "About" as the active link (bold text)
- [ ] Logo in header links back to homepage

### 1.3 Blog Page
- [ ] Navigate to `/blog` — Page loads with 4 hardcoded blog post cards:
  - "5 Tips for Perfect Podcast Audio" (Tips)
  - "Understanding Silence Thresholds" (Tutorial)
  - "Screen Recording Best Practices" (Guide)
  - "Interview Editing Made Easy" (Tips)
- [ ] Each card shows title, excerpt, date, and category badge
- [ ] Clicking a blog post navigates to `/blog/:id` with full article content, author, and read time

### 1.4 Contact Page
- [ ] Navigate to `/contact` — Page shows two info cards:
  - Email card: `support@quietcutter.com`
  - Social card: `@quietcutterdotcom` Instagram link (opens in new tab)
- [ ] Contact form below with fields: Name, Email, Subject, Message, and "Send Message" button with send icon

### 1.5 Navigation — Desktop (≥ 768px)
- [ ] Click "Home" in header → navigates to `/`
- [ ] Click "About" in header → navigates to `/about`
- [ ] Click "Blog" in header → navigates to `/blog`
- [ ] Click "Contact" in header → navigates to `/contact`
- [ ] Click QuietCutter logo in header → navigates to `/`
- [ ] Instagram icon in footer → opens `instagram.com/quietcutterdotcom` in new tab

### 1.6 Navigation — Mobile (< 768px)
- [ ] Hamburger menu icon (☰) appears, nav links are hidden
- [ ] Tap hamburger → mobile menu slides open with Home, About, Blog, Contact links and Sign in button
- [ ] Tap X icon → mobile menu closes
- [ ] Tapping a nav link closes the menu and navigates to the correct page
- [ ] Tapping "Sign in" in mobile menu opens sign-in modal

### 1.7 Responsive Design
- [ ] **Mobile (< 768px):** Content stacks vertically, no horizontal overflow, text is readable, upload area fills width
- [ ] **Tablet (768px–1024px):** Contact info cards display in 2-column grid, comfortable spacing
- [ ] **Desktop (> 1024px):** Centered content with max-width ~672px (`max-w-3xl`), balanced whitespace
- [ ] **Sticky header:** Header stays fixed at top when scrolling on homepage

## 2. Authentication (from Signed Out)

### 2.1 Sign-In Modal
- [ ] Click "Sign in" button on homepage → modal dialog appears (does NOT navigate away)
- [ ] Modal has two tabs: **"Sign In"** and **"Create Account"**
- [ ] Sign In tab shows: Email input, Password input, "Sign In" button
- [ ] Create Account tab shows: First Name, Last Name, Email, Password inputs, "Create Account" button

### 2.2 Auth0 / Google OAuth (only if `VITE_AUTH0_DOMAIN` is set)
- [ ] Auth0 button appears above email form: "Continue with Auth0 (Google, Apple, GitHub)"
- [ ] Click Auth0 button → redirected to Auth0 login page
- [ ] After authorizing → redirected back to `/auth/callback`, then to homepage
- [ ] User avatar and name appear in the header
- [ ] **If Auth0 env vars are NOT set:** Auth0 buttons do not appear at all — only email/password forms show

### 2.3 Email/Password Sign Up
- [ ] Switch to "Create Account" tab
- [ ] Enter email + password (≥ 8 characters) + optional first/last name
- [ ] Click "Create Account" → button shows spinner "Creating account..."
- [ ] Toast: "Account created!" / "You are now signed in."
- [ ] Modal closes, user avatar appears in header
- [ ] Entering password < 8 characters → error: "Password must be at least 8 characters"
- [ ] Using an already-registered email → error: "Email already registered"

### 2.4 Email/Password Sign In
- [ ] Switch to "Sign In" tab
- [ ] Enter registered email + correct password
- [ ] Click "Sign In" → button shows spinner "Signing in..."
- [ ] Toast: "Welcome back!" / "You are now signed in."
- [ ] Modal closes, user avatar + name appear in header
- [ ] Wrong password → error toast: "Invalid email or password"

### 2.5 Upload Requires Auth
- [ ] Drag a file onto the upload area while signed out → sign-in modal appears
- [ ] Click the upload area / file input while signed out → sign-in modal appears
- [ ] File is NOT uploaded until after signing in

## 3. Contact Form

### 3.1 Successful Submission
- [ ] Fill in all 4 fields (Name, Email, Subject, Message)
- [ ] Click "Send Message" → button text changes to "Sending..." (disabled during submission)
- [ ] Toast: title "Message sent", description "Thanks for reaching out! We'll get back to you soon."
- [ ] Form fields are cleared after success

### 3.2 Validation (HTML Required)
- [ ] Leave Name empty, fill others → browser blocks submission: "Please fill out this field"
- [ ] Leave Email empty → browser blocks submission
- [ ] Enter invalid email format → browser shows email validation error
- [ ] Leave Subject empty → browser blocks submission
- [ ] Leave Message empty → browser blocks submission

### 3.3 Email Delivery (requires `RESEND_API_KEY`)
- [ ] After successful submission, check `support@quietcutter.com` inbox
- [ ] Email arrives from `QuietCutter <noreply@quietcutter.com>`
- [ ] Email body shows the submitter's name, email, subject, and message
- [ ] Reply-To header is set to the submitter's email address
- [ ] Replying to the email sends to the submitter, not to noreply@

### 3.4 Rate Limiting
- [ ] Submit the form rapidly 5+ times → eventually toast: error (HTTP 429 Too Many Requests)

### 3.5 Database Verification
- [ ] Open browser console on the site, run:
  ```javascript
  fetch('/api/admin/contact-messages').then(r=>r.json()).then(d=>console.log(JSON.stringify(d.messages,null,2)))
  ```
- [ ] Submitted message appears with correct name, email, subject, message, and `createdAt` timestamp

## 4. UI — General

- [ ] **Page load speed:** Homepage loads and is interactive in under 3 seconds
- [ ] **Dark theme:** Dark background, light text, cards with subtle `border-border/50` borders
- [ ] **Toast notifications:** Appear as overlay and auto-dismiss after a few seconds
- [ ] **404 page:** Navigate to `/nonexistent` → shows "404 Page Not Found" page
- [ ] **Favicon:** QuietCutter logo appears as browser tab icon

---

# SIGNED IN — FREE USER

## 5. Session Management

### 5.1 Login
- [ ] Sign in with valid credentials → user avatar + first name appear in header
- [ ] Click avatar → dropdown shows: name, email (if both exist), and "Sign out" link with LogOut icon
- [ ] Purple "Pro" upgrade button with crown icon appears next to avatar

### 5.2 Session Persistence
- [ ] Refresh the page (Cmd+R / F5) → still signed in, projects still visible
- [ ] Close the tab, reopen the site → still signed in (session cookie persists)

### 5.3 Logout
- [ ] Click avatar → dropdown → "Sign out"
- [ ] Redirected to homepage, "Sign in" button reappears
- [ ] "Your Projects" section no longer shows personal projects
- [ ] Mobile: avatar + "Sign out" in mobile menu works the same way

## 6. Projects

### 6.1 Default Project
- [ ] On first sign-in, a project named **"My Uploads"** is automatically created via `POST /api/projects/default`
- [ ] "My Uploads" is auto-selected and expanded

### 6.2 Project List
- [ ] Projects appear under "Your Projects" heading
- [ ] Each project card shows: name, file count, and expand/collapse arrow
- [ ] Clicking a project selects it and loads its files into the upload area
- [ ] Badge shows **"X/1 projects"** in amber with crown icon (free limit indicator)

### 6.3 Project Settings
- [ ] Click "Custom Settings" button → settings panel expands with:
  - **Silence Threshold slider:** -60dB to -10dB (label updates in real-time, e.g., "Silence Threshold: -40dB")
  - **Min Silence Duration slider:** 0.1s to 2.0s (label: "Min Silence Duration: 0.5s")
- [ ] Click **"Save to Project"** → toast: "Project settings saved"
- [ ] Reload page → settings are restored to saved values
- [ ] **Reprocess Project Files** button appears when project has files — click → toast: "Reprocessing started" / "All files are being reprocessed with the current project settings."

### 6.4 Favorite Project
- [ ] Click star icon on a project → project is marked as favorite
- [ ] Click star again → favorite is removed
- [ ] Favorite status persists after page refresh

### 6.5 Project Limit (Free)
- [ ] Badge shows "1/1 projects" after creating the default project
- [ ] Clicking the crown icon on the badge opens the pricing/upgrade modal

## 7. Upload & Processing (Free)

### 7.1 Single File Upload — Audio
- [ ] Click upload area or drag a **.mp3** file → toast: "Upload successful" / "Your file is being processed."
- [ ] File appears in project with status badges: **Queued** (yellow) → **Processing** (blue) → **Done** (green)
- [ ] Polling: project auto-refreshes every 1 second until processing completes
- [ ] Repeat with: **.wav**, **.ogg**, **.flac**, **.m4a** — all should process

### 7.2 Single File Upload — Video
- [ ] Upload a **.mp4** file → audio is extracted from video and processed
- [ ] Repeat with: **.mov**, **.avi**, **.mkv**, **.webm**

### 7.3 Processing Results
- [ ] Completed file card shows:
  - Original filename
  - File size (e.g., "5.2 MB")
  - Output format (e.g., "MP3")
  - Settings used (e.g., "-40dB / 500ms")
  - Original duration (e.g., "2m 30s") and processed duration (e.g., "1m 45s")
  - **Done** badge (green)

### 7.4 Download
- [ ] Click **"Download"** button on a completed file → browser downloads the processed file
- [ ] Downloaded file plays correctly and has silence removed
- [ ] Processed file is shorter than the original

### 7.5 Delete File
- [ ] Click trash icon (red) on a file → file is removed from the project
- [ ] Toast: "File deleted"
- [ ] File disappears from the project list immediately

### 7.6 Presets
- [ ] Open presets section (click to expand)
- [ ] **Podcast** preset (free): Click → threshold changes to -35dB, duration to 500ms
- [ ] **Lecture** preset (free): Click → threshold changes to -45dB, duration to 600ms
- [ ] **Screen Recording** preset (🔒 locked): Click → pricing/upgrade modal opens
- [ ] **Interview** preset (🔒 locked): Click → pricing/upgrade modal opens
- [ ] Locked presets show a Lock icon in the top-right corner and appear slightly faded (opacity-60)
- [ ] Below presets: amber link **"Unlock all presets & save custom presets →"** → opens upgrade modal

### 7.7 Drag & Drop
- [ ] Drag a file over the upload area → area visually highlights (border changes)
- [ ] Drop the file → upload begins immediately
- [ ] Drag away without dropping → highlight disappears

## 8. Free Limits Enforced

### 8.1 File Size Limit (100MB)
- [ ] Upload a file > 100MB → toast: `"<filename>" exceeds the 100MB limit. Upgrade to Pro for 500MB uploads.`
- [ ] File is NOT uploaded
- [ ] Upload badge shows **"100MB max"**

### 8.2 Batch Upload Blocked
- [ ] Select 2+ files in the file picker (or drag 2+ files) → toast: "Batch upload (up to 3 files) is available for Pro subscribers."
- [ ] Files are NOT uploaded
- [ ] Upload badge shows **"🔒 1 file"** with lock icon

### 8.3 Output Format Locked
- [ ] In presets section, "Output Format" row shows **"MP3 only"** with a lock icon and "PRO" badge
- [ ] No dropdown selector — just a static "MP3 only" label
- [ ] All processed files output as .mp3 regardless

### 8.4 Audio Preview — Pro Teaser
- [ ] On each completed file, a teaser button appears: **"Audio preview & waveform"** with a Play icon and amber **"PRO"** badge
- [ ] Clicking the teaser → pricing/upgrade modal opens
- [ ] No play/pause button is visible for free users (only the teaser)

### 8.5 Bulk Download — Hidden
- [ ] The **"Download All"** button does NOT appear for free users
- [ ] Only individual file download buttons are available

### 8.6 Save Preset — Hidden
- [ ] In custom settings, the **"Save as Preset"** button does NOT appear for free users
- [ ] Free users can adjust sliders manually but cannot save them as named presets

## 9. Upgrade Flow (Free)

### 9.1 Upgrade Button
- [ ] Purple gradient **"Pro"** button with crown icon visible in the header (next to avatar)
- [ ] Click "Pro" button → fetches products from Stripe → pricing modal opens

### 9.2 Upgrade CTA Card
- [ ] Below the upload card, a gradient card appears: **"Unlock Pro Features"**
- [ ] Card lists: batch uploads, 500MB limit, output format selection, audio preview & waveform, bulk download as ZIP
- [ ] "Upgrade to Pro" button with "From $9.99/month" text
- [ ] Click → pricing modal opens

### 9.3 Pricing Modal
- [ ] Shows product name (from Stripe, e.g., "QuietCutter Pro") and description
- [ ] Lists available prices (from Stripe — typically monthly and yearly)
- [ ] Each price shows interval and has a "Subscribe" button
- [ ] **If Stripe is not configured:** Toast: "Pro subscription is not configured yet."

### 9.4 Stripe Checkout
- [ ] Click "Subscribe" on a price → button shows loading spinner
- [ ] Redirected to Stripe Checkout page with correct product and price
- [ ] Cancel on Stripe → returned to QuietCutter
- [ ] **If checkout fails:** Toast: "Failed to start checkout."

## 10. Error Handling (Free)

- [ ] **Invalid file type:** Upload a .txt file → toast: `".txt" is not supported. Please upload an audio file (MP3, WAV, OGG, FLAC, M4A) or video file (MP4, MOV, AVI, MKV, WEBM).`
- [ ] **Too many files (even for free):** Select 4+ files → toast: "You can upload up to 3 files at a time." (this fires before the Pro check)
- [ ] **Upload failure:** If server returns error → toast: "Upload failed" with error description
- [ ] **App stability:** App does not crash or show white screen on any error

---

# SIGNED IN — PRO USER

## 11. Subscription Status

### 11.1 After Payment
- [ ] Complete Stripe checkout → redirected back to QuietCutter
- [ ] Header shows gold/amber **"Pro"** badge with crown icon (replaces purple upgrade button)
- [ ] Upgrade CTA card below upload area disappears
- [ ] Console: `fetch('/api/subscription/status').then(r=>r.json()).then(d=>console.log(d))` → `{ isPro: true }`

### 11.2 Cancellation (via Stripe)
- [ ] Cancel subscription through Stripe customer portal
- [ ] After cancellation webhook is processed → `isPro` becomes `false`
- [ ] "Pro" badge disappears, purple upgrade button returns
- [ ] Pro features become locked again (preview teaser reappears, presets lock, etc.)
- [ ] ⚠️ **Note:** Cancellation handling depends on `stripe-replit-sync` processing the webhook correctly. Verify by checking `/api/subscription/status` after cancellation.

## 12. Projects (Pro — Unlocked)

### 12.1 Multiple Projects
- [ ] Click **"+"** button next to "Your Projects" → text input appears
- [ ] Enter a project name → press Enter or click create → toast: "Project created"
- [ ] New project appears in the list, is auto-selected and expanded
- [ ] Create 2nd, 3rd project → all persist (no auto-deletion)
- [ ] Badge shows **"X projects"** (no limit indicator)

### 12.2 Delete Project
- [ ] Click delete/trash icon on a project → project and all its files are removed
- [ ] Toast: "Project deleted"
- [ ] If the deleted project was selected, selection clears

### 12.3 Reprocess
- [ ] Select a project with completed files
- [ ] Change silence threshold or min duration via sliders
- [ ] Click **"Reprocess Project Files"** → toast: "Reprocessing started" / "All files are being reprocessed with the current project settings."
- [ ] All files in the project change status back to Processing → eventually Done
- [ ] Download a reprocessed file → verify new settings were applied (different silence removal)

## 13. Upload & Processing (Pro — Unlocked)

### 13.1 Batch Upload (up to 3 files)
- [ ] Upload badge shows **"Up to 3 files"** (blue gradient badge)
- [ ] Select 2 files → both upload → toast: "2 files are being processed."
- [ ] Select 3 files → all 3 upload → toast: "3 files are being processed."
- [ ] Select 4 files → toast error: "You can upload up to 3 files at a time." (hard limit for all users)

### 13.2 Large File (up to 500MB)
- [ ] Upload badge shows **"500MB max"**
- [ ] Upload a file between 100MB–500MB → uploads and processes successfully
- [ ] Upload a file > 500MB → toast error with 500MB limit message

### 13.3 Output Format Selection
- [ ] In presets section, "Output Format" row shows a dropdown selector (no lock icon, no PRO badge)
- [ ] Options: **MP3 (320k)**, **WAV**, **FLAC**
- [ ] Select WAV → upload a file → file card shows "WAV" format → download is `.wav`
- [ ] Select FLAC → upload a file → file card shows "FLAC" format → download is `.flac`
- [ ] Select MP3 → download is `.mp3`

### 13.4 All Audio Formats
- [ ] Upload and process each, verify "Done" status:
  - [ ] MP3 → completes
  - [ ] WAV → completes
  - [ ] OGG → completes
  - [ ] FLAC → completes
  - [ ] M4A → completes

### 13.5 All Video Formats
- [ ] Upload and process each (audio extracted from video):
  - [ ] MP4 → completes
  - [ ] MOV → completes
  - [ ] AVI → completes
  - [ ] MKV → completes
  - [ ] WEBM → completes

## 14. Pro Features

### 14.1 Custom Presets
- [ ] Open custom settings → **"Save as Preset"** button is visible (only for Pro)
- [ ] Click "Save as Preset" → text input + Save/Cancel buttons appear
- [ ] Enter a name → click Save → toast: "Preset saved"
- [ ] New preset appears under **"Saved Presets"** section with crown icon header
- [ ] Click a saved preset → sliders update to that preset's values
- [ ] Preset card shows: name, threshold, duration

### 14.2 Delete Preset
- [ ] Each saved preset has a small X button in the top-right corner
- [ ] Click X → preset is removed → toast: "Preset deleted"
- [ ] Preset no longer appears in the Saved Presets section

### 14.3 Audio Preview & Waveform
- [ ] On completed files, a **"Preview"** button with Play icon appears (replaces the teaser)
- [ ] Click Preview → audio streams in-browser, button changes to **"Pause"**
- [ ] Waveform visualization renders below the file info (using WaveSurfer.js)
- [ ] Click Pause → playback stops
- [ ] Click Preview on a different file → previous file stops, new one plays
- [ ] If preview fails → toast: "Preview error" / "Could not play audio preview."

### 14.4 Bulk Download (All Files)
- [ ] **"Download All"** button with Package icon appears next to "Your Projects" heading (only when there are completed files)
- [ ] Click "Download All" → browser downloads `quietcutter_projects.zip`
- [ ] ZIP contains all completed files across all projects
- [ ] Each file is named `<original>_processed.<format>` (e.g., `interview_processed.wav`)

---

# ADMIN

## 15. Admin & Background Tasks

### 15.1 View Contact Messages
- [ ] Open browser console on the Railway URL, run:
  ```javascript
  fetch('/api/admin/contact-messages')
    .then(r => r.json())
    .then(d => {
      console.log('Total:', d.count);
      console.log(JSON.stringify(d.messages, null, 2));
    })
  ```
- [ ] Response: `{ success: true, count: N, messages: [...] }`
- [ ] Each message has: id, name, email, subject, message, createdAt
- [ ] Messages are ordered newest first (`ORDER BY created_at DESC`)

### 15.2 Background Jobs (check Railway logs)
- [ ] **File cleanup:** Runs daily, deletes processed files older than 7 days
- [ ] **Queue cleanup:** Runs every 5 minutes, clears stale "processing" items that have been stuck for > 5 minutes
- [ ] **Rate limiting:** Active on all endpoints — upload (stricter), auth, contact, and general API

### 15.3 Stripe Webhook
- [ ] Webhook endpoint: `POST /api/stripe/webhook`
- [ ] Receives raw body (Buffer) before JSON parsing middleware
- [ ] Delegates to `stripe-replit-sync` for processing
- [ ] Verify in Railway logs: no "STRIPE WEBHOOK ERROR" messages

---

## Quick Console Commands

Run in browser dev console while on `https://quietcutter-production-f345.up.railway.app`:

```javascript
// Check if you're logged in
fetch('/api/auth/user').then(r => r.json()).then(d => console.log(d))

// Check Pro subscription status
fetch('/api/subscription/status').then(r => r.json()).then(d => console.log(d))

// List all your projects and files
fetch('/api/projects').then(r => r.json()).then(d => console.log(JSON.stringify(d, null, 2)))

// View all contact form messages (admin)
fetch('/api/admin/contact-messages').then(r => r.json()).then(d => console.log(JSON.stringify(d.messages, null, 2)))

// List your custom presets
fetch('/api/presets').then(r => r.json()).then(d => console.log(d))

// Check Stripe products and pricing
fetch('/api/stripe/products').then(r => r.json()).then(d => console.log(JSON.stringify(d, null, 2)))

// Register a new account (if not using Auth0)
fetch('/api/auth/register', { method: 'POST', headers: {'Content-Type':'application/json'}, credentials: 'include', body: JSON.stringify({email:'test@example.com', password:'password123', firstName:'Test'}) }).then(r=>r.json()).then(d=>console.log(d))
```
