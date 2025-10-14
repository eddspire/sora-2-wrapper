## Product Requirements Document (PRD)

### Feature: Long‑Form Chained Video Generation — TypeScript Implementation (with AI Prompt Planner)

Owner: Engineering
Status: Draft
Target: Immediate

---

### 1) Objective

Generate long videos by chaining multiple short segments with visual continuity. The system includes an LLM “Planner” that converts a base idea into N scene‑exact prompts. Each segment starts exactly at the prior segment’s last frame. Implemented in TypeScript inside the existing tool. API access and wrappers already exist and are out of scope.

Success criteria: stable 30–120s outputs; <5% chain failure; deterministic segment length; consistent resolution/fps/codec; reproducible plans from the same seed/config.

---

### 2) Scope

In: Planner prompts; JSON plan schema; TypeScript modules; chaining; last‑frame extraction; concatenation; validation; retries; metrics.
Out: API auth, UI, external storage, manual editing.

---

### 3) System Overview

1. **Planner**: LLM produces `segments[]` JSON with one prompt per segment (fixed seconds).
2. **Generator**: For each segment: call existing Sora wrapper; poll; download; extract last frame.
3. **Assembler**: Concatenate segments; normalize codec/fps; emit final MP4 and metadata.

---

### 4) TypeScript Architecture

**Modules**

* `planner.ts` — builds planner system prompt; calls your LLM wrapper; validates JSON with Zod.
* `chainManager.ts` — orchestrates the chain; hands `inputReference` to generator for continuity.
* `frameExtractor.ts` — ffmpeg last‑frame extraction.
* `videoConcatenator.ts` — ffmpeg concat (demuxer or filtergraph) with normalization.
* `types.ts` — shared types and Zod schemas.
* `metrics.ts` — timings, failures, retry counts.

**Key Types**

```ts
export interface ChainConfig {
  totalDuration: number;           // e.g. 48 (s)
  secondsPerSegment: 4 | 8 | 12;   // fixed segment length
  numSegments: number;             // derived = totalDuration / secondsPerSegment (or explicit)
  resolution: `${number}x${number}`; // e.g. '1280x720'
  model: 'sora-2' | 'sora-2-pro' | string;
  useContinuity: boolean;          // true => feed last frame
  pollingIntervalMs?: number;      // default 2000
  maxRetries?: number;             // default 2
  tempDir?: string;                // working dir
}

export interface SegmentPlan { title: string; seconds: number; prompt: string }
export interface Plan { segments: SegmentPlan[] }

export interface SegmentResult {
  index: number;
  jobId: string;
  videoPath: string;
  lastFramePath: string;
  durationSec: number;
}

export interface ChainResult {
  finalVideoPath: string;
  segments: SegmentResult[];
  metadata: Record<string, unknown>;
}
```

---

### 5) Prompting Strategy (Planner)

Goal: produce scene‑exact prompts with explicit continuity and fixed duration.

**System Prompt (TypeScript string)**

```ts
export const PLANNER_SYSTEM_PROMPT = String.raw`
You are a senior prompt director for chained video generation.
Transform a BASE PROMPT, a fixed SEGMENT LENGTH (seconds), and TOTAL SEGMENTS (N)
into N crystal‑clear shot prompts with maximum continuity.

Rules:
1) Output VALID JSON only, shape:
{
  "segments": [
    { "title": "Generation 1", "seconds": <int>, "prompt": "<prompt block>" },
    ...
  ]
}
- Every segment's "seconds" MUST equal the provided SEGMENT LENGTH.
- Each "prompt" MUST contain a short **Context** (for the model, not visible) and a **Prompt** line for the shot itself.

2) Continuity:
- Segment 1 starts from the BASE PROMPT.
- Segment k (k>1) MUST begin exactly at the final frame of segment k‑1.
- Maintain consistent subject identity, style, tone, lighting, and camera language unless told otherwise.

3) Constraints:
- Avoid real people/public figures and copyrighted characters.
- Keep content suitable for general audiences.

4) Style:
- Be specific and cinematic. Include camera motion, focal subject, composition, lighting, lens hints, and pacing.
- Avoid vague language. Prefer concrete, actionable shot directions.

5) Output JSON only. No Markdown, no backticks.`;
```

**User Prompt Template**

```ts
export function buildPlannerUserPrompt(basePrompt: string, secondsPerSegment: number, numSegments: number) {
  return [
    `BASE PROMPT: ${basePrompt}`,
    `SEGMENT LENGTH (seconds): ${secondsPerSegment}`,
    `TOTAL SEGMENTS: ${numSegments}`,
    `Return exactly ${numSegments} segments.`,
  ].join('\n');
}
```

**Example BASE PROMPT**

