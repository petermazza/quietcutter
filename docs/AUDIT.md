# QuietCutter Web Audit Checklist

_Last updated: Mar 4 2026_

Use this list to verify QuietCutter’s UI/UX and critical flows. Mark each check ✅ (pass), ⚠️ (issue found) or 🚫 (not applicable) when running an audit.

## 1. Global Shell & Navigation

| # | Check | Status | Notes |
|---|-------|--------|-------|
|1.1| Logo image renders crisply on desktop & mobile and links home | | |
|1.2| Desktop nav shows Home/About/Blog/Contact; active link highlighted | | |
|1.3| Signed-out state shows rounded “Sign in” button aligned with nav | | |
|1.4| Signed-in state shows avatar menu with name/email + “Sign out” link | | |
|1.5| Pro badge/button appears correctly (free vs Pro user) | | |
|1.6| Mobile hamburger toggles menu with same nav + auth controls | | |
|1.7| Footer appears on all pages with copyright + nav links + Instagram icon (opens new tab) | | |

## 2. Home Dashboard (`/`)

### 2.1 Hero & Onboarding

| # | Check | Status | Notes |
|---|-------|--------|-------|
|2.1.1| Hero stack shows logo, title, tagline centered above tools | | |
|2.1.2| Page loads without layout shift (no CLS) on desktop & mobile widths | | |

### 2.2 Upload Workflow

| # | Check | Status | Notes |
|---|-------|--------|-------|
|2.2.1| Tier badges reflect user state (Free: 1 file/100MB, Pro: 3 files/500MB) | | |
|2.2.2| Preset dropdown lists default presets + locks Pro-only entries | | |
|2.2.3| Project select lists “My Uploads”/user projects; disabled when unauthenticated | | |
|2.2.4| Drag-drop target highlights on hover/drag and opens file picker when clicked | | |
|2.2.5| Supported file types accepted; unsupported extension triggers toast | | |
|2.2.6| File size validation enforces limits with descriptive toast | | |
|2.2.7| Multi-upload gating: unauthenticated prompts sign-in modal, free users limited to 1 file, Pro up to 3 | | |
|2.2.8| Upload progress shows spinner + success toast; errors show destructive toast | | |

### 2.3 Upgrade CTA Card

| # | Check | Status | Notes |
|---|-------|--------|-------|
|2.3.1| Gradient card only visible to free users | | |
|2.3.2| Lists all Pro perks (projects, file size, presets, preview, ZIP, etc.) | | |
|2.3.3| “Upgrade to Pro” button opens pricing modal | | |

### 2.4 Presets & Settings

| # | Check | Status | Notes |
|---|-------|--------|-------|
|2.4.1| Accordion toggle animates open/close without layout glitches | | |
|2.4.2| Output Format select enabled for Pro, locked indicator for free | | |
|2.4.3| Quick Presets buttons apply values + lock icon for Pro options | | |
|2.4.4| Saved Presets grid shows custom entries (Pro) with delete button | | |
|2.4.5| Custom Settings sliders update labels, maintain bounds (-60 to -10 dB, 0.1–2 s) | | |
|2.4.6| Save-as-preset flow validates name, shows loader, success/error toast | | |
|2.4.7| “Save to Project” persists settings (verify API response) | | |
|2.4.8| “Reprocess Project Files” disabled until files exist; triggers toast on start | | |

### 2.5 Projects & Files

| # | Check | Status | Notes |
|---|-------|--------|-------|
|2.5.1| “Your Projects” header shows tier badge (e.g., `1/1 projects`) | | |
|2.5.2| New Project button toggles inline input; validation errors handled | | |
|2.5.3| Project card summary displays counts for total/completed/processing | | |
|2.5.4| Favorite star toggles visual state + persists (check reload) | | |
|2.5.5| Delete project prompt appears; confirmed deletes remove card | | |
|2.5.6| File rows show correct icons, metadata, status badges | | |
|2.5.7| Processing files show loader/progress; completed files show duration + actions | | |
|2.5.8| Preview button plays audio; toggling stops playback | | |
|2.5.9| Download button hits `/api/files/:id/download` and returns file | | |
|2.5.10| Delete file prompts confirmation and refreshes list | | |
|2.5.11| Waveform preview renders for Pro users only (no errors when absent) | | |
|2.5.12| Bulk download button visible for Pro with completed files; returns ZIP | | |

