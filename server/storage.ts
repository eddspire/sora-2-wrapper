// Reference: javascript_database blueprint
import { videoJobs, webhooks, settings, folders, chainJobs, type VideoJob, type InsertVideoJob, type Webhook, type InsertWebhook, type Setting, type InsertSetting, type Folder, type InsertFolder, type ChainJob, type InsertChainJob } from "@shared/schema";
import { db } from "./db";
import { eq, desc, isNull } from "drizzle-orm";

export interface IStorage {
  // Video job operations
  createVideoJob(job: InsertVideoJob): Promise<VideoJob>;
  getVideoJob(id: string): Promise<VideoJob | undefined>;
  getAllVideoJobs(): Promise<VideoJob[]>;
  getVideoJobsByFolder(folderId: string | null): Promise<VideoJob[]>;
  updateVideoJobStatus(id: string, status: string, progress?: number, errorMessage?: string): Promise<void>;
  updateVideoJobUrls(id: string, videoUrl: string, thumbnailUrl?: string): Promise<void>;
  updateVideoJobFolder(id: string, folderId: string | null): Promise<void>;
  deleteVideoJob(id: string): Promise<void>;
  
  // Folder operations
  createFolder(folder: InsertFolder): Promise<Folder>;
  getFolder(id: string): Promise<Folder | undefined>;
  getAllFolders(): Promise<Folder[]>;
  updateFolder(id: string, data: Partial<InsertFolder>): Promise<Folder>;
  deleteFolder(id: string): Promise<void>;
  
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
  
  // Chain job operations
  createChainJob(job: InsertChainJob): Promise<ChainJob>;
  getChainJob(id: string): Promise<ChainJob | undefined>;
  getAllChainJobs(): Promise<ChainJob[]>;
  updateChainJobStatus(id: string, status: string, progress?: number, errorMessage?: string): Promise<void>;
  updateChainJobPlan(id: string, planJson: string, segmentJobIds?: string[]): Promise<void>;
  updateChainJobResults(id: string, finalVideoUrl: string, thumbnailUrl?: string, costDetails?: string): Promise<void>;
  deleteChainJob(id: string): Promise<void>;
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

  async getVideoJobsByFolder(folderId: string | null): Promise<VideoJob[]> {
    const jobs = folderId 
      ? await db.select().from(videoJobs).where(eq(videoJobs.folderId, folderId)).orderBy(desc(videoJobs.createdAt))
      : await db.select().from(videoJobs).where(isNull(videoJobs.folderId)).orderBy(desc(videoJobs.createdAt));
    return jobs;
  }

  async updateVideoJobFolder(id: string, folderId: string | null): Promise<void> {
    await db.update(videoJobs)
      .set({
        folderId,
        updatedAt: new Date(),
      })
      .where(eq(videoJobs.id, id));
  }

  async deleteVideoJob(id: string): Promise<void> {
    await db.delete(videoJobs).where(eq(videoJobs.id, id));
  }

  // Folder operations
  async createFolder(insertFolder: InsertFolder): Promise<Folder> {
    const [folder] = await db
      .insert(folders)
      .values(insertFolder)
      .returning();
    return folder;
  }

  async getFolder(id: string): Promise<Folder | undefined> {
    const [folder] = await db.select().from(folders).where(eq(folders.id, id));
    return folder || undefined;
  }

  async getAllFolders(): Promise<Folder[]> {
    const allFolders = await db.select().from(folders).orderBy(desc(folders.createdAt));
    return allFolders;
  }

  async updateFolder(id: string, data: Partial<InsertFolder>): Promise<Folder> {
    const [folder] = await db
      .update(folders)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(folders.id, id))
      .returning();
    return folder;
  }

  async deleteFolder(id: string): Promise<void> {
    await db.delete(folders).where(eq(folders.id, id));
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

  // Folder operations
  async getFolders(): Promise<Folder[]> {
    const allFolders = await db.select().from(folders).orderBy(folders.createdAt);
    return allFolders;
  }

  async getFolder(id: string): Promise<Folder | undefined> {
    const [folder] = await db.select().from(folders).where(eq(folders.id, id));
    return folder || undefined;
  }

  async createFolder(data: InsertFolder): Promise<Folder> {
    const [folder] = await db.insert(folders).values(data).returning();
    return folder;
  }

  async updateFolder(id: string, data: Partial<InsertFolder>): Promise<Folder> {
    const [folder] = await db
      .update(folders)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(folders.id, id))
      .returning();
    return folder;
  }

  async deleteFolder(id: string): Promise<void> {
    await db.delete(folders).where(eq(folders.id, id));
  }

  async updateVideoFolder(oldFolderId: string, newFolderId: string | null): Promise<void> {
    await db
      .update(videoJobs)
      .set({ folderId: newFolderId })
      .where(eq(videoJobs.folderId, oldFolderId));
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

  // Chain job operations
  async createChainJob(insertJob: InsertChainJob): Promise<ChainJob> {
    const [job] = await db
      .insert(chainJobs)
      .values({
        ...insertJob,
        status: "queued",
        progress: 0,
      })
      .returning();
    return job;
  }

  async getChainJob(id: string): Promise<ChainJob | undefined> {
    const [job] = await db.select().from(chainJobs).where(eq(chainJobs.id, id));
    return job || undefined;
  }

  async getAllChainJobs(): Promise<ChainJob[]> {
    const jobs = await db.select().from(chainJobs).orderBy(desc(chainJobs.createdAt));
    return jobs;
  }

  async updateChainJobStatus(id: string, status: string, progress?: number, errorMessage?: string): Promise<void> {
    await db.update(chainJobs)
      .set({
        status,
        progress: progress ?? undefined,
        errorMessage: errorMessage ?? undefined,
        updatedAt: new Date(),
      })
      .where(eq(chainJobs.id, id));
  }

  async updateChainJobPlan(id: string, planJson: string, segmentJobIds?: string[]): Promise<void> {
    await db.update(chainJobs)
      .set({
        planJson,
        segmentJobIds: segmentJobIds ?? undefined,
        updatedAt: new Date(),
      })
      .where(eq(chainJobs.id, id));
  }

  async updateChainJobResults(id: string, finalVideoUrl: string, thumbnailUrl?: string, costDetails?: string): Promise<void> {
    await db.update(chainJobs)
      .set({
        finalVideoUrl,
        thumbnailUrl: thumbnailUrl ?? undefined,
        costDetails: costDetails ?? undefined,
        updatedAt: new Date(),
      })
      .where(eq(chainJobs.id, id));
  }

  async deleteChainJob(id: string): Promise<void> {
    await db.delete(chainJobs).where(eq(chainJobs.id, id));
  }
}

export const storage = new DatabaseStorage();
