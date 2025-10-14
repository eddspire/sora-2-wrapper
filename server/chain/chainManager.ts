import path from 'path';
import fs from 'fs/promises';
import { db } from '../db';
import { chainJobs, videoJobs } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { planSegments } from './planner';
import { extractLastFrame } from './frameExtractor';
import { concatVideos } from './videoConcatenator';
import { ChainConfig, SegmentResult, ChainResult } from './types';
import { createVideo, getVideoStatus, downloadVideoContent } from '../openai';
import { ObjectStorageService } from '../objectStorage';
import { calculateCost } from '../costCalculator';
import { webhookService } from '../webhookService';
import { storage } from '../storage';
import sharp from 'sharp';

interface QueueJob {
  id: string;
  retryCount: number;
}

export class ChainQueueManager {
  private queue: QueueJob[] = [];
  private processing = false;
  private maxConcurrent = 1; // Process one chain at a time
  private currentProcessing = 0;

  constructor() {
    this.loadSettings();
    this.startProcessing();
  }

  private async loadSettings() {
    try {
      const maxConcurrentSetting = await storage.getSettingByKey("maxConcurrentChains");
      if (maxConcurrentSetting) {
        const value = parseInt(maxConcurrentSetting.value, 10);
        if (!isNaN(value) && value > 0) {
          this.maxConcurrent = value;
          console.log(`Chain queue manager: Max concurrent chains set to ${this.maxConcurrent}`);
        }
      }
    } catch (error) {
      console.warn("Failed to load chain queue settings, using defaults:", error);
    }
  }

  async reloadSettings() {
    await this.loadSettings();
  }

  async addToQueue(chainJobId: string) {
    this.queue.push({ id: chainJobId, retryCount: 0 });
    console.log(`Chain ${chainJobId} added to queue. Queue length: ${this.queue.length}`);
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
    console.log(`Processing chain ${job.id}. Concurrent: ${this.currentProcessing}`);

    try {
      await this.processChainJob(job.id);
    } catch (error) {
      console.error(`Error processing chain ${job.id}:`, error);
      
      // Retry logic
      if (job.retryCount < 1) { // Only retry once for chains
        job.retryCount++;
        this.queue.push(job);
        console.log(`Chain ${job.id} failed, retrying (attempt ${job.retryCount})`);
      } else {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        console.log(`Chain ${job.id} failed permanently: ${errorMessage}`);
        
        await db.update(chainJobs)
          .set({ 
            status: "failed", 
            errorMessage,
            updatedAt: new Date(),
          })
          .where(eq(chainJobs.id, job.id));
      }
    } finally {
      this.currentProcessing--;
    }
  }

  private async processChainJob(chainJobId: string) {
    // Get chain job from database
    const [chainJob] = await db.select().from(chainJobs).where(eq(chainJobs.id, chainJobId));
    
    if (!chainJob || chainJob.status !== "queued") {
      console.log(`Chain ${chainJobId} not found or not queued, skipping`);
      return;
    }

    console.log(`Starting chain generation for ${chainJobId}: ${chainJob.numSegments} segments`);

    // Update status to planning
    await db.update(chainJobs)
      .set({ status: "planning", updatedAt: new Date() })
      .where(eq(chainJobs.id, chainJobId));

    // Step 1: Plan segments using Claude
    const config: ChainConfig = {
      totalDuration: chainJob.totalDuration,
      secondsPerSegment: chainJob.secondsPerSegment as 4 | 8 | 12,
      numSegments: chainJob.numSegments,
      resolution: chainJob.size || '1280x720',
      model: (chainJob.model || 'sora-2-pro') as 'sora-2' | 'sora-2-pro',
      useContinuity: true,
      pollingIntervalMs: 15000,
      maxRetries: 2,
      tempDir: path.resolve(`.tmp_chain/${chainJobId}`)
    };

    const segments = await planSegments(chainJob.basePrompt, config);
    
    // Save plan to database
    await db.update(chainJobs)
      .set({ 
        planJson: JSON.stringify(segments),
        updatedAt: new Date()
      })
      .where(eq(chainJobs.id, chainJobId));

    console.log(`Plan generated for chain ${chainJobId}: ${segments.length} segments`);

    // Create temp directory
    await fs.mkdir(config.tempDir, { recursive: true });

    // Step 2: Generate segments sequentially
    await db.update(chainJobs)
      .set({ status: "generating", progress: 0, updatedAt: new Date() })
      .where(eq(chainJobs.id, chainJobId));

    const results: SegmentResult[] = [];
    const segmentJobIds: string[] = [];
    let lastFramePath: string | undefined;

    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];
      console.log(`Generating segment ${i + 1}/${segments.length} for chain ${chainJobId}`);

