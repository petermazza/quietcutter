# QuietCutter - Audio Silence Removal Application

## Overview

QuietCutter is a fully functional audio silence removal application with a dark navy UI. Users can sign in with Replit Auth (Google, GitHub, email), upload audio files (MP3, WAV, OGG, FLAC, M4A), select quick presets or customize silence detection settings, and download processed audio files. The app includes project management with favorites, history tracking, contact form, and blog pages.

## User Preferences

- Preferred communication style: Simple, everyday language
- Design: Dark-only theme with "Outfit" font for branding
- Slogan: "— MAKE EVERY SECOND COUNT —" (no period)

## Key Features

1. **Authentication**: Replit Auth for sign-in/sign-up (Google, GitHub, email)
2. **File Upload**: Audio file upload with multer (max 500MB)
3. **Audio Processing**: FFmpeg silence removal with configurable threshold and duration
4. **Project Management**: History, favorites, download processed files
5. **Stripe Integration**: Pro upgrade subscription checkout ($9.99/month or $79.99/year)
6. **Contact Form**: Saves to database
7. **Blog**: Individual blog post pages with full content
8. **Security**: User-scoped projects, ownership checks on all modifications

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript
- **Build Tool**: Vite with HMR support
- **Routing**: Wouter (lightweight React router)
- **State Management**: TanStack React Query for server state
- **UI Components**: shadcn/ui component library built on Radix UI primitives
- **Styling**: Tailwind CSS with dark navy theme
- **Path Aliases**: `@/` maps to `client/src/`, `@shared/` maps to `shared/`

### Backend Architecture
- **Framework**: Express 5 with TypeScript
- **Runtime**: Node.js with tsx for TypeScript execution
- **Authentication**: Replit Auth with session management
- **File Upload**: Multer for audio file handling
- **Audio Processing**: FFmpeg for silence removal
- **Payments**: Stripe integration with stripe-replit-sync
- **Database ORM**: Drizzle ORM with PostgreSQL dialect

### Database Schema
- **users**: User accounts (from Replit Auth)
- **sessions**: Auth session management
- **projects**: Audio projects with userId, file paths, status, favorites
- **contact_messages**: Contact form submissions
- **stripe.*** : Stripe-managed schema for products, prices, customers

### API Endpoints
- `GET /api/projects` - List user's projects
- `GET /api/projects/favorites` - List user's favorite projects
- `POST /api/upload` - Upload audio file for processing
- `GET /api/projects/:id/download` - Download processed file
- `PATCH /api/projects/:id/favorite` - Toggle favorite status
- `DELETE /api/projects/:id` - Delete project
- `POST /api/contact` - Submit contact form
- `GET /api/stripe/products` - List Stripe products
- `POST /api/stripe/checkout` - Create Stripe checkout session

### Audio Processing Pipeline
1. User uploads audio file via `/api/upload`
2. File saved to `/uploads` directory with unique name
3. Project created in database with status "pending"
4. FFmpeg processes file with silenceremove filter
5. Processed file saved as `_processed.mp3`
6. Project status updated to "completed"
7. User can download via `/api/projects/:id/download`

## External Dependencies

### Integrations
- **Replit Auth**: User authentication (sign-in with Google, GitHub, email)
- **Stripe**: Payment processing for Pro subscriptions
- **FFmpeg**: Audio processing for silence removal

### Database
- **PostgreSQL**: Primary data store via `DATABASE_URL`
- **Drizzle ORM**: Type-safe database queries

### UI Framework
- **Radix UI**: Headless component primitives
- **shadcn/ui**: Pre-built component library
- **Tailwind CSS**: Utility-first CSS framework
- **Lucide React**: Icon library

## Quick Presets
- Podcast: -35dB threshold, 500ms duration
- Screen Recording: -40dB threshold, 400ms duration
- Lecture: -45dB threshold, 600ms duration
- Interview: -38dB threshold, 450ms duration

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
- `shared/schema.ts` - Database schema definitions
