import { db } from "./db";
import { videoJobs } from "@shared/schema";
import { eq } from "drizzle-orm";
import { createVideo, getVideoStatus, downloadVideoContent } from "./openai";
import { ObjectStorageService } from "./objectStorage";
import { webhookService } from "./webhookService";
import { calculateCost } from "./costCalculator";
import { storage } from "./storage";
import sharp from "sharp";

interface QueueJob {
  id: string;
  retryCount: number;
}

export class VideoQueueManager {
  private queue: QueueJob[] = [];
  private processing = false;
  private maxConcurrent = 1; // Default: Process one at a time to respect rate limits
  private currentProcessing = 0;
  // Exponential backoff polling to reduce API costs
  private initialPollInterval = 15000; // Start at 15 seconds
  private maxPollInterval = 60000; // Max 60 seconds between checks

  constructor() {
    // Load settings and start processing queue
    this.loadSettings();
    this.startProcessing();
  }

  private async loadSettings() {
    try {
      const maxConcurrentSetting = await storage.getSettingByKey("maxConcurrentJobs");
      if (maxConcurrentSetting) {
        const value = parseInt(maxConcurrentSetting.value, 10);
        if (!isNaN(value) && value > 0) {
          this.maxConcurrent = value;
          console.log(`Queue manager: Max concurrent jobs set to ${this.maxConcurrent}`);
        }
      }
    } catch (error) {
      console.warn("Failed to load queue settings, using defaults:", error);
    }
  }

  // Public method to reload settings (called after settings update)
  async reloadSettings() {
    await this.loadSettings();
  }

  async addToQueue(jobId: string) {
    this.queue.push({ id: jobId, retryCount: 0 });
    console.log(`Job ${jobId} added to queue. Queue length: ${this.queue.length}`);
    this.processQueue();
  }

  private async startProcessing() {
    setInterval(() => {
      this.processQueue();
    }, 2000); // Check queue every 2 seconds
  }

  private async processQueue() {
    if (this.currentProcessing >= this.maxConcurrent || this.queue.length === 0) {
      return;
    }

    const job = this.queue.shift();
    if (!job) return;

    this.currentProcessing++;
    console.log(`Processing job ${job.id}. Concurrent: ${this.currentProcessing}`);

    try {
      await this.processVideoJob(job.id);
    } catch (error) {
      console.error(`Error processing job ${job.id}:`, error);
      
      // Don't retry on validation errors (400) - they won't succeed on retry
      const isValidationError = error instanceof Error && 
        (error.message.includes('400') || 
         error.message.includes('invalid_request_error') ||
         error.message.includes('must match'));
      
      // Retry logic - skip retries for validation errors
      if (!isValidationError && job.retryCount < 2) {
        job.retryCount++;
        this.queue.push(job);
        console.log(`Job ${job.id} failed, retrying (attempt ${job.retryCount})`);
      } else {
        // Mark as failed after retries or on validation error
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        console.log(`Job ${job.id} failed permanently: ${errorMessage}`);
        
        await db.update(videoJobs)
          .set({ 
            status: "failed", 
            errorMessage,
            updatedAt: new Date(),
          })
          .where(eq(videoJobs.id, job.id));
        
        // Trigger webhooks for failed job
        const [failedJob] = await db.select().from(videoJobs).where(eq(videoJobs.id, job.id));
        if (failedJob) {
          await webhookService.triggerWebhooks("failed", failedJob);
        }
      }
    } finally {
      this.currentProcessing--;
    }
  }

