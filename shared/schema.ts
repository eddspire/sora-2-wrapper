import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Video jobs table - tracks all video generation requests
export const videoJobs = pgTable("video_jobs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  prompt: text("prompt").notNull(),
  status: varchar("status", { length: 20 }).notNull().default("queued"), // queued, in_progress, completed, failed
  progress: integer("progress").default(0), // 0-100
  videoId: varchar("video_id"), // OpenAI video ID
  videoUrl: text("video_url"), // URL to stored video in object storage
  thumbnailUrl: text("thumbnail_url"), // URL to thumbnail
  errorMessage: text("error_message"),
  model: varchar("model", { length: 50 }).notNull().default("sora-2-pro"),
  size: varchar("size", { length: 20 }).default("1280x720"),
  seconds: varchar("seconds", { length: 10 }).default("8"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Insert schemas for validation
export const insertVideoJobSchema = createInsertSchema(videoJobs).pick({
  prompt: true,
  model: true,
  size: true,
  seconds: true,
}).extend({
  prompt: z.string().min(10, "Prompt must be at least 10 characters").max(1000, "Prompt must be less than 1000 characters"),
});

// Types
export type InsertVideoJob = z.infer<typeof insertVideoJobSchema>;
export type VideoJob = typeof videoJobs.$inferSelect;
export type VideoJobStatus = "queued" | "in_progress" | "completed" | "failed";
