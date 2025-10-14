import Anthropic from '@anthropic-ai/sdk';
import { PlanSchema, ChainConfig, SegmentPlan } from './types';

// The newest Anthropic model is "claude-sonnet-4-20250514"
const DEFAULT_MODEL_STR = "claude-sonnet-4-20250514";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// System prompt for the planner - transforms base prompt into N segment prompts with continuity
export const PLANNER_SYSTEM_PROMPT = String.raw`You are a senior prompt director for chained video generation.
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

/**
 * Build the user prompt for the planner
 */
export function buildPlannerUserPrompt(
  basePrompt: string, 
  secondsPerSegment: number, 
  numSegments: number
): string {
  return [
    `BASE PROMPT: ${basePrompt}`,
    `SEGMENT LENGTH (seconds): ${secondsPerSegment}`,
    `TOTAL SEGMENTS: ${numSegments}`,
    `Return exactly ${numSegments} segments.`,
  ].join('\n');
}

/**
 * Plan segments using Claude Sonnet 4.5
 * Transforms a base prompt into N scene-exact prompts with visual continuity
 */
export async function planSegments(
  basePrompt: string, 
  cfg: ChainConfig
): Promise<SegmentPlan[]> {
  try {
    const userPrompt = buildPlannerUserPrompt(
      basePrompt, 
      cfg.secondsPerSegment, 
      cfg.numSegments
    );

    console.log(`Planning ${cfg.numSegments} segments for chain...`);

    const message = await anthropic.messages.create({
      max_tokens: 10000,
      messages: [{ role: 'user', content: userPrompt }],
      system: PLANNER_SYSTEM_PROMPT,
      model: DEFAULT_MODEL_STR,
    });

    // Extract text content from response
    const textContent = message.content.find(block => block.type === 'text');
    if (!textContent || textContent.type !== 'text') {
      throw new Error('No text content in planner response');
    }

    // Parse and validate JSON
    const json = JSON.parse(textContent.text);
    const plan = PlanSchema.parse(json);

    // Enforce exact seconds per segment
    plan.segments.forEach(seg => {
      seg.seconds = cfg.secondsPerSegment;
    });

    // Ensure we have exactly the right number of segments
    if (plan.segments.length !== cfg.numSegments) {
      console.warn(`Planner returned ${plan.segments.length} segments, expected ${cfg.numSegments}. Clamping.`);
      if (plan.segments.length > cfg.numSegments) {
        plan.segments.length = cfg.numSegments;
      } else {
        throw new Error(`Planner returned too few segments: ${plan.segments.length} < ${cfg.numSegments}`);
      }
    }

    console.log(`Plan generated successfully: ${plan.segments.length} segments`);
    return plan.segments as SegmentPlan[];

  } catch (error) {
    console.error('Failed to plan segments:', error);
    throw new Error(`Segment planning failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

