// Cost calculation utilities for Sora video generation

export interface CostBreakdown {
  model: string;
  resolution: string;
  duration: number;
  pricePerSecond: number;
  totalCost: number;
}

// Pricing tiers based on sora-2-playground
// sora-2: 720p @ $0.10/sec, 1080p @ $0.30/sec
// sora-2-pro: 720p @ $0.30/sec, 1080p @ $0.50/sec
const PRICING_TABLE: Record<string, Record<string, number>> = {
  "sora-2": {
    "720p": 0.10,
    "1080p": 0.30,
  },
  "sora-2-pro": {
    "720p": 0.30,
    "1080p": 0.50,
  },
};

function getResolutionTier(size: string): "720p" | "1080p" {
  // 720p resolutions
  if (size === "1280x720" || size === "720x1280") {
    return "720p";
  }
  // 1080p resolutions
  if (size === "1920x1080" || size === "1080x1920" || size === "1024x1792" || size === "1792x1024") {
    return "1080p";
  }
  // Default to 720p
  return "720p";
}

export function calculateCost(model: string, size: string, seconds: number): CostBreakdown {
  const tier = getResolutionTier(size);
  const pricePerSecond = PRICING_TABLE[model]?.[tier] || PRICING_TABLE["sora-2-pro"]["720p"];
  const totalCost = pricePerSecond * seconds;

  return {
    model,
    resolution: tier,
    duration: seconds,
    pricePerSecond,
    totalCost: parseFloat(totalCost.toFixed(2)),
  };
}

export function formatCost(cost: number): string {
  return `$${cost.toFixed(2)}`;
}
