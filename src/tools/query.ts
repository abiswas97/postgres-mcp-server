import { getDb } from '../db.js';
import { sql } from 'kysely';

export interface QueryInput {
  sql: string;
}

export interface QueryOutput {
  rows?: any[];
  rowCount?: number;
  error?: string;
}

export async function queryTool(input: QueryInput): Promise<QueryOutput> {
  try {
    const db = getDb();
    const query = input.sql.trim().toUpperCase();
    
    if (query.startsWith('SELECT') || query.startsWith('WITH')) {
      const result = await sql.raw(input.sql).execute(db);
      return {
        rows: result.rows,
        rowCount: result.rows.length,
      };
    } else {
      const result = await sql.raw(input.sql).execute(db);
      return {
        rowCount: result.numAffectedRows ? Number(result.numAffectedRows) : 0,
      };
    }
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}