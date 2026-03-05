# QuietCutter - Audio/Video Silence Removal Application

## Overview

QuietCutter is a fully functional audio/video silence removal application with a dark navy UI. Users can sign in with email/password or Auth0 (Google), upload audio files (MP3, WAV, OGG, FLAC, M4A) or video files (MP4, MOV, AVI, MKV, WEBM), select quick presets or customize silence detection settings, and download processed files. The app includes multi-file project management with favorites, contact form, blog pages, and Stripe Pro subscription.

## User Preferences

- Preferred communication style: Simple, everyday language
- Design: Dark-only theme with "Outfit" font for branding
- Slogan: "— MAKE EVERY SECOND COUNT —" (no period)
- "Checklist" always means a manual testing checklist for the user to test features themselves
- Always verify information against the actual codebase before sending messages — don't assume features exist or list things that aren't in the app

## Key Features

1. **Authentication**: Email/password login + Auth0 OAuth (Google)
2. **File Upload**: Audio and video file upload with multer (max 100MB free / 500MB Pro)
3. **Audio Processing**: FFmpeg silence removal with configurable threshold and duration
4. **Video Processing**: FFmpeg extracts audio from video files, processes silence removal, outputs processed audio
5. **Batch Upload**: Pro subscribers can upload up to 3 files simultaneously
6. **Multi-File Projects**: Projects are containers holding multiple files. Users can create named projects, add files to them, and manage files individually.
7. **Project-Level Settings**: Each project stores its own silence threshold, min silence duration, and output format. Switching projects auto-loads that project's settings. Users can save current settings to a project and reprocess all files with updated settings.
8. **Stripe Integration**: Pro upgrade subscription checkout ($9.99/month or $79.99/year)
9. **Contact Form**: Saves to database and sends email to support@quietcutter.com via Resend
10. **Blog**: Individual blog post pages with full content (4 posts)
11. **Security**: User-scoped projects, ownership checks on all modifications

## Free vs. Pro Features

### Free Users
- 1 project stored at a time (auto-replaces oldest)
- 100MB file size limit
- 2 quick presets (Podcast, Lecture)
- MP3 output only
- Single file upload
- No audio preview or waveform

### Pro Users ($9.99/mo or $79.99/yr)
- Unlimited project history
- 500MB file size limit
- All 4 quick presets + custom saved presets
- Output format options: MP3 (320k), WAV, FLAC
- Batch upload up to 3 files
- Priority processing queue
- Audio preview player for completed files
- Waveform visualization (wavesurfer.js)
- Bulk download all files as ZIP
- Pro badge on profile

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript
- **Build Tool**: Vite with HMR support
- **Routing**: Wouter (lightweight React router)
- **State Management**: TanStack React Query for server state
- **UI Components**: shadcn/ui component library built on Radix UI primitives
- **Styling**: Tailwind CSS with dark navy theme
- **Waveform**: wavesurfer.js for audio waveform visualization
- **Path Aliases**: `@/` maps to `client/src/`, `@shared/` maps to `shared/`
- **Layout**: Single-page layout with project dropdown selector, inline file list (no sidebar)

### Backend Architecture
- **Framework**: Express 5 with TypeScript
- **Runtime**: Node.js with tsx for TypeScript execution
- **Authentication**: Passport.js local strategy + Auth0 OAuth callback, sessions via connect-pg-simple
- **File Upload**: Multer for audio/video file handling
- **Audio Processing**: FFmpeg for silence removal with output format support
- **Video Processing**: FFmpeg extracts audio from video before silence removal
- **Priority Queue**: Pro files processed before free user files
- **Payments**: Stripe integration with direct webhook handling
- **Bulk Download**: archiver for ZIP downloads
- **Database ORM**: Drizzle ORM with PostgreSQL dialect

### Database Schema
- **users**: User accounts with email/password or OAuth
- **sessions**: Auth session management (connect-pg-simple)
- **projects**: Named containers with userId, name, isFavorite, silenceThreshold, minSilenceDuration, outputFormat, createdAt
- **project_files**: Individual files within projects with originalFileName, filePath, processedFilePath, status, settings, durations, fileType, fileSizeBytes
- **custom_presets**: User-saved presets with threshold and duration settings (Pro only)
- **contact_messages**: Contact form submissions
- **subscriptions**: Stripe subscription tracking with userId, stripeCustomerId, stripeSubscriptionId, status, currentPeriodEnd

