import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { env } from "@/env";
import * as schema from "@perf/db/schema";

const globalForDb = globalThis as unknown as { conn: postgres.Sql | undefined };
const conn = globalForDb.conn ?? postgres(env.DATABASE_URL);

if (env.NODE_ENV !== "production") {
  globalForDb.conn = conn;
}

export const db = drizzle(conn, { schema });
export type Database = typeof db;

// Re-export schema for convenience
export * from "@perf/db/schema";