  private async processVideoJob(jobId: string) {
    // Get job from database
    const [job] = await db.select().from(videoJobs).where(eq(videoJobs.id, jobId));
    
    if (!job || job.status !== "queued") {
      console.log(`Job ${jobId} not found or not queued, skipping`);
      return;
    }

    console.log(`Starting video generation for job ${jobId}`);

    // If there's an input reference, download it from object storage and resize to match video dimensions
    let inputReferenceBuffer: { buffer: Buffer; filename: string; contentType: string } | undefined;
    if (job.inputReferenceUrl) {
      try {
        const objectStorage = new ObjectStorageService();
        const file = await objectStorage.getObjectEntityFile(job.inputReferenceUrl);
        const [metadata] = await file.getMetadata();
        
        // Download file to buffer
        const chunks: Buffer[] = [];
        const readStream = file.createReadStream();
        
        await new Promise<void>((resolve, reject) => {
          readStream.on('data', (chunk: Buffer) => chunks.push(chunk));
          readStream.on('end', () => resolve());
          readStream.on('error', reject);
        });
        
        const originalBuffer = Buffer.concat(chunks);
        
        // Parse video dimensions from size (e.g., "1280x720")
        const [widthStr, heightStr] = (job.size || "1280x720").split('x');
        const targetWidth = parseInt(widthStr);
        const targetHeight = parseInt(heightStr);
        
        // Resize image to match video dimensions exactly
        console.log(`Resizing input reference for job ${jobId} to ${targetWidth}x${targetHeight}`);
        const resizedBuffer = await sharp(originalBuffer)
          .resize(targetWidth, targetHeight, {
            fit: 'fill', // Stretch to exact dimensions
          })
          .toBuffer();
        
        inputReferenceBuffer = {
          buffer: resizedBuffer,
          filename: metadata.name || 'reference',
          contentType: metadata.contentType || 'application/octet-stream'
        };
        
        console.log(`Resized input reference for job ${jobId}: ${metadata.name} (${targetWidth}x${targetHeight})`);
      } catch (error) {
        console.warn(`Could not process input reference for job ${jobId}:`, error);
        // Continue without input reference
      }
    }

    // Start video generation with OpenAI
    const video = await createVideo(
      job.prompt, 
      job.model || "sora-2-pro", 
      job.size || "1280x720", 
      job.seconds || 8, 
      inputReferenceBuffer
    );
    
    // Update job with video ID and status
    await db.update(videoJobs)
      .set({
        videoId: video.id,
        status: "in_progress",
        progress: 0,
        updatedAt: new Date(),
      })
      .where(eq(videoJobs.id, jobId));

    console.log(`Video generation started for job ${jobId}, OpenAI video ID: ${video.id}`);

    // Poll for completion with exponential backoff to reduce API costs
    let attempts = 0;
    const maxAttempts = 60; // Much fewer attempts with longer intervals
    let currentInterval = this.initialPollInterval;

    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, currentInterval));
      attempts++;

      // Exponential backoff: gradually increase polling interval
      currentInterval = Math.min(currentInterval * 1.5, this.maxPollInterval);

      const status = await getVideoStatus(video.id);
      
      // Update progress
      const progress = status.progress || 0;
      await db.update(videoJobs)
        .set({
          progress,
          updatedAt: new Date(),
        })
        .where(eq(videoJobs.id, jobId));

      console.log(`Job ${jobId} progress: ${progress}%, status: ${status.status}, next check in ${Math.round(currentInterval/1000)}s`);

      if (status.status === "completed") {
        console.log(`Job ${jobId} completed, downloading video...`);
        
        // Download video and store in object storage
        const objectStorage = new ObjectStorageService();
        
        try {
          // Download video
          const videoContent = await downloadVideoContent(video.id, "video");
          const videoBuffer = Buffer.from(await videoContent.arrayBuffer());
          const videoUrl = await objectStorage.uploadVideo(jobId, videoBuffer);

          // Try to download thumbnail
          let thumbnailUrl: string | undefined;
          try {
            const thumbnailContent = await downloadVideoContent(video.id, "thumbnail");
            const thumbnailBuffer = Buffer.from(await thumbnailContent.arrayBuffer());
            thumbnailUrl = await objectStorage.uploadThumbnail(jobId, thumbnailBuffer);
          } catch (thumbError) {
            console.warn(`Could not download thumbnail for job ${jobId}:`, thumbError);
          }

          // Calculate cost
          const costBreakdown = calculateCost(job.model || "sora-2-pro", job.size || "1280x720", job.seconds || 8);
          const costDetails = JSON.stringify(costBreakdown);

          // Update job as completed
          await db.update(videoJobs)
            .set({
              status: "completed",
              progress: 100,
              videoUrl,
              thumbnailUrl,
              costDetails,
              updatedAt: new Date(),
            })
            .where(eq(videoJobs.id, jobId));

          console.log(`Job ${jobId} successfully completed and stored`);
          
          // Trigger webhooks for completed job
          const [completedJob] = await db.select().from(videoJobs).where(eq(videoJobs.id, jobId));
          if (completedJob) {
            await webhookService.triggerWebhooks("completed", completedJob);
          }
          
          return;
        } catch (storageError) {
          console.error(`Error storing video for job ${jobId}:`, storageError);
          throw new Error(`Failed to store video: ${storageError instanceof Error ? storageError.message : "Unknown error"}`);
        }
      } else if (status.status === "failed") {
        const errorMsg = (status as any).error?.message || "Video generation failed";
        
        // Mark as failed in database
        await db.update(videoJobs)
          .set({
            status: "failed",
            errorMessage: errorMsg,
            updatedAt: new Date(),
          })
          .where(eq(videoJobs.id, jobId));
        
        // Trigger webhooks for failed job
        const [failedJob] = await db.select().from(videoJobs).where(eq(videoJobs.id, jobId));
        if (failedJob) {
          await webhookService.triggerWebhooks("failed", failedJob);
        }
        
        throw new Error(errorMsg);
      }
    }

    // Timeout reached - do one final check before giving up
    console.warn(`Job ${jobId} polling timeout reached after ${maxAttempts} attempts`);
    
    try {
      const finalStatus = await getVideoStatus(video.id);
      if (finalStatus.status === "completed") {
        console.log(`Job ${jobId} completed during timeout - recovering...`);
        
        // Download and complete the video
        const objectStorage = new ObjectStorageService();
        const videoContent = await downloadVideoContent(video.id, "video");
        const videoBuffer = Buffer.from(await videoContent.arrayBuffer());
        const videoUrl = await objectStorage.uploadVideo(jobId, videoBuffer);

        let thumbnailUrl: string | undefined;
        try {
          const thumbnailContent = await downloadVideoContent(video.id, "thumbnail");
          const thumbnailBuffer = Buffer.from(await thumbnailContent.arrayBuffer());
          thumbnailUrl = await objectStorage.uploadThumbnail(jobId, thumbnailBuffer);
        } catch (thumbError) {
          console.warn(`Could not download thumbnail for job ${jobId}:`, thumbError);
        }

        const costBreakdown = calculateCost(job.model || "sora-2-pro", job.size || "1280x720", job.seconds || 8);
        const costDetails = JSON.stringify(costBreakdown);

        await db.update(videoJobs)
          .set({
            status: "completed",
            progress: 100,
            videoUrl,
            thumbnailUrl,
            costDetails,
            updatedAt: new Date(),
          })
          .where(eq(videoJobs.id, jobId));

        console.log(`Job ${jobId} recovered after timeout`);
        
        const [completedJob] = await db.select().from(videoJobs).where(eq(videoJobs.id, jobId));
        if (completedJob) {
          await webhookService.triggerWebhooks("completed", completedJob);
        }
        
        return;
      }
    } catch (finalCheckError) {
      console.error(`Final status check failed for job ${jobId}:`, finalCheckError);
    }

    throw new Error(`Video generation timed out. The video may still be processing on OpenAI's side - check your OpenAI dashboard.`);
  }

  getQueueLength(): number {
    return this.queue.length;
  }
}

// Singleton instance
export const queueManager = new VideoQueueManager();
