# 🎬 Sora 2 Pro Video Generator

An AI-powered video generation application built with OpenAI's Sora 2 Pro model. Create stunning videos from text prompts, remix existing videos, and organize your content with hierarchical folders.

![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=flat&logo=typescript&logoColor=white)
![React](https://img.shields.io/badge/React-20232A?style=flat&logo=react&logoColor=61DAFB)
![Node.js](https://img.shields.io/badge/Node.js-43853D?style=flat&logo=node.js&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=flat&logo=postgresql&logoColor=white)

## ✨ Features

- **🎥 AI Video Generation** - Create videos from text prompts using OpenAI's Sora 2 and Sora 2 Pro models
- **🔄 Video Remix** - Transform existing videos with new prompts and styles
- **📁 Folder Organization** - Hierarchical folder system with unlimited nesting and color customization
- **⚡ Smart Queue Management** - Automatic job queue with intelligent retry logic and exponential backoff
- **🪄 AI Prompt Enhancement** - Optimize prompts using Claude Sonnet 4.5 for better results
- **🔔 Webhook Notifications** - Get real-time notifications when videos complete or fail
- **💰 Cost Tracking** - Real-time cost estimation and detailed breakdown
- **🎨 Beautiful UI** - Dark mode interface with gradient accents and smooth animations
- **🌐 Open Access** - No authentication required, ready to use immediately

## 🚀 Quick Start

### Step 1: Import to Replit (Choose One Method)

**🎯 For Non-Coders - Rapid Import (Easiest!)**

1. Click this link to automatically import: **[Import to Replit](https://replit.com/github.com/eddspire/sora-2-wrapper)**
2. Or manually paste this URL in your browser: `https://replit.com/github.com/eddspire/sora-2-wrapper`
3. Press **Enter** - Replit will automatically import everything!

**🛠️ Alternative - Guided Import (More Control)**

1. Go to: [replit.com/import](https://replit.com/import)
2. Click **GitHub** as the import source
3. Connect your GitHub account (if not already connected)
4. Select this repository from your list
5. Click **Import** to begin

### Step 2: Automatic Setup with Replit Agent

Once imported, the magic happens:

1. **Open Replit Agent** (AI icon in the sidebar)
2. **Paste this setup prompt:**

```
Please set up this Sora 2 Pro Video Generator application for me:

1. Create a PostgreSQL database for the app
2. Set up Replit Object Storage for storing videos and thumbnails
3. Run database migrations to create all necessary tables (video_jobs, folders, webhooks, settings) using: npm run db:push
4. Ask me for the required API keys:
   - OPENAI_API_KEY (for Sora 2 video generation)
   - ANTHROPIC_API_KEY (for AI prompt enhancement)
5. Start the application workflow

After setup is complete, let me know the app is ready to use!
```

3. **Provide API Keys** - Agent will ask for your OpenAI and Anthropic API keys (see below for how to get them)
4. **Done!** - Agent creates database, storage, and starts your app automatically

### Prerequisites

- Replit account (free tier works!)
- OpenAI API key with Sora 2 access
- Anthropic API key for prompt enhancement

### For Developers - Local Setup

**Note:** Running locally requires PostgreSQL database + Google Cloud Storage setup.

```bash
# Install dependencies
npm install

# Set up environment variables
# Create a .env file with:
# OPENAI_API_KEY=sk-...
# ANTHROPIC_API_KEY=sk-ant-...
# DATABASE_URL=postgresql://...
# DEFAULT_OBJECT_STORAGE_BUCKET_ID=...
# PRIVATE_OBJECT_DIR=.private

# Run database migrations
npm run db:push

# Start development server
npm run dev
```

## 🔑 Getting API Keys

### OpenAI API Key
1. Visit [OpenAI Platform](https://platform.openai.com/api-keys)
2. Create a new secret key
3. **Important**: Add credits to your account for Sora 2 usage

### Anthropic API Key
1. Visit [Anthropic Console](https://console.anthropic.com/)
2. Navigate to API Keys
3. Create a new key

## 📖 Usage

### Creating Videos

1. Enter a video prompt (minimum 10 characters, no maximum)
2. Select your model:
   - **Sora 2 Pro** - Premium quality, faster generation
   - **Sora 2** - Standard quality, cost-effective
3. Choose resolution (720p or 1080p)
4. Select duration (4, 8, or 12 seconds)
5. Optional: Upload an image/video reference
6. Click "Generate Video"

### Remixing Videos

1. Switch to "Remix" mode
2. Select a completed video as source
3. Describe your modifications
4. Generate the remixed version

### Organizing with Folders

- Create folders from the sidebar
- Drag videos into folders
- Nest folders for hierarchical organization
- Color-code folders for easy identification
- View all videos or filter by folder

### Setting Up Webhooks

1. Navigate to the Webhooks page
2. Add your webhook URL
3. Select events (completed/failed)
4. Receive real-time notifications

## 🛠️ Tech Stack

### Frontend
- **React** - UI framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **Shadcn/ui** - UI components
- **TanStack Query** - Server state management
- **Wouter** - Routing

### Backend
- **Node.js + Express** - Server
- **PostgreSQL** - Database (Neon serverless)
- **Drizzle ORM** - Type-safe database access
- **OpenAI API** - Video generation
- **Anthropic API** - Prompt enhancement

### Infrastructure
- **Replit Object Storage** - Video/thumbnail storage
- **WebSocket** - Real-time updates
- **Zod** - Schema validation

## 💰 Pricing

Video generation costs are based on OpenAI's pricing:

| Model | Resolution | Duration | Estimated Cost |
|-------|-----------|----------|---------------|
| Sora 2 Pro | 1280x720 | 8s | ~$0.25 |
| Sora 2 Pro | 1792x1024 | 8s | ~$0.35 |
| Sora 2 | 1280x720 | 8s | ~$0.15 |

The app displays real-time cost estimates before generation.

## 📁 Project Structure

```
├── client/               # React frontend
│   ├── src/
│   │   ├── components/  # UI components
│   │   ├── pages/       # Page components
│   │   └── lib/         # Utilities
├── server/              # Express backend
│   ├── routes.ts        # API routes
│   ├── queueManager.ts  # Job queue
│   ├── storage.ts       # Database layer
│   └── openai.ts        # OpenAI integration
├── shared/              # Shared types
│   └── schema.ts        # Database schema
└── SETUP.md            # Detailed setup guide
```

## 🔄 Queue System

The application includes an intelligent queue manager:

- **Sequential Processing** - Configurable concurrent job limit
- **Smart Retry Logic** - Reuses existing OpenAI video IDs to avoid duplicate charges
- **Exponential Backoff** - Reduces API calls by up to 90%
- **Auto-Recovery** - 20-minute timeout with automatic status checking
- **Real-time Updates** - Live progress tracking with 3-second polling

## 🤝 Contributing

Contributions are welcome! Feel free to:

- Report bugs
- Suggest new features
- Submit pull requests
- Improve documentation

## 📄 License

This project is open source and available under the MIT License.

## 🙏 Acknowledgments

- [OpenAI](https://openai.com/) for the Sora 2 API
- [Anthropic](https://anthropic.com/) for Claude AI
- [Replit](https://replit.com/) for the development platform
- [Shadcn/ui](https://ui.shadcn.com/) for the beautiful components

## 📞 Support

For issues and questions:
- Open an issue on GitHub
- Check [SETUP.md](./SETUP.md) for detailed setup instructions
- Review the [OpenAI Sora Documentation](https://platform.openai.com/docs/guides/video)

---

**Built with ❤️ using Replit Agent**

[![Deploy on Replit](https://replit.com/badge/github/yourusername/sora-video-generator)](https://replit.com/@yourusername/sora-video-generator)
