type VideoUsage = {
    model: 'sora-2' | 'sora-2-pro';
    size: string;
    seconds: number;
};

export type CostDetails = {
    model: string;
    resolution: string;
    duration: number;
    pricePerSecond: number;
    totalCost: number;
};

/**
 * Calculates the cost of a Sora 2 video generation based on model, resolution, and duration.
 *
 * Pricing (as of official OpenAI pricing):
 * - sora-2 (Only supports 720p):
 *   - 720p (1280x720, 720x1280): $0.10/sec
 * - sora-2-pro:
 *   - 720p (1280x720, 720x1280): $0.30/sec
 *   - 1080p+ (1024x1792, 1792x1024): $0.50/sec
 *
 * @param usage - The usage object containing model, size, and seconds.
 * @returns CostDetails object or null if usage data is invalid.
 */
export function calculateVideoCost(usage: VideoUsage | undefined | null): CostDetails | null {
    if (!usage || !usage.model || !usage.size || typeof usage.seconds !== 'number') {
        console.warn('Invalid or missing usage data for cost calculation:', usage);
        return null;
    }

    const { model, size, seconds } = usage;

    // Parse resolution to determine pricing tier
    const [width, height] = size.split('x').map(Number);
    if (isNaN(width) || isNaN(height)) {
        console.error('Invalid size format:', size);
        return null;
    }

    // Determine if it's 720p or higher resolution
    const is720p = (width === 1280 && height === 720) || (width === 720 && height === 1280);

    let pricePerSecond: number;

    if (model === 'sora-2') {
        // Sora 2 only supports 720p resolution
        if (!is720p) {
            console.error('Sora 2 only supports 720p resolution (720x1280 or 1280x720)');
            return null;
        }
        pricePerSecond = 0.1; // 720p: $0.10/sec
    } else if (model === 'sora-2-pro') {
        pricePerSecond = is720p ? 0.3 : 0.5; // 720p: $0.30/sec, 1080p+: $0.50/sec
    } else {
        console.error('Unknown model:', model);
        return null;
    }

    const totalCost = seconds * pricePerSecond;

    // Round to 2 decimal places
    const costRounded = Math.round(totalCost * 100) / 100;

    return {
        model,
        resolution: size,
        duration: seconds,
        pricePerSecond,
        totalCost: costRounded
    };
}
