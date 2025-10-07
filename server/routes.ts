import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { queueManager } from "./queueManager";
import { ObjectStorageService, ObjectNotFoundError } from "./objectStorage";
import { insertVideoJobSchema, insertWebhookSchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  
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

  const httpServer = createServer(app);
  return httpServer;
}
