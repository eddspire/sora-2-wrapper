import type { Express } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import { storage } from "./storage";
import { queueManager } from "./queueManager";
import { ObjectStorageService, ObjectNotFoundError } from "./objectStorage";
import { insertVideoJobSchema, insertWebhookSchema, insertFolderSchema, updateSettingsSchema } from "@shared/schema";
import { z } from "zod";
import { enhancePrompt } from "./promptEnhancer";
import { requireAuth, verifyPassword } from "./auth";

// Configure multer for file uploads (memory storage)
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 } // 100MB limit
});

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Authentication endpoints (public)
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { password } = req.body;
      
      if (!password) {
        return res.status(400).json({ error: "Password is required" });
      }
      
      if (verifyPassword(password)) {
        req.session.authenticated = true;
        return res.json({ success: true, message: "Authentication successful" });
      } else {
        return res.status(401).json({ error: "Invalid password" });
      }
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ error: "Authentication failed" });
    }
  });
  
  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        console.error("Logout error:", err);
        return res.status(500).json({ error: "Logout failed" });
      }
      res.clearCookie("connect.sid");
      res.json({ success: true, message: "Logged out successfully" });
    });
  });
  
  app.get("/api/auth/status", (req, res) => {
    res.json({ authenticated: req.session?.authenticated === true });
  });
  
  // Protected routes - all API routes below require authentication
  app.use("/api", requireAuth);
  
  // Create a new video job
  app.post("/api/videos", async (req, res) => {
    try {
      const validatedData = insertVideoJobSchema.parse(req.body);
      
      // Create job in database
      const job = await storage.createVideoJob(validatedData);
      
      // Add to queue for processing
      await queueManager.addToQueue(job.id);
      
      res.status(201).json(job);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          error: "Validation error", 
          details: error.errors 
        });
      }
      console.error("Error creating video job:", error);
      res.status(500).json({ 
        error: "Failed to create video job",
        message: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Get all video jobs
  app.get("/api/videos", async (req, res) => {
    try {
      const jobs = await storage.getAllVideoJobs();
      res.json(jobs);
    } catch (error) {
      console.error("Error fetching video jobs:", error);
      res.status(500).json({ error: "Failed to fetch video jobs" });
    }
  });

  // Get a specific video job
  app.get("/api/videos/:id", async (req, res) => {
    try {
      const job = await storage.getVideoJob(req.params.id);
      if (!job) {
        return res.status(404).json({ error: "Video job not found" });
      }
      res.json(job);
    } catch (error) {
      console.error("Error fetching video job:", error);
      res.status(500).json({ error: "Failed to fetch video job" });
    }
  });

  // Retry a failed job
  app.post("/api/videos/:id/retry", async (req, res) => {
    try {
      const job = await storage.getVideoJob(req.params.id);
      if (!job) {
        return res.status(404).json({ error: "Video job not found" });
      }

      if (job.status !== "failed") {
        return res.status(400).json({ error: "Only failed jobs can be retried" });
      }

      // Reset job status to queued
      await storage.updateVideoJobStatus(job.id, "queued", 0);
      
      // Add back to queue
      await queueManager.addToQueue(job.id);

      const updatedJob = await storage.getVideoJob(job.id);
      res.json(updatedJob);
    } catch (error) {
      console.error("Error retrying video job:", error);
      res.status(500).json({ error: "Failed to retry video job" });
    }
  });

  // Remix a completed video
  app.post("/api/videos/:id/remix", async (req, res) => {
    try {
      const sourceJob = await storage.getVideoJob(req.params.id);
      if (!sourceJob) {
        return res.status(404).json({ error: "Source video not found" });
      }

      if (sourceJob.status !== "completed") {
        return res.status(400).json({ error: "Can only remix completed videos" });
      }

      const { prompt } = req.body;
      if (!prompt || typeof prompt !== "string" || prompt.trim().length < 10) {
        return res.status(400).json({ error: "Valid remix prompt is required (min 10 characters)" });
      }

      // Create new job with remix reference
      const remixJob = await storage.createVideoJob({
        prompt: prompt.trim(),
        model: sourceJob.model,
        size: sourceJob.size,
        seconds: sourceJob.seconds,
        remixOfId: sourceJob.id,
      });

      // Add to queue for processing
      await queueManager.addToQueue(remixJob.id);

      res.status(201).json(remixJob);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          error: "Validation error", 
          details: error.errors 
        });
      }
      console.error("Error creating remix job:", error);
      res.status(500).json({ 
        error: "Failed to create remix job",
        message: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Serve videos and thumbnails from object storage
  app.get("/objects/:objectPath(*)", async (req, res) => {
    const objectStorageService = new ObjectStorageService();
    try {
      const objectFile = await objectStorageService.getObjectEntityFile(req.path);
      await objectStorageService.downloadObject(objectFile, res);
    } catch (error) {
      console.error("Error serving object:", error);
      if (error instanceof ObjectNotFoundError) {
        return res.sendStatus(404);
      }
      return res.sendStatus(500);
    }
  });

  // Delete a video job
  app.delete("/api/videos/:id", async (req, res) => {
    try {
      const job = await storage.getVideoJob(req.params.id);
      if (!job) {
        return res.status(404).json({ error: "Video job not found" });
      }

      // Delete video and thumbnail from object storage if they exist
      if (job.videoUrl || job.thumbnailUrl) {
        const objectStorageService = new ObjectStorageService();
        
        try {
          if (job.videoUrl) {
            const videoFile = await objectStorageService.getObjectEntityFile(job.videoUrl);
            await videoFile.delete();
          }
        } catch (error) {
          console.warn("Could not delete video file:", error);
        }

        try {
          if (job.thumbnailUrl) {
            const thumbnailFile = await objectStorageService.getObjectEntityFile(job.thumbnailUrl);
            await thumbnailFile.delete();
          }
        } catch (error) {
          console.warn("Could not delete thumbnail file:", error);
        }
      }

      // Delete from database
      await storage.deleteVideoJob(req.params.id);
      
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting video job:", error);
      res.status(500).json({ error: "Failed to delete video job" });
    }
  });

  // Upload input reference file (image or video)
  app.post("/api/upload-reference", upload.single("file"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const objectStorageService = new ObjectStorageService();
      const timestamp = Date.now();
      const filename = `reference_${timestamp}_${req.file.originalname}`;
      
      // Upload to object storage in .private/references/ directory
      const url = await objectStorageService.uploadInputReference(filename, req.file.buffer);
      
      res.json({ url });
    } catch (error) {
      console.error("Error uploading input reference:", error);
      res.status(500).json({ error: "Failed to upload input reference" });
    }
  });

  // Queue status endpoint
  app.get("/api/queue/status", async (req, res) => {
    try {
      const queueLength = queueManager.getQueueLength();
      res.json({ queueLength });
    } catch (error) {
      console.error("Error getting queue status:", error);
      res.status(500).json({ error: "Failed to get queue status" });
    }
  });

  // Webhook CRUD endpoints
  
  // Get all webhooks
  app.get("/api/webhooks", async (req, res) => {
    try {
      const webhooks = await storage.getAllWebhooks();
      res.json(webhooks);
    } catch (error) {
      console.error("Error fetching webhooks:", error);
      res.status(500).json({ error: "Failed to fetch webhooks" });
    }
  });

  // Create a new webhook
  app.post("/api/webhooks", async (req, res) => {
    try {
      const validatedData = insertWebhookSchema.parse(req.body);
      const webhook = await storage.createWebhook(validatedData);
      res.status(201).json(webhook);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          error: "Validation error", 
          details: error.errors 
        });
      }
      console.error("Error creating webhook:", error);
      res.status(500).json({ 
        error: "Failed to create webhook",
        message: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Update webhook active status
  app.patch("/api/webhooks/:id", async (req, res) => {
    try {
      const { isActive } = req.body;
      const webhook = await storage.updateWebhookStatus(req.params.id, isActive);
      res.json(webhook);
    } catch (error) {
      console.error("Error updating webhook:", error);
      res.status(500).json({ error: "Failed to update webhook" });
    }
  });

  // Delete a webhook
  app.delete("/api/webhooks/:id", async (req, res) => {
    try {
      await storage.deleteWebhook(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting webhook:", error);
      res.status(500).json({ error: "Failed to delete webhook" });
    }
  });

  // Folder CRUD endpoints
  
  // Get all folders
  app.get("/api/folders", async (req, res) => {
    try {
      const folders = await storage.getAllFolders();
      res.json(folders);
    } catch (error) {
      console.error("Error fetching folders:", error);
      res.status(500).json({ error: "Failed to fetch folders" });
    }
  });

  // Create a new folder
  app.post("/api/folders", async (req, res) => {
    try {
      const validatedData = insertFolderSchema.parse(req.body);
      
      // Validate parentId exists if provided
      if (validatedData.parentId) {
        const parentFolder = await storage.getFolder(validatedData.parentId);
        if (!parentFolder) {
          return res.status(400).json({ error: "Parent folder not found" });
        }
      }
      
      const folder = await storage.createFolder(validatedData);
      res.status(201).json(folder);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          error: "Validation error", 
          details: error.errors 
        });
      }
      console.error("Error creating folder:", error);
      res.status(500).json({ 
        error: "Failed to create folder",
        message: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Update a folder (rename, change parent, change color)
  app.patch("/api/folders/:id", async (req, res) => {
    try {
      const folder = await storage.getFolder(req.params.id);
      if (!folder) {
        return res.status(404).json({ error: "Folder not found" });
      }

      // Validate parentId if being changed
      if (req.body.parentId !== undefined && req.body.parentId !== null) {
        // Prevent circular reference
        if (req.body.parentId === req.params.id) {
          return res.status(400).json({ error: "Folder cannot be its own parent" });
        }
        
        const parentFolder = await storage.getFolder(req.body.parentId);
        if (!parentFolder) {
          return res.status(400).json({ error: "Parent folder not found" });
        }
      }

      const updatedFolder = await storage.updateFolder(req.params.id, req.body);
      res.json(updatedFolder);
    } catch (error) {
      console.error("Error updating folder:", error);
      res.status(500).json({ error: "Failed to update folder" });
    }
  });

  // Delete a folder
  app.delete("/api/folders/:id", async (req, res) => {
    try {
      const folder = await storage.getFolder(req.params.id);
      if (!folder) {
        return res.status(404).json({ error: "Folder not found" });
      }

      // Move videos to parent folder (or null if root folder)
      const videosInFolder = await storage.getVideoJobsByFolder(req.params.id);
      for (const video of videosInFolder) {
        await storage.updateVideoJobFolder(video.id, folder.parentId || null);
      }

      // Move subfolders to parent folder (or null if root folder)
      const allFolders = await storage.getAllFolders();
      const subfolders = allFolders.filter(f => f.parentId === req.params.id);
      for (const subfolder of subfolders) {
        await storage.updateFolder(subfolder.id, { parentId: folder.parentId || null });
      }

      // Delete the folder
      await storage.deleteFolder(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting folder:", error);
      res.status(500).json({ error: "Failed to delete folder" });
    }
  });

  // Move video to folder
  app.patch("/api/videos/:id/folder", async (req, res) => {
    try {
      const job = await storage.getVideoJob(req.params.id);
      if (!job) {
        return res.status(404).json({ error: "Video job not found" });
      }

      const { folderId } = req.body;
      
      // Validate folderId exists if provided
      if (folderId) {
        const folder = await storage.getFolder(folderId);
        if (!folder) {
          return res.status(400).json({ error: "Folder not found" });
        }
      }

      await storage.updateVideoJobFolder(req.params.id, folderId || null);
      const updatedJob = await storage.getVideoJob(req.params.id);
      res.json(updatedJob);
    } catch (error) {
      console.error("Error moving video to folder:", error);
      res.status(500).json({ error: "Failed to move video to folder" });
    }
  });

  // Get all settings
  app.get("/api/settings", async (req, res) => {
    try {
      const settings = await storage.getAllSettings();
      res.json(settings);
    } catch (error) {
      console.error("Error fetching settings:", error);
      res.status(500).json({ error: "Failed to fetch settings" });
    }
  });

  // Get a specific setting by key
  app.get("/api/settings/:key", async (req, res) => {
    try {
      const setting = await storage.getSettingByKey(req.params.key);
      if (!setting) {
        return res.status(404).json({ error: "Setting not found" });
      }
      res.json(setting);
    } catch (error) {
      console.error("Error fetching setting:", error);
      res.status(500).json({ error: "Failed to fetch setting" });
    }
  });

  // Update or create a setting (individual setting by key)
  app.put("/api/settings/:key", async (req, res) => {
    try {
      const { value, description } = req.body;
      const setting = await storage.upsertSetting(req.params.key, value, description);
      res.json(setting);
    } catch (error) {
      console.error("Error updating setting:", error);
      res.status(500).json({ error: "Failed to update setting" });
    }
  });

  // Update multiple settings at once
  app.put("/api/settings", async (req, res) => {
    try {
      // Validate settings using shared schema
      const validated = updateSettingsSchema.parse(req.body);
      const updatedSettings: any[] = [];

      // Update maxConcurrentJobs
      const setting = await storage.upsertSetting(
        "maxConcurrentJobs",
        validated.maxConcurrentJobs,
        "Maximum number of concurrent video generation jobs"
      );
      updatedSettings.push(setting);
      
      // Reload queue manager settings immediately
      await queueManager.reloadSettings();

      res.json({ 
        success: true,
        settings: updatedSettings 
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          error: "Validation error", 
          details: error.errors 
        });
      }
      console.error("Error updating settings:", error);
      res.status(500).json({ error: "Failed to update settings" });
    }
  });

  // Enhance prompt using Claude Sonnet 4.5
  app.post("/api/enhance-prompt", async (req, res) => {
    try {
      const { prompt } = req.body;
      
      if (!prompt || typeof prompt !== "string") {
        return res.status(400).json({ error: "Prompt is required" });
      }

      if (prompt.trim().length < 5) {
        return res.status(400).json({ error: "Prompt must be at least 5 characters" });
      }

      const enhancedPrompt = await enhancePrompt(prompt);
      res.json({ enhancedPrompt });
    } catch (error) {
      console.error("Error enhancing prompt:", error);
      res.status(500).json({ 
        error: "Failed to enhance prompt",
        message: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
