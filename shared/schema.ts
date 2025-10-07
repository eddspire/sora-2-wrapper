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
  seconds: integer("seconds").notNull().default(8),
  inputReferenceUrl: text("input_reference_url"), // URL to uploaded image/video reference
  costDetails: text("cost_details"), // JSON string of cost breakdown
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Insert schemas for validation
export const insertVideoJobSchema = createInsertSchema(videoJobs).pick({
  prompt: true,
  model: true,
  size: true,
  seconds: true,
  inputReferenceUrl: true,
}).extend({
  prompt: z.string().min(10, "Prompt must be at least 10 characters").max(1000, "Prompt must be less than 1000 characters"),
  seconds: z.number().int().min(4).max(12),
  inputReferenceUrl: z.string().optional(),
});

// Types
export type InsertVideoJob = z.infer<typeof insertVideoJobSchema>;
export type VideoJob = typeof videoJobs.$inferSelect;
export type VideoJobStatus = "queued" | "in_progress" | "completed" | "failed";

// Webhooks table - stores webhook configurations for job notifications
export const webhooks = pgTable("webhooks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  url: text("url").notNull(),
  events: text("events").array().notNull().default(sql`ARRAY['completed', 'failed']::text[]`), // Events to trigger on
  isActive: integer("is_active").notNull().default(1), // 1 = active, 0 = inactive (using integer for boolean)
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Insert schemas for webhooks
export const insertWebhookSchema = createInsertSchema(webhooks).pick({
  url: true,
  events: true,
  isActive: true,
}).extend({
  url: z.string().url("Must be a valid URL"),
  events: z.array(z.enum(["completed", "failed"])).min(1, "Select at least one event"),
  isActive: z.number().min(0).max(1).optional(),
});

// Webhook types
export type InsertWebhook = z.infer<typeof insertWebhookSchema>;
export type Webhook = typeof webhooks.$inferSelect;

// Settings table - stores application configuration
export const settings = pgTable("settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  key: varchar("key", { length: 100 }).notNull().unique(),
  value: text("value").notNull(),
  description: text("description"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Insert schema for settings
export const insertSettingSchema = createInsertSchema(settings).pick({
  key: true,
  value: true,
  description: true,
}).extend({
  key: z.string().min(1),
  value: z.string(),
  description: z.string().optional(),
});

// Settings update schema (for updating multiple settings at once)
export const updateSettingsSchema = z.object({
  maxConcurrentJobs: z.string()
    .min(1, "Max concurrent jobs is required")
    .refine(
      (val) => {
        const num = parseInt(val, 10);
        return !isNaN(num) && num >= 1;
      },
      { message: "Max concurrent jobs must be at least 1" }
    ),
});

// Setting types
export type InsertSetting = z.infer<typeof insertSettingSchema>;
export type UpdateSettings = z.infer<typeof updateSettingsSchema>;
export type Setting = typeof settings.$inferSelect;