```
“Gameplay footage of a near‑future racing game. A car threads neon‑lit streets in a dense city at dusk.”
```

**Expected JSON (shape only)**

```json
{
  "segments": [
    {
      "title": "Generation 1",
      "seconds": 8,
      "prompt": "Context: Create the opening shot from black, reveal the car idle at an intersection...\nPrompt: Start from complete black. Fade up to a medium wide shot ..."
    },
    { "title": "Generation 2", "seconds": 8, "prompt": "Context: Continue from the exact last frame...\nPrompt: Camera booms down to street level..." }
  ]
}
```

**Validation Schema (Zod)**

```ts
import { z } from 'zod';
export const SegmentPlanSchema = z.object({
  title: z.string().min(1),
  seconds: z.number().int().positive(),
  prompt: z.string().min(40)
});
export const PlanSchema = z.object({
  segments: z.array(SegmentPlanSchema).min(1)
});
```

**Planner Call (pseudo‑TS)**

```ts
export async function planSegments(basePrompt: string, cfg: ChainConfig, llm: { respond: (sys: string, user: string) => Promise<string> }): Promise<SegmentPlan[]> {
  const user = buildPlannerUserPrompt(basePrompt, cfg.secondsPerSegment, cfg.numSegments);
  const raw = await llm.respond(PLANNER_SYSTEM_PROMPT, user);
  const json = JSON.parse(raw);
  const plan = PlanSchema.parse(json);
  // Enforce exact seconds
  plan.segments.forEach(s => { s.seconds = cfg.secondsPerSegment; });
  if (plan.segments.length !== cfg.numSegments) {
    // clamp or throw; we clamp here
    (plan.segments as SegmentPlan[]).length = cfg.numSegments;
  }
  return plan.segments as SegmentPlan[];
}
```

---

### 6) Segment Prompt Format (what we send to generation)

For each segment we pass `prompt` verbatim. The `Context` remains inside the text for guidance; the model will not render it visually. We also pass `seconds`, `resolution`, and, if `useContinuity=true`, the `inputReference` file path from the previous segment’s last frame.

**Prompt Block Requirements**

* First lines: `Context` with 2–5 bullets specifying continuity, subject, lighting, style anchors.
* Final line: `Prompt:` with the concrete camera + action for this segment.
* No Markdown syntax. Keep plain text.

**Concrete Example (Segment 2)**

```
Context (for AI guidance only):
* This is the second part of a near‑future racing sequence.
* The previous 8‑second scene ended on a 3/4 front view of the car, neon reflections visible on wet asphalt.
* Maintain dusk lighting, cool neon rim lights, shallow depth of field at 35mm eq.
* Keep the same car color and decal pattern.

Prompt: Begin exactly from the last frame. Dolly forward as the car launches, camera tracks left to right, rain mist trailing the rear tires; hold the skyline bokeh consistent, ensure wheel motion blur and wet surface reflections remain coherent.
```

---

### 7) Chaining & Generation (TypeScript)

**chainManager.ts (core)**

```ts
import path from 'path';
import fs from 'fs/promises';
import { planSegments, SegmentPlan } from './planner';
import { extractLastFrame } from './frameExtractor';
import { concatVideos } from './videoConcatenator';
import { ChainConfig, ChainResult, SegmentResult } from './types';

// Assumes you have a Sora wrapper with these methods
type SoraWrapper = {
  createVideo: (args: { prompt: string; seconds: number; size: string; model: string; inputReference?: string }) => Promise<{ id: string }>;
  waitForCompletion: (id: string, opts?: { intervalMs?: number }) => Promise<{ id: string; status: 'completed'|'failed'; error?: string }>;
  downloadVideo: (id: string, outPath: string) => Promise<string>;
};

export async function generateLongVideo(basePrompt: string, cfg: ChainConfig, llm: any, sora: SoraWrapper): Promise<ChainResult> {
  const segments: SegmentPlan[] = await planSegments(basePrompt, cfg, llm);
  const outDir = cfg.tempDir ?? path.resolve('.tmp_chain');
  await fs.mkdir(outDir, { recursive: true });

  let inputRef: string | undefined;
  const results: SegmentResult[] = [];

  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    let attempt = 0, done = false, lastErr: unknown;

    while (!done && attempt <= (cfg.maxRetries ?? 2)) {
      try {
        const job = await sora.createVideo({
          prompt: seg.prompt,
          seconds: seg.seconds,
          size: cfg.resolution,
          model: cfg.model,
          inputReference: cfg.useContinuity && inputRef ? inputRef : undefined,
        });
        const polled = await sora.waitForCompletion(job.id, { intervalMs: cfg.pollingIntervalMs ?? 2000 });
        if (polled.status !== 'completed') throw new Error(polled.error || 'generation failed');

        const videoPath = path.join(outDir, `segment_${String(i+1).padStart(2,'0')}.mp4`);
        await sora.downloadVideo(job.id, videoPath);

        const lastFramePath = path.join(outDir, `segment_${String(i+1).padStart(2,'0')}_last.jpg`);
        await extractLastFrame(videoPath, lastFramePath);
        inputRef = lastFramePath;

        results.push({ index: i+1, jobId: job.id, videoPath, lastFramePath, durationSec: seg.seconds });
        done = true;
      } catch (err) {
        lastErr = err; attempt++;
        if (attempt > (cfg.maxRetries ?? 2)) throw err;
      }
    }
  }

  const finalVideoPath = path.join(outDir, 'combined.mp4');
  await concatVideos(results.map(r => r.videoPath), finalVideoPath);

  return { finalVideoPath, segments: results, metadata: { resolution: cfg.resolution, model: cfg.model } };
}
```

