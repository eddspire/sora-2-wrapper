// Reference: javascript_database blueprint
import { videoJobs, webhooks, settings, type VideoJob, type InsertVideoJob, type Webhook, type InsertWebhook, type Setting, type InsertSetting } from "@shared/schema";
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
  
  // Webhook operations
  createWebhook(webhook: InsertWebhook): Promise<Webhook>;
  getAllWebhooks(): Promise<Webhook[]>;
  getActiveWebhooks(): Promise<Webhook[]>;
  updateWebhookStatus(id: string, isActive: number): Promise<Webhook>;
  deleteWebhook(id: string): Promise<void>;
  
  // Settings operations
  getAllSettings(): Promise<Setting[]>;
  getSettingByKey(key: string): Promise<Setting | undefined>;
  upsertSetting(key: string, value: string, description?: string): Promise<Setting>;
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

  // Webhook operations
  async createWebhook(insertWebhook: InsertWebhook): Promise<Webhook> {
    const [webhook] = await db
      .insert(webhooks)
      .values({
        ...insertWebhook,
        isActive: insertWebhook.isActive ?? 1,
      })
      .returning();
    return webhook;
  }

  async getAllWebhooks(): Promise<Webhook[]> {
    const allWebhooks = await db.select().from(webhooks).orderBy(desc(webhooks.createdAt));
    return allWebhooks;
  }

  async getActiveWebhooks(): Promise<Webhook[]> {
    const activeWebhooks = await db
      .select()
      .from(webhooks)
      .where(eq(webhooks.isActive, 1));
    return activeWebhooks;
  }

  async updateWebhookStatus(id: string, isActive: number): Promise<Webhook> {
    const [webhook] = await db
      .update(webhooks)
      .set({
        isActive,
        updatedAt: new Date(),
      })
      .where(eq(webhooks.id, id))
      .returning();
    return webhook;
  }

  async deleteWebhook(id: string): Promise<void> {
    await db.delete(webhooks).where(eq(webhooks.id, id));
  }

  // Settings operations
  async getAllSettings(): Promise<Setting[]> {
    const allSettings = await db.select().from(settings);
    return allSettings;
  }

  async getSettingByKey(key: string): Promise<Setting | undefined> {
    const [setting] = await db.select().from(settings).where(eq(settings.key, key));
    return setting || undefined;
  }

  async upsertSetting(key: string, value: string, description?: string): Promise<Setting> {
    const existing = await this.getSettingByKey(key);
    
    if (existing) {
      const [updated] = await db
        .update(settings)
        .set({
          value,
          description: description ?? existing.description,
          updatedAt: new Date(),
        })
        .where(eq(settings.key, key))
        .returning();
      return updated;
    } else {
      const [created] = await db
        .insert(settings)
        .values({
          key,
          value,
          description,
        })
        .returning();
      return created;
    }
  }
}

export const storage = new DatabaseStorage();
