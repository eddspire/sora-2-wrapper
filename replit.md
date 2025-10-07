# Sora 2 Pro Video Generator

## Overview

This is an AI video generation application that uses OpenAI's Sora 2 Pro model to create videos from text prompts. Users can submit video generation requests, which are queued and processed asynchronously. The application provides real-time status updates and allows users to view, download, and manage their generated videos.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework**: React with TypeScript using Vite as the build tool

**UI Component System**: Shadcn/ui with Radix UI primitives
- Utility-first approach using Tailwind CSS
- Design system inspired by Linear (typography/spacing), Notion (input styling), and Material Design (progress feedback)
- Dark mode primary theme with carefully crafted color palette for video generation workflow
- Responsive layout supporting mobile and desktop viewports

**State Management**: 
- TanStack Query (React Query) for server state management with automatic refetching every 3 seconds to poll for job updates
- React hooks for local component state

**Routing**: Wouter for lightweight client-side routing

**Key UI Components**:
- `PromptInput`: Text area for entering video generation prompts with character validation (10-1000 chars) and AI-powered prompt enhancement
- `QueueDashboard`: Real-time statistics display showing queued, processing, completed, and failed jobs
- `VideoGrid`: Displays all video jobs in a responsive grid layout
- `VideoCard`: Individual video job card showing status, progress, and video player when complete

### Backend Architecture

**Runtime**: Node.js with Express.js

**API Design**: RESTful API with the following endpoints:
- `POST /api/videos` - Create new video generation job
- `GET /api/videos` - Retrieve all video jobs
- `GET /api/videos/:id` - Retrieve specific video job
- `POST /api/enhance-prompt` - Enhance video prompts using Claude Sonnet 4.5
- `GET /objects/*` - Serve video and thumbnail files from object storage

**Queue System**: Custom `VideoQueueManager` class
- Processes jobs sequentially (user-configurable max concurrent jobs, default: 1)
- Exponential backoff polling (15s → 60s max) to minimize OpenAI API costs (reduces calls by 90%)
- Smart retry logic that reuses existing OpenAI video IDs instead of creating duplicates (prevents multiple charges)
- 20-minute timeout with auto-recovery: checks OpenAI status on timeout and auto-downloads if complete
- Automatic status updates in database throughout job lifecycle

**Data Validation**: Zod schemas for request validation with Drizzle integration

### Database Architecture

**ORM**: Drizzle ORM with Neon serverless PostgreSQL

**Schema Design**:
- `video_jobs` table tracking all generation requests
- Fields: id (UUID), prompt, status, progress, videoId, videoUrl, thumbnailUrl, errorMessage, model, size, seconds, timestamps

**Job Statuses**: 
- `queued` - Job submitted and waiting
- `in_progress` - Job being processed by OpenAI
- `completed` - Video successfully generated
- `failed` - Job failed with error message

### File Storage Architecture

**Provider**: Google Cloud Storage

**Organization**:
- Private directory structure (`.private/videos/` and `.private/thumbnails/`)
- Videos stored as `.mp4` files
- Thumbnails stored as `.jpg` files
- Files served through Express proxy endpoint for access control

**Storage Service**: `ObjectStorageService` class handling upload operations and serving files through Express middleware

## External Dependencies

### Third-Party APIs

**OpenAI API** (Sora 2 Pro):
- Video generation using `openai.videos.create()`
- Status checking via `openai.videos.retrieve()`
- Content download via `openai.videos.downloadContent()`
- Supports configurable model, size (1280x720 default), and duration (8 seconds default)

**Anthropic API** (Claude Sonnet 4.5):
- Prompt enhancement service using `claude-sonnet-4-20250514` model
- Improves user prompts for better Sora 2 video generation results
- Provides shot type, lighting, and compositional guidance

### Cloud Services

**Neon Database**:
- Serverless PostgreSQL with WebSocket support
- Connection pooling via `@neondatabase/serverless`
- Database URL configured via `DATABASE_URL` environment variable

**Google Cloud Storage**:
- Object storage for generated videos and thumbnails
- Bucket ID configured via `DEFAULT_OBJECT_STORAGE_BUCKET_ID` environment variable
- Private directory path via `PRIVATE_OBJECT_DIR` environment variable

### Key NPM Packages

**Backend**:
- `express` - Web server framework
- `drizzle-orm` - TypeScript ORM
- `openai` - OpenAI API client
- `@anthropic-ai/sdk` - Anthropic Claude API client
- `@google-cloud/storage` - GCS client
- `zod` - Schema validation
- `ws` - WebSocket support for Neon

**Frontend**:
- `react` & `react-dom` - UI framework
- `@tanstack/react-query` - Server state management
- `wouter` - Routing
- `@radix-ui/*` - Headless UI primitives
- `tailwindcss` - Utility-first CSS
- `date-fns` - Date formatting
- `lucide-react` - Icon library

**Development**:
- `vite` - Build tool and dev server
- `typescript` - Type safety
- `drizzle-kit` - Database migrations
- `esbuild` - Production bundling