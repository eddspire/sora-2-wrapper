import { db } from "./db";
import { videoJobs } from "@shared/schema";
import { eq } from "drizzle-orm";
import { createVideo, getVideoStatus, downloadVideoContent } from "./openai";
import { ObjectStorageService } from "./objectStorage";
import { webhookService } from "./webhookService";

interface QueueJob {
  id: string;
  retryCount: number;
}

export class VideoQueueManager {
  private queue: QueueJob[] = [];
  private processing = false;
  private maxConcurrent = 1; // Process one at a time to respect rate limits
  private currentProcessing = 0;
  private pollInterval = 5000; // Poll every 5 seconds

  constructor() {
    // Start processing queue on initialization
    this.startProcessing();
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
      
      // Retry logic
      if (job.retryCount < 2) {
        job.retryCount++;
        this.queue.push(job);
        console.log(`Job ${job.id} failed, retrying (attempt ${job.retryCount})`);
      } else {
        // Mark as failed after retries
        await db.update(videoJobs)
          .set({ 
            status: "failed", 
            errorMessage: error instanceof Error ? error.message : "Unknown error",
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

    // Start video generation with OpenAI
    const video = await createVideo(job.prompt, job.model || "sora-2-pro", job.size || "1280x720", job.seconds || "8");
    
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

    // Poll for completion
    let attempts = 0;
    const maxAttempts = 120; // 10 minutes max (5s * 120 = 600s)

    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, this.pollInterval));
      attempts++;

      const status = await getVideoStatus(video.id);
      
      // Update progress
      const progress = status.progress || 0;
      await db.update(videoJobs)
        .set({
          progress,
          updatedAt: new Date(),
        })
        .where(eq(videoJobs.id, jobId));

      console.log(`Job ${jobId} progress: ${progress}%, status: ${status.status}`);

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

          // Update job as completed
          await db.update(videoJobs)
            .set({
              status: "completed",
              progress: 100,
              videoUrl,
              thumbnailUrl,
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

    throw new Error("Video generation timed out");
  }

  getQueueLength(): number {
    return this.queue.length;
  }
}

// Singleton instance
export const queueManager = new VideoQueueManager();