      // Prepare input reference if we have a last frame
      let inputReferenceBuffer: { buffer: Buffer; filename: string; contentType: string } | undefined;
      
      if (config.useContinuity && lastFramePath) {
        try {
          const frameBuffer = await fs.readFile(lastFramePath);
          
          // Parse video dimensions
          const [widthStr, heightStr] = config.resolution.split('x');
          const targetWidth = parseInt(widthStr);
          const targetHeight = parseInt(heightStr);
          
          // Resize frame to match video dimensions
          const resizedBuffer = await sharp(frameBuffer)
            .resize(targetWidth, targetHeight, { fit: 'fill' })
            .toBuffer();
          
          inputReferenceBuffer = {
            buffer: resizedBuffer,
            filename: `segment_${i}_reference.jpg`,
            contentType: 'image/jpeg'
          };
          
          console.log(`Using last frame from segment ${i} as input reference`);
        } catch (error) {
          console.warn(`Failed to process last frame for segment ${i + 1}:`, error);
        }
      }

      // Create video using OpenAI
      const video = await createVideo(
        segment.prompt,
        config.model,
        config.resolution,
        segment.seconds,
        inputReferenceBuffer
      );

      console.log(`Video generation started for segment ${i + 1}, OpenAI video ID: ${video.id}`);

      // Poll for completion
      let pollAttempts = 0;
      const maxPollAttempts = 60;
      let currentInterval = config.pollingIntervalMs || 15000;

      while (pollAttempts < maxPollAttempts) {
        await new Promise(resolve => setTimeout(resolve, currentInterval));
        pollAttempts++;

        // Exponential backoff
        currentInterval = Math.min(currentInterval * 1.5, 60000);

        const status = await getVideoStatus(video.id);
        const progress = status.progress || 0;
        
        // Update chain progress: (completed segments + current progress) / total segments
        const chainProgress = Math.floor(((i + (progress / 100)) / segments.length) * 100);
        await db.update(chainJobs)
          .set({ progress: chainProgress, updatedAt: new Date() })
          .where(eq(chainJobs.id, chainJobId));

        console.log(`Segment ${i + 1}/${segments.length} progress: ${progress}%, chain progress: ${chainProgress}%`);

        if (status.status === "completed") {
          console.log(`Segment ${i + 1} completed, downloading...`);
          
          // Download video
          const videoContent = await downloadVideoContent(video.id, "video");
          const videoBuffer = Buffer.from(await videoContent.arrayBuffer());
          const videoPath = path.join(config.tempDir, `segment_${String(i + 1).padStart(2, '0')}.mp4`);
          await fs.writeFile(videoPath, videoBuffer);

          // Download thumbnail
          let thumbnailUrl: string | undefined;
          try {
            const thumbnailContent = await downloadVideoContent(video.id, "thumbnail");
            const thumbnailBuffer = Buffer.from(await thumbnailContent.arrayBuffer());
            const thumbnailPath = path.join(config.tempDir, `segment_${String(i + 1).padStart(2, '0')}_thumb.jpg`);
            await fs.writeFile(thumbnailPath, thumbnailBuffer);
          } catch (thumbError) {
            console.warn(`Could not download thumbnail for segment ${i + 1}:`, thumbError);
          }

          // Extract last frame for next segment
          const frameOutputPath = path.join(config.tempDir, `segment_${String(i + 1).padStart(2, '0')}_last.jpg`);
          await extractLastFrame(videoPath, frameOutputPath);
          lastFramePath = frameOutputPath;

          results.push({
            index: i + 1,
            jobId: video.id,
            videoPath,
            lastFramePath: frameOutputPath,
            durationSec: segment.seconds
          });

          segmentJobIds.push(video.id);

          break;
        } else if (status.status === "failed") {
          const errorMsg = (status as any).error?.message || "Video generation failed";
          throw new Error(`Segment ${i + 1} generation failed: ${errorMsg}`);
        }
      }

