# 🎬 Sora 2 Pro Video Generator - Setup Guide

Welcome! This is an AI video generation app powered by OpenAI's Sora 2 Pro. Follow the setup prompt below to get started.

---

## 📋 Setup Prompt for Replit Agent

Copy and paste this prompt into Replit Agent to automatically set up your application:

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

---

## 🔑 Getting Your API Keys

### OpenAI API Key (Required)
1. Go to [OpenAI Platform](https://platform.openai.com/api-keys)
2. Sign in or create an account
3. Click "Create new secret key"
4. Copy the key (starts with `sk-`)
5. **Important**: Add credits to your OpenAI account for Sora 2 usage

### Anthropic API Key (Required)
1. Go to [Anthropic Console](https://console.anthropic.com/)
2. Sign in or create an account
3. Navigate to API Keys section
4. Create a new API key
5. Copy the key

---

## ✨ Features Included

- **AI Video Generation**: Create videos from text prompts using Sora 2 Pro
- **Video Remix**: Transform existing videos with new prompts
- **Folder Organization**: Hierarchical folders with unlimited nesting
- **Queue Management**: Automatic job queue with smart retry logic
- **Prompt Enhancement**: AI-powered prompt optimization using Claude
- **Webhook Support**: Get notifications when videos complete
- **Cost Tracking**: Real-time cost estimation and tracking
- **Dark Mode UI**: Beautiful gradient-based interface

---

## 🚀 What Happens During Setup

The Replit Agent will:
1. ✅ Create a PostgreSQL database (Neon serverless)
2. ✅ Set up Replit Object Storage for video files
3. ✅ Create database tables: `video_jobs`, `folders`, `webhooks`, `settings`
4. ✅ Configure environment variables and secrets
5. ✅ Install all dependencies
6. ✅ Start the development server

---

## 📝 After Setup

Once setup is complete:
1. Open the app in your browser
2. Enter a video prompt (minimum 10 characters)
3. Select model (Sora 2 Pro or Sora 2), resolution, and duration
4. Click "Generate Video" to create your first AI video!

Optional features:
- Create folders to organize videos
- Set up webhooks for job notifications
- Use the Remix feature to transform existing videos
- Enhance prompts with AI for better results

---

## 💰 Pricing Info

Sora 2 video generation uses OpenAI credits:
- **Sora 2 Pro**: ~$0.20-0.40 per video (4-12 seconds)
- **Sora 2**: ~$0.10-0.20 per video (4-12 seconds)

Costs vary based on resolution and duration. The app shows estimated costs before generation.

---

## 🛟 Troubleshooting

**Issue**: "API key not found"  
**Solution**: Make sure you've added both API keys when prompted

**Issue**: "Database connection failed"  
**Solution**: The database should be created automatically. Try restarting the workflow.

**Issue**: "Video generation fails"  
**Solution**: Check your OpenAI account has sufficient credits

---

## 📚 Learn More

- [OpenAI Sora Documentation](https://platform.openai.com/docs/guides/video)
- [Anthropic Claude API](https://docs.anthropic.com/)

---

**Ready to create AI videos? Copy the setup prompt above and paste it into Replit Agent!** 🎥✨
