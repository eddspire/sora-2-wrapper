import { z } from 'zod';

// Chain configuration for generation
export interface ChainConfig {
  totalDuration: number;           // e.g. 48 (seconds)
  secondsPerSegment: 4 | 8 | 12;   // fixed segment length
  numSegments: number;             // derived = totalDuration / secondsPerSegment
  resolution: string;              // e.g. '1280x720'
  model: 'sora-2' | 'sora-2-pro';
  useContinuity: boolean;          // true => feed last frame as input reference
  pollingIntervalMs?: number;      // default 2000
  maxRetries?: number;             // default 2
  tempDir?: string;                // working directory for temp files
}

// Segment plan from planner
export const SegmentPlanSchema = z.object({
  title: z.string().min(1),
  seconds: z.number().int().positive(),
  prompt: z.string().min(40)
});

export const PlanSchema = z.object({
  segments: z.array(SegmentPlanSchema).min(1)
});

export type SegmentPlan = z.infer<typeof SegmentPlanSchema>;
export type Plan = z.infer<typeof PlanSchema>;

// Result for individual segment
export interface SegmentResult {
  index: number;              // 1-based segment number
  jobId: string;              // video_jobs.id
  videoPath: string;          // local path to downloaded video
  lastFramePath: string;      // local path to extracted last frame
  durationSec: number;        // actual duration
  videoUrl?: string;          // object storage URL
  thumbnailUrl?: string;      // object storage URL
}

// Final chain result
export interface ChainResult {
  finalVideoPath: string;       // local path before upload
  finalVideoUrl: string;        // object storage URL after upload
  thumbnailUrl?: string;        // object storage URL
  segments: SegmentResult[];
  metadata: {
    resolution: string;
    model: string;
    totalDuration: number;
    numSegments: number;
    totalCost: number;
  };
}

