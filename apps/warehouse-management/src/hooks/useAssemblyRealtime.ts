'use client';

import { useEffect, useCallback, useRef, useState } from 'react';
import type { AssemblySession } from '~/actions/assemblyActions';
import type { AssemblyEvent } from '~/lib/sse-emitter';

interface UseAssemblyRealtimeOptions {
  bundleId: string;
  enabled?: boolean;
  onSessionUpdate?: (session: AssemblySession) => void;
  onError?: (error: Error) => void;
}

interface UseAssemblyRealtimeReturn {
  isConnected: boolean;
  connectionError: Error | null;
  reconnect: () => void;
}

const RECONNECT_DELAY = 3000; // 3 seconds

export function useAssemblyRealtime({
  bundleId,
  enabled = true,
  onSessionUpdate,
  onError,
}: UseAssemblyRealtimeOptions): UseAssemblyRealtimeReturn {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<Error | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const mountedRef = useRef(true);

  const connect = useCallback(() => {
    if (!enabled || !bundleId) return;

    // Close existing connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    // Clear any pending reconnect
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    const eventSource = new EventSource(`/api/assembly/${bundleId}/sse`);
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      if (!mountedRef.current) return;
      setIsConnected(true);
      setConnectionError(null);
    };

    eventSource.onmessage = (event) => {
      if (!mountedRef.current) return;

      try {
        const data = JSON.parse(event.data) as AssemblyEvent;

        // Skip connection event, only process updates with payload
        if (data.type !== 'connected' && data.payload) {
          onSessionUpdate?.(data.payload);
        }
      } catch (err) {
        console.error('Failed to parse SSE event:', err);
      }
    };

    eventSource.onerror = () => {
      if (!mountedRef.current) return;

      setIsConnected(false);
      const error = new Error('Connection lost');
      setConnectionError(error);
      onError?.(error);

      // Auto-reconnect after delay
      eventSource.close();
      reconnectTimeoutRef.current = setTimeout(() => {
        if (mountedRef.current) {
          connect();
        }
      }, RECONNECT_DELAY);
    };
  }, [bundleId, enabled, onSessionUpdate, onError]);

  useEffect(() => {
    mountedRef.current = true;
    connect();

    return () => {
      mountedRef.current = false;

      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }

      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
    };
  }, [connect]);

  return {
    isConnected,
    connectionError,
    reconnect: connect,
  };
}
