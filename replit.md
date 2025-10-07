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
- `VideoHistoryPanel`: Displays all video jobs with integrated folder sidebar for organization
- `FolderSidebar`: Hierarchical folder tree with expand/collapse, video counts, and context menus
- `FolderDialog`: Modal for creating and renaming folders with color customization
- `VideoCard`: Individual video job card with status, progress, video player, and move-to-folder dropdown

### Backend Architecture

**Runtime**: Node.js with Express.js

**API Design**: RESTful API with the following endpoints:
- `POST /api/videos` - Create new video generation job (with optional folderId)
- `GET /api/videos` - Retrieve all video jobs
- `GET /api/videos/:id` - Retrieve specific video job
- `PATCH /api/videos/:id/folder` - Move video to a folder
- `POST /api/enhance-prompt` - Enhance video prompts using Claude Sonnet 4.5
- `GET /api/folders` - Retrieve all folders
- `POST /api/folders` - Create new folder
- `PATCH /api/folders/:id` - Rename/update folder
- `DELETE /api/folders/:id` - Delete folder (reassigns videos and subfolders to parent)
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
  - Fields: id (UUID), prompt, status, progress, videoId, videoUrl, thumbnailUrl, errorMessage, model, size, seconds, folderId, timestamps
- `folders` table for hierarchical video organization
  - Fields: id (UUID), name, parentId (nullable, for hierarchy), color (nullable), timestamps
  - Supports unlimited nesting with parent-child relationships

**Job Statuses**: 
- `queued` - Job submitted and waiting
- `in_progress` - Job being processed by OpenAI
- `completed` - Video successfully generated
- `failed` - Job failed with error message

**Video Organization**:
- Videos can be organized into hierarchical folders with unlimited nesting
- Special views: "All Videos" (shows all), "Uncategorized" (shows videos without folder)
- Videos can be moved between folders at any time via dropdown menu
- Folders display video counts and can be color-coded
- Deleting a folder safely reassigns all videos and subfolders to the parent folder

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