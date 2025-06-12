import { getDb } from '../db.js';
import { sql } from 'kysely';

export interface ListTablesInput {
  schema?: string;
}

export interface TableInfo {
  table_name: string;
  table_type: string;
}

export interface ListTablesOutput {
  tables?: TableInfo[];
  error?: string;
}

export async function listTablesTool(input: ListTablesInput): Promise<ListTablesOutput> {
  try {
    const db = getDb();
    const schema = input.schema || 'public';
    
    const query = sql<TableInfo>`
      SELECT 
        table_name,
        table_type
      FROM information_schema.tables
      WHERE table_schema = ${schema}
        AND table_type IN ('BASE TABLE', 'VIEW')
      ORDER BY table_name
    `;
    
    const result = await query.execute(db);
    
    return {
      tables: result.rows,
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}