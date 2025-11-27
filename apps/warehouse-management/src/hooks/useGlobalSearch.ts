import { useState, useCallback, useRef } from "react";
import { globalSearchAction } from "~/actions/searchActions";
import type {
  ProductDocument,
  ShipmentDocument,
  ShipmentItemDocument,
  StorageDocument,
} from "~/lib/typesense-schemas";

interface SearchResults {
  products: ProductDocument[];
  shipments: ShipmentDocument[];
  items: ShipmentItemDocument[];
  storages: StorageDocument[];
}

interface UseGlobalSearchReturn {
  results: SearchResults;
  isLoading: boolean;
  error: string | null;
  search: (query: string) => Promise<void>;
  clearResults: () => void;
}

export function useGlobalSearch(): UseGlobalSearchReturn {
  const [results, setResults] = useState<SearchResults>({
    products: [],
    shipments: [],
    items: [],
    storages: [],
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const search = useCallback(async (query: string) => {
    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    if (!query.trim()) {
      clearResults();
      return;
    }

    // Create new abort controller
    abortControllerRef.current = new AbortController();

    setIsLoading(true);
    setError(null);

    try {
      const result = await globalSearchAction(query, { limit: 5 });

      // Check if request was aborted
      if (abortControllerRef.current?.signal.aborted) {
        return;
      }

      if (result.success) {
        setResults({
          products: result.products?.hits.map((hit) => hit.document) || [],
          shipments: result.shipments?.hits.map((hit) => hit.document) || [],
          items: result.items?.hits.map((hit) => hit.document) || [],
          storages: result.storages?.hits.map((hit) => hit.document) || [],
        });
      } else {
        setError(result.error || "Lỗi khi tìm kiếm");
      }
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        return;
      }
      setError("Lỗi kết nối. Vui lòng thử lại.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clearResults = useCallback(() => {
    setResults({
      products: [],
      shipments: [],
      items: [],
      storages: [],
    });
    setError(null);
  }, []);

  return {
    results,
    isLoading,
    error,
    search,
    clearResults,
  };
}