      if (pollAttempts >= maxPollAttempts) {
        throw new Error(`Segment ${i + 1} generation timed out`);
      }
    }

    // Step 3: Concatenate all segments
    console.log(`Concatenating ${results.length} segments for chain ${chainJobId}`);
    
    await db.update(chainJobs)
      .set({ status: "concatenating", progress: 95, updatedAt: new Date() })
      .where(eq(chainJobs.id, chainJobId));

    const finalVideoPath = path.join(config.tempDir, 'combined.mp4');
    await concatVideos(results.map(r => r.videoPath), finalVideoPath);

    // Step 4: Upload final video to object storage
    console.log(`Uploading final video for chain ${chainJobId}`);
    
    const objectStorage = new ObjectStorageService();
    const finalVideoBuffer = await fs.readFile(finalVideoPath);
    const finalVideoUrl = await objectStorage.uploadVideo(`chain_${chainJobId}`, finalVideoBuffer);

    // Generate thumbnail from final video
    let thumbnailUrl: string | undefined;
    try {
      const thumbPath = path.join(config.tempDir, 'final_thumb.jpg');
      await extractLastFrame(finalVideoPath, thumbPath);
      const thumbBuffer = await fs.readFile(thumbPath);
      thumbnailUrl = await objectStorage.uploadThumbnail(`chain_${chainJobId}`, thumbBuffer);
    } catch (thumbError) {
      console.warn(`Could not generate thumbnail for chain ${chainJobId}:`, thumbError);
    }

    // Step 5: Calculate total cost
    let totalCost = 0;
    for (const segment of segments) {
      const segmentCost = calculateCost(config.model, config.resolution, segment.seconds);
      totalCost += segmentCost.totalCost;
    }

    const costDetails = JSON.stringify({
      segments: segments.length,
      costPerSegment: totalCost / segments.length,
      totalCost,
      model: config.model,
      resolution: config.resolution
    });

    // Step 6: Update chain job as completed
    await db.update(chainJobs)
      .set({
        status: "completed",
        progress: 100,
        segmentJobIds,
        finalVideoUrl,
        thumbnailUrl,
        costDetails,
        updatedAt: new Date(),
      })
      .where(eq(chainJobs.id, chainJobId));

    console.log(`Chain ${chainJobId} completed successfully`);

    // Step 7: Clean up temp files
    try {
      await fs.rm(config.tempDir, { recursive: true, force: true });
      console.log(`Cleaned up temp directory for chain ${chainJobId}`);
    } catch (cleanupError) {
      console.warn(`Failed to clean up temp directory for chain ${chainJobId}:`, cleanupError);
    }

    // Trigger webhooks
    const [completedChain] = await db.select().from(chainJobs).where(eq(chainJobs.id, chainJobId));
    if (completedChain) {
      // Note: Webhooks currently only support video jobs, not chain jobs
      // Future enhancement: add chain-specific webhook events
      console.log(`Chain ${chainJobId} completed, webhooks not yet implemented for chains`);
    }
  }

  getQueueLength(): number {
    return this.queue.length;
  }
}

// Singleton instance
export const chainQueueManager = new ChainQueueManager();

