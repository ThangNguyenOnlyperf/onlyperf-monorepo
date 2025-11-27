"use server";

import { typesenseClient, optimizeSearch } from "~/lib/typesense";
import type { SearchParams, SearchResult } from "~/lib/typesense";
import {
  COLLECTIONS,
  COMMON_FACETS
} from "~/lib/typesense-schemas";
import type {
  ProductDocument,
  ShipmentDocument,
  ShipmentItemDocument,
  StorageDocument
} from "~/lib/typesense-schemas";
import { logger } from '~/lib/logger';

export interface SearchActionResult<T> {
  success: boolean;
  data?: any; // Using any to avoid TypeScript issues with Typesense types
  error?: string;
}

// Search products
export async function searchProductsAction(
  query: string,
  options?: {
    filter?: string;
    page?: number;
    perPage?: number;
    sortBy?: string;
  }
): Promise<SearchActionResult<ProductDocument>> {
  try {
    // Check if query looks like a QR code
    const isQRCode = /^PB\d{11}$/.test(query.trim());
    
    const searchParams: SearchParams = optimizeSearch({
      q: isQRCode ? `"${query}"` : query,
      query_by: 'name,brand,model,qr_code,description',
      query_by_weights: '3,2,2,4,1',
      filter_by: options?.filter,
      sort_by: options?.sortBy || '_text_match:desc,created_at:desc',
      facet_by: COMMON_FACETS.products,
      page: options?.page || 1,
      per_page: options?.perPage || 20,
      highlight_fields: 'name,brand,model',
      highlight_start_tag: '<mark>',
      highlight_end_tag: '</mark>',
      num_typos: isQRCode ? 0 : undefined, // No typos for QR codes
    });

    const result = await typesenseClient
      .collections<ProductDocument>(COLLECTIONS.PRODUCTS)
      .documents()
      .search(searchParams as any);

    return { success: true, data: result };
  } catch (error) {
    logger.error({ error }, 'Product search error:');
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Lỗi tìm kiếm sản phẩm' 
    };
  }
}

// Search shipments
export async function searchShipmentsAction(
  query: string,
  options?: {
    filter?: string;
    page?: number;
    perPage?: number;
    sortBy?: string;
    dateFrom?: Date;
    dateTo?: Date;
  }
): Promise<SearchActionResult<ShipmentDocument>> {
  try {
    // Build filter
    let filter = options?.filter || '';
    if (options?.dateFrom || options?.dateTo) {
      const dateFilter = [];
      if (options.dateFrom) {
        dateFilter.push(`receipt_date:>=${Math.floor(options.dateFrom.getTime() / 1000)}`);
      }
      if (options.dateTo) {
        dateFilter.push(`receipt_date:<=${Math.floor(options.dateTo.getTime() / 1000)}`);
      }
      filter = filter ? `${filter} && ${dateFilter.join(' && ')}` : dateFilter.join(' && ');
    }

    const searchParams: SearchParams = optimizeSearch({
      q: query,
      query_by: 'receipt_number,supplier_name,notes',
      query_by_weights: '4,3,1',
      filter_by: filter,
      sort_by: options?.sortBy || '_text_match:desc,receipt_date:desc',
      facet_by: COMMON_FACETS.shipments,
      page: options?.page || 1,
      per_page: options?.perPage || 20,
      highlight_fields: 'receipt_number,supplier_name',
      highlight_start_tag: '<mark>',
      highlight_end_tag: '</mark>',
    });

    const result = await typesenseClient
      .collections<ShipmentDocument>(COLLECTIONS.SHIPMENTS)
      .documents()
      .search(searchParams as any);

    return { success: true, data: result };
  } catch (error) {
    logger.error({ error }, 'Shipment search error:');
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Lỗi tìm kiếm phiếu nhập' 
    };
  }
}

// Search by QR code (shipment items)
export async function searchByQRCodeAction(
  qrCode: string
): Promise<SearchActionResult<ShipmentItemDocument>> {
  try {
    // Extract QR code from URL if needed
    const qrCodePattern = /PB\d{11}/;
    const match = qrCodePattern.exec(qrCode);
    const searchCode = match ? match[0] : qrCode;

    const searchParams: SearchParams = {
      q: searchCode,
      query_by: 'qr_code',
      query_by_weights: '5',
      filter_by: '',
      per_page: 1,
      highlight_fields: 'qr_code',
      highlight_start_tag: '<mark>',
      highlight_end_tag: '</mark>',
    };

    const result = await typesenseClient
      .collections<ShipmentItemDocument>(COLLECTIONS.SHIPMENT_ITEMS)
      .documents()
      .search(searchParams as any);

    return { success: true, data: result };
  } catch (error) {
    logger.error({ error }, 'QR code search error:');
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Lỗi tìm kiếm mã QR' 
    };
  }
}

