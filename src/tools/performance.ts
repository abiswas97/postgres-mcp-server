import { getDb } from "../db.js";
import { sql } from "kysely";
import {
  ExplainQueryInputSchema,
  GetTableStatsInputSchema,
  validateInput,
} from "../validation.js";

export interface ExplainQueryOutput {
  plan?: any[];
  error?: string;
}

export async function explainQueryTool(
  input: unknown
): Promise<ExplainQueryOutput> {
  try {
    const validation = validateInput(ExplainQueryInputSchema, input);
    if (!validation.success) {
      return { error: `Input validation failed: ${validation.error}` };
    }

    const validatedInput = validation.data;
    const db = getDb();

    // Safety check - prevent potentially dangerous queries
    const trimmedSql = validatedInput.sql.trim().toUpperCase();
    if (
      trimmedSql.includes("INSERT") ||
      trimmedSql.includes("UPDATE") ||
      trimmedSql.includes("DELETE") ||
      trimmedSql.includes("DROP") ||
      trimmedSql.includes("CREATE") ||
      trimmedSql.includes("ALTER") ||
      trimmedSql.includes("TRUNCATE")
    ) {
      return {
        error:
          "EXPLAIN is only allowed for SELECT queries and read-only operations",
      };
    }

    // Build EXPLAIN options safely
    const options = [];
    if (validatedInput.analyze) options.push("ANALYZE true");
    if (validatedInput.buffers) options.push("BUFFERS true");
    if (validatedInput.costs !== false) options.push("COSTS true");
    if (validatedInput.format) {
      // Validate format to prevent injection
      const validFormats = ["TEXT", "JSON", "XML", "YAML"];
      const upperFormat = validatedInput.format.toUpperCase();
      if (validFormats.includes(upperFormat)) {
        options.push(`FORMAT ${upperFormat}`);
      }
    }

    const optionsStr = options.length > 0 ? `(${options.join(", ")})` : "";

    const explainSql = `EXPLAIN ${optionsStr} ${validatedInput.sql}`;
    const result = await sql.raw(explainSql).execute(db);

    return {
      plan: result.rows,
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}

export interface TableStatsInfo {
  schema_name: string;
  table_name: string;
  row_count: number;
  table_size_bytes: number;
  table_size_pretty: string;
  index_size_bytes: number;
  index_size_pretty: string;
  total_size_bytes: number;
  total_size_pretty: string;
  last_vacuum?: string;
  last_autovacuum?: string;
  last_analyze?: string;
  last_autoanalyze?: string;
}

export interface GetTableStatsOutput {
  stats?: TableStatsInfo[];
  error?: string;
}

export async function getTableStatsTool(
  input: unknown
): Promise<GetTableStatsOutput> {
  try {
    // Validate input
    const validation = validateInput(GetTableStatsInputSchema, input);
    if (!validation.success) {
      return { error: `Input validation failed: ${validation.error}` };
    }

    const validatedInput = validation.data;
    const db = getDb();

    let query;
    if (validatedInput.table) {
      query = sql<TableStatsInfo>`
        SELECT 
          schemaname as schema_name,
          relname as table_name,
          (COALESCE(n_tup_ins, 0) + COALESCE(n_tup_upd, 0) + COALESCE(n_tup_del, 0))::bigint as row_count,
          pg_relation_size(schemaname||'.'||relname) as table_size_bytes,
          pg_size_pretty(pg_relation_size(schemaname||'.'||relname)) as table_size_pretty,
          pg_indexes_size(schemaname||'.'||relname) as index_size_bytes,
          pg_size_pretty(pg_indexes_size(schemaname||'.'||relname)) as index_size_pretty,
          pg_total_relation_size(schemaname||'.'||relname) as total_size_bytes,
          pg_size_pretty(pg_total_relation_size(schemaname||'.'||relname)) as total_size_pretty,
          last_vacuum::text,
          last_autovacuum::text,
          last_analyze::text,
          last_autoanalyze::text
        FROM pg_stat_user_tables 
        WHERE schemaname = ${validatedInput.schema}
          AND relname = ${validatedInput.table}
      `;
    } else {
      query = sql<TableStatsInfo>`
        SELECT 
          schemaname as schema_name,
          relname as table_name,
          (COALESCE(n_tup_ins, 0) + COALESCE(n_tup_upd, 0) + COALESCE(n_tup_del, 0))::bigint as row_count,
          pg_relation_size(schemaname||'.'||relname) as table_size_bytes,
          pg_size_pretty(pg_relation_size(schemaname||'.'||relname)) as table_size_pretty,
          pg_indexes_size(schemaname||'.'||relname) as index_size_bytes,
          pg_size_pretty(pg_indexes_size(schemaname||'.'||relname)) as index_size_pretty,
          pg_total_relation_size(schemaname||'.'||relname) as total_size_bytes,
          pg_size_pretty(pg_total_relation_size(schemaname||'.'||relname)) as total_size_pretty,
          last_vacuum::text,
          last_autovacuum::text,
          last_analyze::text,
          last_autoanalyze::text
        FROM pg_stat_user_tables 
        WHERE schemaname = ${validatedInput.schema}
        ORDER BY total_size_bytes DESC
      `;
    }

    const result = await query.execute(db);

    // Convert string numbers to actual numbers
    const stats = result.rows.map((row) => ({
      ...row,
      row_count: Number(row.row_count),
      table_size_bytes: Number(row.table_size_bytes),
      index_size_bytes: Number(row.index_size_bytes),
      total_size_bytes: Number(row.total_size_bytes),
    }));

    return {
      stats,
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}
