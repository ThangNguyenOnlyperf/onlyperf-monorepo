import Typesense from 'typesense';
import { env } from "~/env";
import { logger } from '~/lib/logger';

export const typesenseClient = new Typesense.Client({
  nodes: [{
    host: env.TYPESENSE_HOST,
    port: parseInt(env.TYPESENSE_PORT),
    protocol: env.TYPESENSE_PROTOCOL,
  }],
  apiKey: env.TYPESENSE_API_KEY,
  connectionTimeoutSeconds: 2,
  retryIntervalSeconds: 0.1,
  healthcheckIntervalSeconds: 60,
  numRetries: 3,
  logLevel: env.NODE_ENV === 'development' ? 'debug' : 'error',
});

export interface SearchResult<T> {
  found: number;
  facet_counts?: Array<{
    field_name: string;
    counts: Array<{
      value: string;
      count: number;
    }>;
  }>;
  hits: Array<{
    document: T;
    highlight: Record<string, any>;
    text_match: number;
  }>;
  out_of: number;
  page: number;
  request_params: {
    collection_name: string;
    per_page: number;
    q: string;
  };
  search_cutoff: boolean;
  search_time_ms: number;
}

export interface MultiSearchResult<T extends Record<string, any>> {
  results: {
    [K in keyof T]: SearchResult<T[K]>;
  };
}

export interface SearchParams {
  q: string;
  query_by: string;
  filter_by?: string;
  sort_by?: string;
  facet_by?: string;
  max_facet_values?: number;
  page?: number;
  per_page?: number;
  group_by?: string;
  group_limit?: number;
  include_fields?: string;
  exclude_fields?: string;
  highlight_fields?: string;
  highlight_full_fields?: string;
  highlight_affix_num_tokens?: number;
  highlight_start_tag?: string;
  highlight_end_tag?: string;
  enable_synonyms?: boolean;
  synonym_prefix?: boolean;
  num_typos?: number;
  typo_tokens_threshold?: number;
  drop_tokens_threshold?: number;
  pinned_hits?: string;
  hidden_hits?: string;
  pre_segmented_query?: boolean;
  limit_hits?: number;
  search_cutoff_ms?: number;
  exhaustive_search?: boolean;
  use_cache?: boolean;
  cache_ttl?: number;
  min_len_1typo?: number;
  min_len_2typo?: number;
  split_join_tokens?: string;
  exhaustive_search_cutoff_ms?: number;
  enable_typos_for_numerical_tokens?: boolean;
  prefix?: boolean;
  infix?: string;
  query_by_weights?: string;
}

export async function checkCollectionExists(collectionName: string): Promise<boolean> {
  try {
    await typesenseClient.collections(collectionName).retrieve();
    return true;
  } catch (error: any) {
    if (error?.httpStatus === 404) {
      return false;
    }
    throw error;
  }
}

export async function checkTypesenseHealth(): Promise<boolean> {
  try {
    const health = await typesenseClient.health.retrieve();
    return health.ok === true;
  } catch (error) {
    logger.error({ error }, 'Typesense health check failed:');
    return false;
  }
}

export function optimizeSearch(params: SearchParams): SearchParams {
  if (!params.q) {
    logger.warn('optimizeSearch called without query');
    return params;
  }
  
  return {
    ...params,
    num_typos: params.num_typos ?? 1,
    typo_tokens_threshold: params.typo_tokens_threshold ?? 2,
    drop_tokens_threshold: params.drop_tokens_threshold ?? 2,
    min_len_1typo: params.min_len_1typo ?? 5,
    min_len_2typo: params.min_len_2typo ?? 10,
    enable_typos_for_numerical_tokens: params.enable_typos_for_numerical_tokens ?? false,
    prefix: params.prefix ?? true,
    infix: params.infix ?? 'always',
  };
}