// Search storages
export async function searchStoragesAction(
  query: string,
  options?: {
    filter?: string;
    page?: number;
    perPage?: number;
    sortBy?: string;
    minCapacity?: number;
    maxUtilization?: number;
  }
): Promise<SearchActionResult<StorageDocument>> {
  try {
    // Build filter
    let filter = options?.filter || '';
    const additionalFilters = [];
    
    if (options?.minCapacity !== undefined) {
      additionalFilters.push(`available_capacity:>=${options.minCapacity}`);
    }
    
    if (options?.maxUtilization !== undefined) {
      additionalFilters.push(`utilization_rate:<=${options.maxUtilization}`);
    }
    
    if (additionalFilters.length > 0) {
      filter = filter 
        ? `${filter} && ${additionalFilters.join(' && ')}` 
        : additionalFilters.join(' && ');
    }

    const searchParams: SearchParams = optimizeSearch({
      q: query,
      query_by: 'name,location',
      query_by_weights: '3,2',
      filter_by: filter,
      sort_by: options?.sortBy || '_text_match:desc,priority:asc',
      facet_by: COMMON_FACETS.storages,
      page: options?.page || 1,
      per_page: options?.perPage || 20,
      highlight_fields: 'name,location',
      highlight_start_tag: '<mark>',
      highlight_end_tag: '</mark>',
    });

    const result = await typesenseClient
      .collections<StorageDocument>(COLLECTIONS.STORAGES)
      .documents()
      .search(searchParams as any);

    return { success: true, data: result };
  } catch (error) {
    logger.error({ error }, 'Storage search error:');
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Lỗi tìm kiếm kho' 
    };
  }
}

// Multi-collection search for global search
export async function globalSearchAction(
  query: string,
  options?: {
    limit?: number;
  }
): Promise<{
  success: boolean;
  error?: string;
  products?: SearchResult<ProductDocument>;
  shipments?: SearchResult<ShipmentDocument>;
  items?: SearchResult<ShipmentItemDocument>;
  storages?: SearchResult<StorageDocument>;
}> {
  logger.info({ query, options }, "searchActions: globalSearchAction called");

  try {
    const limit = options?.limit || 5;
    
    // Check if query looks like a QR code
    const isQRCode = /^PB\d{11}$/.test(query.trim());

    // Prepare search requests for all collections
    const searches: any[] = [
      {
        collection: COLLECTIONS.PRODUCTS,
        ...optimizeSearch({
          q: query,
          query_by: 'name,brand,model,qr_code',
          query_by_weights: '3,2,2,4',
          per_page: limit,
        }),
      },
      {
        collection: COLLECTIONS.SHIPMENTS,
        ...optimizeSearch({
          q: query,
          query_by: 'receipt_number,supplier_name',
          query_by_weights: '4,3',
          per_page: limit,
        }),
      },
      {
        collection: COLLECTIONS.SHIPMENT_ITEMS,
        ...optimizeSearch({
          q: isQRCode ? `"${query}"` : query, // Exact match for QR codes
          query_by: 'qr_code,product_name,product_brand,product_model',
          query_by_weights: '5,3,2,2',
          per_page: limit,
          num_typos: isQRCode ? 0 : 2, // No typos for QR codes
        }),
      },
      {
        collection: COLLECTIONS.STORAGES,
        ...optimizeSearch({
          q: query,
          query_by: 'name,location',
          query_by_weights: '3,2',
          per_page: limit,
        }),
      },
    ];

    logger.info({ searches }, "searchActions: Performing multi-search");
    const results = await typesenseClient.multiSearch.perform({ searches });
    logger.info({ results }, "searchActions: Multi-search results");

    return {
      success: true,
      products: (results.results[0] || {}) as SearchResult<ProductDocument>,
      shipments: (results.results[1] || {}) as SearchResult<ShipmentDocument>,
      items: (results.results[2] || {}) as SearchResult<ShipmentItemDocument>,
      storages: (results.results[3] || {}) as SearchResult<StorageDocument>,
    };
  } catch (error) {
    logger.error({ error }, 'Global search error:');
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Lỗi tìm kiếm' 
    };
  }
}

// Get search suggestions
export async function getSearchSuggestionsAction(
  query: string,
  collection: keyof typeof COLLECTIONS
): Promise<{
  success: boolean;
  suggestions?: string[];
  error?: string;
}> {
  try {
    const query_by = collection === 'PRODUCTS' ? 'name,brand,model' :
                     collection === 'SHIPMENTS' ? 'receipt_number,supplier_name' :
                     collection === 'STORAGES' ? 'name,location' : 'qr_code';
    
    const baseParams = optimizeSearch({ 
      q: query,
      query_by: query_by 
    });
    
    const searchParams: SearchParams = {
      ...baseParams,
      per_page: 5,
      include_fields: collection === 'PRODUCTS' ? 'name,brand,model' :
                      collection === 'SHIPMENTS' ? 'receipt_number,supplier_name' :
                      collection === 'STORAGES' ? 'name' : 'qr_code',
    };

    const result = await typesenseClient
      .collections(COLLECTIONS[collection])
      .documents()
      .search(searchParams as any);

    // Extract unique suggestions from results
    const suggestions = new Set<string>();
    
    if (result.hits) {
      result.hits.forEach(hit => {
        const doc = hit.document as any;
        if (collection === 'PRODUCTS' && 'name' in doc) {
          suggestions.add(doc.name);
        } else if (collection === 'SHIPMENTS' && 'receipt_number' in doc) {
          suggestions.add(doc.receipt_number);
          if (doc.supplier_name) suggestions.add(doc.supplier_name);
        } else if (collection === 'STORAGES' && 'name' in doc) {
          suggestions.add(doc.name);
        } else if ('qr_code' in doc) {
          suggestions.add(doc.qr_code);
        }
      });
    }

    return { 
      success: true, 
      suggestions: Array.from(suggestions).slice(0, 5) 
    };
  } catch (error) {
    logger.error({ error }, 'Search suggestions error:');
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Lỗi lấy gợi ý tìm kiếm' 
    };
  }
}