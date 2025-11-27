'use client';

import { useQuery } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { getPendingFulfillmentCountAction, type PendingFulfillmentCount } from '~/actions/fulfillmentActions';

interface UsePendingFulfillmentsOptions {
  enabled?: boolean;
  refetchInterval?: number;
  onNewOrders?: (newOrders: PendingFulfillmentCount['orders']) => void;
}

export function usePendingFulfillments(options: UsePendingFulfillmentsOptions = {}) {
  const {
    enabled = true,
    refetchInterval = 30000, // Poll every 30 seconds
    onNewOrders,
  } = options;

  const previousCountRef = useRef<number | null>(null);
  const previousOrderIdsRef = useRef<Set<string>>(new Set());

  const query = useQuery({
    queryKey: ['pendingFulfillments'],
    queryFn: async () => {
      const result = await getPendingFulfillmentCountAction();
      if (result.success && result.data) {
        return result.data;
      }
      throw new Error(result.message);
    },
    enabled,
    refetchInterval,
    refetchOnWindowFocus: true,
    staleTime: 0, // Always consider stale to enable polling
  });

  // Detect new orders
  useEffect(() => {
    if (query.data && onNewOrders) {
      const currentCount = query.data.count;
      const currentOrderIds = new Set(query.data.orders.map(o => o.orderId));

      // Check if this is not the first load
      if (previousCountRef.current !== null) {
        // Find new order IDs that weren't in the previous set
        const newOrders = query.data.orders.filter(
          order => !previousOrderIdsRef.current.has(order.orderId)
        );

        // If we have new orders, trigger the callback
        if (newOrders.length > 0) {
          onNewOrders(newOrders);
        }
      }

      // Update refs for next comparison
      previousCountRef.current = currentCount;
      previousOrderIdsRef.current = currentOrderIds;
    }
  }, [query.data, onNewOrders]);

  return {
    count: query.data?.count ?? 0,
    orders: query.data?.orders ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}
