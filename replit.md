# QuietCutter - Audio/Video Silence Removal Application

## Overview

QuietCutter is a fully functional audio/video silence removal application with a dark navy UI. Users can sign in with Replit Auth (Google, GitHub, email), upload audio files (MP3, WAV, OGG, FLAC, M4A) or video files (MP4, MOV, AVI, MKV, WEBM), select quick presets or customize silence detection settings, and download processed files. The app includes project management with favorites, history tracking, contact form, blog pages, and Stripe Pro subscription.

## User Preferences

- Preferred communication style: Simple, everyday language
- Design: Dark-only theme with "Outfit" font for branding
- Slogan: "— MAKE EVERY SECOND COUNT —" (no period)

## Key Features

1. **Authentication**: Replit Auth for sign-in/sign-up (Google, GitHub, email)
2. **File Upload**: Audio and video file upload with multer (max 100MB free / 500MB Pro)
3. **Audio Processing**: FFmpeg silence removal with configurable threshold and duration
4. **Video Processing**: FFmpeg extracts audio from video files, processes silence removal, outputs processed audio
5. **Batch Upload**: Pro subscribers can upload up to 3 files simultaneously
6. **Project Management**: History, favorites, download processed files
7. **Stripe Integration**: Pro upgrade subscription checkout ($9.99/month or $79.99/year)
8. **Contact Form**: Saves to database
9. **Blog**: Individual blog post pages with full content
10. **Security**: User-scoped projects, ownership checks on all modifications

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
- Audio preview player for completed projects
- Waveform visualization (wavesurfer.js)
- Bulk download all projects as ZIP
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

### Backend Architecture
- **Framework**: Express 5 with TypeScript
- **Runtime**: Node.js with tsx for TypeScript execution
- **Authentication**: Replit Auth with session management
- **File Upload**: Multer for audio/video file handling
- **Audio Processing**: FFmpeg for silence removal with output format support
- **Video Processing**: FFmpeg extracts audio from video before silence removal
- **Priority Queue**: Pro files processed before free user files
- **Payments**: Stripe integration with stripe-replit-sync
- **Bulk Download**: archiver for ZIP downloads
- **Database ORM**: Drizzle ORM with PostgreSQL dialect

### Database Schema
- **users**: User accounts (from Replit Auth)
- **sessions**: Auth session management
- **projects**: Audio/video projects with userId, file paths, status, favorites, outputFormat
- **custom_presets**: User-saved presets with threshold and duration settings (Pro only)
- **contact_messages**: Contact form submissions
- **stripe.*** : Stripe-managed schema for products, prices, customers, subscriptions

### API Endpoints
- `GET /api/projects` - List user's projects
- `GET /api/projects/favorites` - List user's favorite projects
- `POST /api/upload` - Upload audio/video file(s) for processing (supports up to 3 files for Pro users)
- `GET /api/projects/:id/download` - Download processed file
- `GET /api/projects/:id/preview` - Stream processed audio for preview (Pro only)
- `GET /api/projects/bulk-download` - Download all completed projects as ZIP (Pro only)
- `PATCH /api/projects/:id/favorite` - Toggle favorite status
- `DELETE /api/projects/:id` - Delete project
- `GET /api/subscription/status` - Check if user has active Pro subscription
- `GET /api/presets` - List user's custom presets
- `POST /api/presets` - Save a custom preset (Pro only)
- `DELETE /api/presets/:id` - Delete a custom preset
- `POST /api/contact` - Submit contact form
- `GET /api/stripe/products` - List Stripe products
- `POST /api/stripe/checkout` - Create Stripe checkout session

### Audio/Video Processing Pipeline
1. User uploads audio/video file(s) via `/api/upload`
2. File size validated (100MB free / 500MB Pro)
3. Free users: oldest project auto-deleted if at 1-project limit
4. File(s) saved to `/uploads` directory with unique name
5. Project(s) created in database with status "pending"
6. Jobs added to priority queue (Pro jobs skip ahead of free)
7. For video files: FFmpeg extracts audio to WAV first (`-vn -acodec pcm_s16le`)
8. FFmpeg processes audio with silenceremove filter
9. Output format determined by subscription (MP3 for free, user-selected for Pro)
10. Pro MP3 exports at 320kbps, WAV/FLAC lossless
11. Extracted audio temp file cleaned up (for video inputs)
12. Project status updated to "completed"
13. User can download or preview via API

### Subscription Check
- Pro status determined by querying `stripe.subscriptions` joined with `stripe.customers` via `metadata->>'userId'`
- Active subscription status required for Pro features
- Shared `checkIsPro()` helper used across all Pro-gated endpoints

## External Dependencies

### Integrations
- **Replit Auth**: User authentication (sign-in with Google, GitHub, email)
- **Stripe**: Payment processing for Pro subscriptions
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

## Development

### Commands
- `npm run dev` - Start development server
- `npm run db:push` - Push database schema changes
- `npx tsx scripts/seed-stripe-products.ts` - Create Stripe products

### File Structure
- `client/src/pages/` - React page components
- `server/routes.ts` - Express API routes
- `server/storage.ts` - Database operations
- `server/stripeClient.ts` - Stripe client setup
- `server/stripeService.ts` - Stripe service operations
- `shared/schema.ts` - Database schema definitions
