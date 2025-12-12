import type { AssemblySession } from '~/actions/assemblyActions';
import { redis, getAssemblyChannel, EVENT_TTL_SECONDS } from './redis';

/**
 * SSE Event types for assembly real-time updates
 */
export interface AssemblyEvent {
  type: 'scan_success' | 'scan_error' | 'phase_transition' | 'assembly_complete' | 'connected';
  payload?: AssemblySession;
  message?: string;
  timestamp: number;
}

/**
 * Poll Redis for assembly events and clear them after reading
 * Returns events in chronological order (oldest first)
 */
export async function pollRedisEvents(bundleId: string): Promise<AssemblyEvent[]> {
  const channel = getAssemblyChannel(bundleId);

  try {
    const events = await redis.lrange(channel, 0, -1);

    if (events.length > 0) {
      await redis.del(channel);
      // Return in chronological order (oldest first)
      return events.reverse().map((e) =>
        typeof e === 'string' ? (JSON.parse(e) as AssemblyEvent) : (e as AssemblyEvent)
      );
    }
  } catch (error) {
    console.error('Redis poll error:', error);
  }

  return [];
}

/**
 * Emit assembly event to Redis for cross-process communication
 * Events are pushed to a Redis list and polled by SSE route
 */
export async function emitAssemblyUpdate(
  bundleId: string,
  type: AssemblyEvent['type'],
  session?: AssemblySession,
  message?: string
): Promise<void> {
  const channel = getAssemblyChannel(bundleId);
  const event: AssemblyEvent = {
    type,
    payload: session,
    message,
    timestamp: Date.now(),
  };

  try {
    // Push event to Redis list
    await redis.lpush(channel, JSON.stringify(event));
    // Set TTL to auto-cleanup old events
    await redis.expire(channel, EVENT_TTL_SECONDS);
  } catch (error) {
    console.error('Failed to emit assembly update to Redis:', error);
  }
}
