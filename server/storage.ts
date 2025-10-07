// Reference: javascript_database blueprint
import { videoJobs, type VideoJob, type InsertVideoJob } from "@shared/schema";
import { db } from "./db";
import { eq, desc } from "drizzle-orm";

export interface IStorage {
  // Video job operations
  createVideoJob(job: InsertVideoJob): Promise<VideoJob>;
  getVideoJob(id: string): Promise<VideoJob | undefined>;
  getAllVideoJobs(): Promise<VideoJob[]>;
  updateVideoJobStatus(id: string, status: string, progress?: number, errorMessage?: string): Promise<void>;
  updateVideoJobUrls(id: string, videoUrl: string, thumbnailUrl?: string): Promise<void>;
  deleteVideoJob(id: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async createVideoJob(insertJob: InsertVideoJob): Promise<VideoJob> {
    const [job] = await db
      .insert(videoJobs)
      .values({
        ...insertJob,
        status: "queued",
        progress: 0,
      })
      .returning();
    return job;
  }

  async getVideoJob(id: string): Promise<VideoJob | undefined> {
    const [job] = await db.select().from(videoJobs).where(eq(videoJobs.id, id));
    return job || undefined;
  }

  async getAllVideoJobs(): Promise<VideoJob[]> {
    const jobs = await db.select().from(videoJobs).orderBy(desc(videoJobs.createdAt));
    return jobs;
  }

  async updateVideoJobStatus(id: string, status: string, progress?: number, errorMessage?: string): Promise<void> {
    await db.update(videoJobs)
      .set({
        status,
        progress: progress ?? undefined,
        errorMessage: errorMessage ?? undefined,
        updatedAt: new Date(),
      })
      .where(eq(videoJobs.id, id));
  }

  async updateVideoJobUrls(id: string, videoUrl: string, thumbnailUrl?: string): Promise<void> {
    await db.update(videoJobs)
      .set({
        videoUrl,
        thumbnailUrl: thumbnailUrl ?? undefined,
        updatedAt: new Date(),
      })
      .where(eq(videoJobs.id, id));
  }

  async deleteVideoJob(id: string): Promise<void> {
    await db.delete(videoJobs).where(eq(videoJobs.id, id));
  }
}

export const storage = new DatabaseStorage();