### 2.6 Pricing Modal & Billing

| # | Check | Status | Notes |
|---|-------|--------|-------|
|2.6.1| Upgrade CTA opens modal with fetched product data (handles missing data gracefully) | | |
|2.6.2| Monthly/yearly cards show correct price + savings badge | | |
|2.6.3| Subscribe button hits `/api/stripe/checkout` and redirects to Checkout URL | | |
|2.6.4| Modal close button/backdrop click dismisses modal without errors | | |

### 2.7 Auth Modal

| # | Check | Status | Notes |
|---|-------|--------|-------|
|2.7.1| Sign-in modal opens when gated actions attempted unauthenticated | | |
|2.7.2| Closing modal restores prior scroll position/focus | | |

## 3. Marketing & Content Pages

### 3.1 About (`/about`)

| # | Check | Status | Notes |
|---|-------|--------|-------|
|3.1.1| Hero gradient text renders cleanly with mission subtitle | | |
|3.1.2| Three feature cards align in grid (stack on mobile) with icons | | |
|3.1.3| Mission card paragraphs use muted text and proper spacing | | |

### 3.2 Blog Listing (`/blog`)

| # | Check | Status | Notes |
|---|-------|--------|-------|
|3.2.1| Blog hero loads with CTA copy and no layout issues | | |
|3.2.2| Blog cards show category badge, formatted date, title, excerpt | | |
|3.2.3| Hover/focus states indicate cards are clickable; route to `/blog/:id` | | |

### 3.3 Blog Detail (`/blog/:id`)

| # | Check | Status | Notes |
|---|-------|--------|-------|
|3.3.1| Unknown IDs render “Post not found” with Back button | | |
|3.3.2| Valid posts show metadata (category/date/author/read time) | | |
|3.3.3| Markdown content renders headings, paragraphs, bullet lists correctly | | |
|3.3.4| “Get Started Free” CTA returns user to home | | |

### 3.4 Contact (`/contact`)

| # | Check | Status | Notes |
|---|-------|--------|-------|
|3.4.1| Hero copy + supporting text present | | |
|3.4.2| Email & Social cards display icons, copy, and Instagram link works | | |
|3.4.3| Contact form validates required fields, shows inline errors | | |
|3.4.4| Submit triggers `/api/contact`; success toast + form reset, error toast on failure | | |

## 4. Authentication Flow (`/auth/callback`)

| # | Check | Status | Notes |
|---|-------|--------|-------|
|4.1| Page logs tokens from Auth0 hash and stores them in localStorage | | |
|4.2| POST to `/api/auth/auth0-callback` succeeds and redirects home | | |
|4.3| Error states show alert + redirect gracefully | | |
|4.4| Loading spinner + copy remain visible until redirect completes | | |

## 5. Error States & Misc

| # | Check | Status | Notes |
|---|-------|--------|-------|
|5.1| `/404` or unknown routes show Not Found card with hint text | | |
|5.2| Instagram link uses `target="_blank"` + `rel="noopener noreferrer"` everywhere | | |
|5.3| Responsive layouts tested at 375px, 768px, 1024px, 1440px with no major overflow | | |

## 6. Running the Audit

1. **Environment setup**: ensure latest deploy of quietcutter.com is accessible; log in with both free and Pro accounts (or toggle via backend) for tier-specific checks.
2. **Device/viewport matrix**: Desktop (1440px), Tablet (1024px), Mobile (375px). Test on Safari + Chrome if possible.
3. **Execution order**: work through tables top-to-bottom, noting regressions in the “Notes” column with reproduction steps.
4. **Evidence capture**: screenshot any visual issues; record HAR logs or console errors for functional failures.
5. **Report**: summarize ✅/⚠️ counts, highlight blockers, attach screenshots/logs, and link to related issues.

Update this checklist whenever features/UI change so future audits stay accurate.
