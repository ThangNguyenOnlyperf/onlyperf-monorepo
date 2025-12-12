import type { NextRequest } from 'next/server';
import { headers } from 'next/headers';
import { auth } from '~/lib/auth';
import { pollRedisEvents } from '~/lib/sse-emitter';

const HEARTBEAT_INTERVAL = 30000; // 30 seconds
const POLL_INTERVAL = 500; // 500ms - poll Redis for new events

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: bundleId } = await params;

  // Verify authentication
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return new Response('Unauthorized', { status: 401 });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      // Send initial connection event
      const connectEvent = `data: ${JSON.stringify({ type: 'connected', timestamp: Date.now() })}\n\n`;
      controller.enqueue(encoder.encode(connectEvent));

      // Poll Redis for new events
      const pollInterval = setInterval(() => {
        void (async () => {
          const events = await pollRedisEvents(bundleId);
          for (const event of events) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
          }
        })();
      }, POLL_INTERVAL);

      // Heartbeat to keep connection alive
      const heartbeatInterval = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: heartbeat\n\n`));
        } catch {
          // Connection closed
          clearInterval(heartbeatInterval);
          clearInterval(pollInterval);
        }
      }, HEARTBEAT_INTERVAL);

      // Cleanup on abort (client disconnect)
      request.signal.addEventListener('abort', () => {
        clearInterval(heartbeatInterval);
        clearInterval(pollInterval);
        try {
          controller.close();
        } catch {
          // Already closed
        }
      });
    },

    cancel() {
      // Called when the stream is cancelled
      // Cleanup is handled in abort listener
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no', // Disable nginx buffering
    },
  });
}