### API Endpoints
- `GET /api/projects` - List user's projects (with nested files array)
- `GET /api/projects/:id` - Get single project with files
- `POST /api/projects` - Create empty project container
- `PATCH /api/projects/:id` - Update project (name, favorite, settings)
- `DELETE /api/projects/:id` - Delete project and all its files
- `GET /api/projects/favorites` - List user's favorite projects
- `POST /api/upload` - Upload file(s) to a project (creates project if no projectId given)
- `GET /api/files/:id/download` - Download processed file
- `GET /api/files/:id/preview` - Stream processed audio for preview (Pro only)
- `DELETE /api/files/:id` - Delete individual file from project
- `GET /api/projects/bulk-download` - Download all completed files as ZIP (Pro only)
- `POST /api/projects/:id/reprocess` - Reprocess all files in project with project's settings
- `PATCH /api/projects/:id/favorite` - Toggle favorite status
- `GET /api/subscription/status` - Check if user has active Pro subscription
- `GET /api/presets` - List user's custom presets
- `POST /api/presets` - Save a custom preset (Pro only)
- `DELETE /api/presets/:id` - Delete a custom preset
- `POST /api/contact` - Submit contact form
- `GET /api/stripe/products` - List Stripe products
- `POST /api/stripe/checkout` - Create Stripe checkout session
- `POST /api/stripe/webhook` - Stripe webhook endpoint

### Audio/Video Processing Pipeline
1. User uploads audio/video file(s) via `/api/upload`
2. File size validated (100MB free / 500MB Pro)
3. If projectId provided, files added to existing project; otherwise new project created
4. Free users: oldest project auto-deleted if at 1-project limit
5. File(s) saved to `/uploads` directory with unique name
6. ProjectFile records created in database with status "pending"
7. Jobs added to priority queue (Pro jobs skip ahead of free)
8. For video files: FFmpeg extracts audio to WAV first (`-vn -acodec pcm_s16le`)
9. FFmpeg processes audio with silenceremove filter
10. Output format determined by subscription (MP3 for free, user-selected for Pro)
11. Pro MP3 exports at 320kbps, WAV/FLAC lossless
12. Extracted audio temp file cleaned up (for video inputs)
13. ProjectFile status updated to "completed"
14. User can download or preview via API

### Subscription Check
- Pro status determined by querying `subscriptions` table where `userId` matches and `status = 'active'`
- Active subscription status required for Pro features
- Shared `checkIsPro()` helper used across all Pro-gated endpoints

## External Dependencies

### Integrations
- **Auth0**: OAuth authentication (Google sign-in)
- **Stripe**: Payment processing for Pro subscriptions
- **Resend**: Transactional email for contact form
- **FFmpeg**: Audio/video processing for silence removal

### Database
- **PostgreSQL**: Primary data store via `DATABASE_URL`
- **Drizzle ORM**: Type-safe database queries

### UI Framework
- **Radix UI**: Headless component primitives
- **shadcn/ui**: Pre-built component library
- **Tailwind CSS**: Utility-first CSS framework
- **Lucide React**: Icon library
- **wavesurfer.js**: Audio waveform visualization

### Packages
- **archiver**: ZIP file creation for bulk download

## Quick Presets
- Podcast: -35dB threshold, 500ms duration (free)
- Lecture: -45dB threshold, 600ms duration (free)
- Screen Recording: -40dB threshold, 400ms duration (Pro)
- Interview: -38dB threshold, 450ms duration (Pro)

## Environment Variables

### Required
- `DATABASE_URL` - PostgreSQL connection string
- `STRIPE_SECRET_KEY` - Stripe secret API key
- `STRIPE_PUBLISHABLE_KEY` - Stripe publishable API key
- `STRIPE_WEBHOOK_SECRET` - Stripe webhook signing secret

### Optional
- `SESSION_SECRET` - Session encryption secret (defaults to fallback)
- `RESEND_API_KEY` - Resend API key for contact form emails
- `RESEND_FROM_EMAIL` - Sender email address
- `VITE_AUTH0_DOMAIN` - Auth0 domain for OAuth
- `VITE_AUTH0_CLIENT_ID` - Auth0 client ID for OAuth
- `RAILWAY_PUBLIC_DOMAIN` - Auto-set by Railway for domain detection

## Development

### Commands
- `npm run dev` - Start development server
- `npm run db:push` - Push database schema changes
- `npx tsx scripts/seed-stripe-products.ts` - Create Stripe products

### File Structure
- `client/src/pages/` - React page components
- `server/auth/` - Authentication setup, routes, and storage
- `server/routes.ts` - Express API routes
- `server/storage.ts` - Database operations
- `server/stripeClient.ts` - Stripe client setup
- `server/stripeService.ts` - Stripe service operations
- `server/webhookHandlers.ts` - Stripe webhook event processing
- `shared/schema.ts` - Database schema definitions
- `shared/routes.ts` - API route definitions and response types
