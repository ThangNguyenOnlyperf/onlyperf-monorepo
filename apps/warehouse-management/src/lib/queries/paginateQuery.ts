import { type SQL, sql } from 'drizzle-orm';
import type { SQLWrapper } from 'drizzle-orm';
import type { PgTableWithColumns } from 'drizzle-orm/pg-core';

export interface PaginationParams {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResult<T> {
  data: T[];
  metadata: {
    currentPage: number;
    pageSize: number;
    totalPages: number;
    totalItems: number;
  };
}

export async function paginatedQuery<T extends PgTableWithColumns<any>>(
  db: any,
  table: T,
  params: PaginationParams,
  whereClause?: SQL | SQLWrapper
): Promise<PaginatedResult<T['$inferSelect']>> {
  const { page = 1, pageSize = 10, sortBy, sortOrder = 'asc' } = params;
  const offset = (page - 1) * pageSize;

  let query = db.select().from(table);

  if (whereClause) {
    query = query.where(whereClause);
  }

  if (sortBy) {
    const sortColumn = (table as any)[sortBy];
    if (sortColumn) {
      query = query.orderBy(sortOrder === 'desc' ? sortColumn.desc() : sortColumn.asc());
    }
  }

  const countQuery = db.select({ count: sql<number>`count(*)` }).from(table);
  if (whereClause) {
    countQuery.where(whereClause);
  }

  const [{ count }] = await countQuery;

  const data = await query.limit(pageSize).offset(offset);

  return {
    data,
    metadata: {
      currentPage: page,
      pageSize,
      totalPages: Math.ceil(count / pageSize),
      totalItems: count,
    },
  };
}