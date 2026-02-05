# replit.md

## Overview

This is an audio project management application built with a React frontend and Express backend. The application allows users to create and manage audio projects with configurable silence detection parameters (silence threshold and minimum silence duration). Projects are stored in a PostgreSQL database and can be created, viewed, listed, and deleted through a REST API.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript
- **Build Tool**: Vite with HMR support
- **Routing**: Wouter (lightweight React router)
- **State Management**: TanStack React Query for server state
- **UI Components**: shadcn/ui component library built on Radix UI primitives
- **Styling**: Tailwind CSS with custom CSS variables for theming (light/dark mode support)
- **Path Aliases**: `@/` maps to `client/src/`, `@shared/` maps to `shared/`

### Backend Architecture
- **Framework**: Express 5 with TypeScript
- **Runtime**: Node.js with tsx for TypeScript execution
- **API Design**: RESTful endpoints defined in `shared/routes.ts` with Zod validation
- **Database ORM**: Drizzle ORM with PostgreSQL dialect
- **Development**: Vite middleware integration for HMR during development
- **Production**: esbuild bundles server code with selective dependency bundling for faster cold starts

### Shared Code
- **Location**: `shared/` directory contains code used by both frontend and backend
- **Schema**: `shared/schema.ts` defines database tables using Drizzle and exports Zod schemas
- **Routes**: `shared/routes.ts` defines API contracts with input/output schemas for type safety

### Data Storage
- **Database**: PostgreSQL via `DATABASE_URL` environment variable
- **Schema Management**: Drizzle Kit for migrations (`npm run db:push`)
- **Tables**: `projects` table with fields for name, original file name, status, silence threshold, and min silence duration

### Build Process
- **Development**: `npm run dev` runs tsx with Vite middleware
- **Production Build**: `npm run build` uses custom script that:
  1. Builds frontend with Vite to `dist/public`
  2. Bundles server with esbuild to `dist/index.cjs`
  3. Selectively bundles common dependencies for faster cold starts

## External Dependencies

### Database
- **PostgreSQL**: Primary data store, connection via `DATABASE_URL` environment variable
- **Drizzle ORM**: Type-safe database queries with PostgreSQL dialect
- **connect-pg-simple**: PostgreSQL session store (available but not currently used)

### UI Framework
- **Radix UI**: Headless component primitives for accessibility
- **shadcn/ui**: Pre-built component library (new-york style variant)
- **Tailwind CSS**: Utility-first CSS framework
- **Lucide React**: Icon library

### API & Validation
- **Zod**: Runtime type validation for API inputs/outputs
- **drizzle-zod**: Generates Zod schemas from Drizzle table definitions

### Development Tools
- **Vite**: Frontend build tool and dev server
- **esbuild**: Fast server bundling for production
- **tsx**: TypeScript execution for Node.js

### Replit-specific
- **@replit/vite-plugin-runtime-error-modal**: Error overlay in development
- **@replit/vite-plugin-cartographer**: Code navigation tooling
- **@replit/vite-plugin-dev-banner**: Development environment indicator