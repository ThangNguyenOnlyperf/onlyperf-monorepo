import { Redis } from '@upstash/redis';

// Redis client singleton for Upstash
export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

/**
 * Get Redis channel key for assembly events
 */
export const getAssemblyChannel = (bundleId: string) => `assembly:events:${bundleId}`;

/**
 * TTL for assembly events (auto-cleanup)
 */
export const EVENT_TTL_SECONDS = 60;
