import type { VideoJob, Webhook } from "@shared/schema";
import { storage } from "./storage";

interface WebhookPayload {
  event: "completed" | "failed";
  job: VideoJob;
  timestamp: string;
}

export class WebhookService {
  private readonly maxRetries = 3;
  private readonly retryDelays = [1000, 3000, 5000]; // ms

  async triggerWebhooks(event: "completed" | "failed", job: VideoJob): Promise<void> {
    try {
      const webhooks = await storage.getActiveWebhooks();
      
      // Filter webhooks that subscribe to this event
      const relevantWebhooks = webhooks.filter(webhook => 
        webhook.events.includes(event)
      );

      if (relevantWebhooks.length === 0) {
        return;
      }

      const payload: WebhookPayload = {
        event,
        job,
        timestamp: new Date().toISOString(),
      };

      // Send webhooks in parallel
      await Promise.allSettled(
        relevantWebhooks.map(webhook => 
          this.sendWebhookWithRetry(webhook, payload)
        )
      );
    } catch (error) {
      console.error("Error triggering webhooks:", error);
    }
  }

  private async sendWebhookWithRetry(
    webhook: Webhook,
    payload: WebhookPayload,
    attemptNumber: number = 0
  ): Promise<void> {
    try {
      const response = await fetch(webhook.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "Sora-Video-Generator/1.0",
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(10000), // 10 second timeout
      });

      if (!response.ok) {
        throw new Error(`Webhook failed with status ${response.status}`);
      }

      console.log(`Webhook delivered successfully to ${webhook.url} (event: ${payload.event})`);
    } catch (error) {
      console.error(`Webhook delivery failed (attempt ${attemptNumber + 1}/${this.maxRetries}):`, error);

      // Retry if we haven't exceeded max retries
      if (attemptNumber < this.maxRetries - 1) {
        const delay = this.retryDelays[attemptNumber];
        console.log(`Retrying webhook in ${delay}ms...`);
        
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.sendWebhookWithRetry(webhook, payload, attemptNumber + 1);
      } else {
        console.error(`Webhook delivery failed after ${this.maxRetries} attempts:`, webhook.url);
      }
    }
  }
}

export const webhookService = new WebhookService();
