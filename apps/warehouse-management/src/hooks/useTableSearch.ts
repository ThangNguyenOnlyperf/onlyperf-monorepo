import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useDebounce } from './useDebounce';

interface UseTableSearchOptions {
  searchParamName?: string;
  debounceMs?: number;
  onSearch?: (query: string) => void;
}

interface UseTableSearchReturn {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  debouncedQuery: string;
  isSearching: boolean;
  clearSearch: () => void;
  updateUrlParams: (params: Record<string, string | undefined>) => void;
}

/**
 * Custom hook for managing table search with URL synchronization
 * Provides debounced search, URL state management, and loading states
 */
export function useTableSearch({
  searchParamName = 'q',
  debounceMs = 300,
  onSearch
}: UseTableSearchOptions = {}): UseTableSearchReturn {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Initialize search query from URL
  const [searchQuery, setSearchQuery] = useState(
    searchParams.get(searchParamName) || ''
  );
  const [isSearching, setIsSearching] = useState(false);
  
  // Debounce the search query
  const debouncedQuery = useDebounce(searchQuery, debounceMs);
  
  // Update URL when debounced query changes
  useEffect(() => {
    const params = new URLSearchParams(searchParams);
    
    if (debouncedQuery) {
      params.set(searchParamName, debouncedQuery);
      params.set('page', '1'); // Reset to first page on new search
    } else {
      params.delete(searchParamName);
    }
    
    // Update URL without navigation
    router.replace(`?${params.toString()}`, { scroll: false });
    
    // Call onSearch callback if provided
    if (onSearch) {
      setIsSearching(true);
      onSearch(debouncedQuery);
      // Assume onSearch is async and will handle its own loading state
      setTimeout(() => setIsSearching(false), 100);
    }
  }, [debouncedQuery, router, searchParams, searchParamName, onSearch]);
  
  // Clear search function
  const clearSearch = useCallback(() => {
    setSearchQuery('');
  }, []);
  
  // Generic function to update any URL params
  const updateUrlParams = useCallback((params: Record<string, string | undefined>) => {
    const newParams = new URLSearchParams(searchParams);
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        newParams.set(key, value);
      } else {
        newParams.delete(key);
      }
    });
    
    router.replace(`?${newParams.toString()}`, { scroll: false });
  }, [router, searchParams]);
  
  return {
    searchQuery,
    setSearchQuery,
    debouncedQuery,
    isSearching,
    clearSearch,
    updateUrlParams
  };
}

/**
 * Hook for managing paginated table data with search
 */
interface UsePaginatedSearchOptions<T> {
  fetchData: (params: {
    query?: string;
    page?: number;
    pageSize?: number;
    filters?: Record<string, any>;
  }) => Promise<{
    data: T[];
    totalItems: number;
    totalPages: number;
  }>;
  initialData?: T[];
  pageSize?: number;
}

export function usePaginatedSearch<T>({
  fetchData,
  initialData = [],
  pageSize = 20
}: UsePaginatedSearchOptions<T>) {
  const searchParams = useSearchParams();
  const [data, setData] = useState<T[]>(initialData);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  
  const currentPage = parseInt(searchParams.get('page') || '1', 10);
  const searchQuery = searchParams.get('q') || '';
  
  const { updateUrlParams } = useTableSearch();
  
  // Fetch data when search params change
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const result = await fetchData({
          query: searchQuery,
          page: currentPage,
          pageSize,
          filters: {} // Extract other filters from searchParams as needed
        });
        
        setData(result.data);
        setTotalPages(result.totalPages);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, [searchQuery, currentPage, pageSize, fetchData]);
  
  const handlePageChange = (page: number) => {
    updateUrlParams({ page: page.toString() });
  };
  
  return {
    data,
    loading,
    currentPage,
    totalPages,
    handlePageChange
  };
}