**frameExtractor.ts**

```ts
import { spawn } from 'child_process';
export async function extractLastFrame(videoPath: string, outJpgPath: string): Promise<void> {
  // Grab near the end; safer than relying on frame count parity across codecs
  await new Promise<void>((resolve, reject) => {
    const ff = spawn('ffmpeg', ['-sseof', '-0.1', '-i', videoPath, '-vframes', '1', '-q:v', '2', outJpgPath]);
    ff.on('error', reject);
    ff.on('exit', code => code === 0 ? resolve() : reject(new Error(`ffmpeg ${code}`)));
  });
}
```

**videoConcatenator.ts**

```ts
import fs from 'fs/promises';
import path from 'path';
import { spawn } from 'child_process';

export async function concatVideos(paths: string[], outPath: string): Promise<void> {
  const listFile = path.join(path.dirname(outPath), 'concat_list.txt');
  await fs.writeFile(listFile, paths.map(p => `file '${p}'`).join('\n'));
  await new Promise<void>((resolve, reject) => {
    const ff = spawn('ffmpeg', ['-f', 'concat', '-safe', '0', '-i', listFile, '-c', 'copy', outPath]);
    ff.on('error', reject);
    ff.on('exit', code => code === 0 ? resolve() : reject(new Error(`ffmpeg ${code}`)));
  });
}
```

---

### 8) Example Planner Outputs

**Example 1 (device reveal)** — 3×6s

```
Generation 1:
Context: Opening shot for a premium device reveal. Start from darkness; subject is centered, glossy finishes visible, studio rim light.
Prompt: From black, fade up to a straight‑on medium shot of the device front; hold 2s, subtle parallax drift; emphasize edge‑to‑edge glass.

Generation 2:
Context: Continue from last frame; same studio lighting; maintain premium aesthetic.
Prompt: Begin at previous frame. Rotate device 90° to showcase back chassis and camera island; slow, even motion; keep specular highlights consistent.

Generation 3:
Context: Continue from last frame; now reveal usability.
Prompt: From same position, a hand enters, picks up device, rotates to front; screen wakes to bright homescreen; end on logo over white.
```

**Example 2 (racing city)** — 4×8s

```
G1: Context: Establish dusk city, wet street reflections, idle car front‑3/4. Prompt: Fade from black; crane move reveals neon bokeh; car idles.
G2: Context: Continue; same lens, same paint/decal. Prompt: From last frame, dolly in as car launches; maintain rim light; tire spray.
G3: Context: Continue; weave through traffic. Prompt: Match cut to bumper cam; rapid parallax; motion blur consistent; sparks from guardrail kiss.
G4: Context: Finale. Prompt: Pull up to aerial as car exits to bridge; hold skyline; then fast dip‑to‑black.
```

---

### 9) Validation & Safeguards

* Enforce `seconds == cfg.secondsPerSegment` after plan parse.
* Reject plans with fewer/extra segments unless clamped explicitly.
* Normalize resolution/fps at concat step if copy‑codec fails; fallback to re‑encode:

```bash
ffmpeg -i input -r 24 -vf scale=1280:720 -c:v libx264 -preset medium -crf 18 -pix_fmt yuv420p -c:a aac out.mp4
```

* Retry policy: exponential backoff per segment; hard cap retries; preserve partial outputs for debugging.

---

### 10) Telemetry

* Per‑segment timings (queue → complete), retry counts, error codes.
* Plan hash (sha256 of planner JSON) for reproducibility.
* Final artifact byte size, fps, resolution, duration.

---

### 11) Deliverables

* `planner.ts` with system prompt, builder, Zod validation, tests.
* `chainManager.ts` orchestration with retries and metadata.
* `frameExtractor.ts`, `videoConcatenator.ts` with ffmpeg integration.
* Example scripts and fixtures for planner outputs.
* README documenting prompt format and usage.
