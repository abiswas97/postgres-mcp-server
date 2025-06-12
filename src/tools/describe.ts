import { getDb } from '../db.js';
import { sql } from 'kysely';

export interface DescribeTableInput {
  schema: string;
  table: string;
}

export interface ColumnInfo {
  column_name: string;
  data_type: string;
  character_maximum_length: number | null;
  is_nullable: string;
  column_default: string | null;
}

export interface DescribeTableOutput {
  columns?: ColumnInfo[];
  error?: string;
}

export async function describeTableTool(input: DescribeTableInput): Promise<DescribeTableOutput> {
  try {
    const db = getDb();
    
    const query = sql<ColumnInfo>`
      SELECT 
        column_name,
        data_type,
        character_maximum_length,
        is_nullable,
        column_default
      FROM information_schema.columns
      WHERE table_schema = ${input.schema}
        AND table_name = ${input.table}
      ORDER BY ordinal_position
    `;
    
    const result = await query.execute(db);
    
    return {
      columns: result.rows,
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

export interface GetConstraintsInput {
  schema: string;
  table: string;
}

export interface ConstraintInfo {
  constraint_name: string;
  constraint_type: string;
  constraint_definition: string;
}

export interface GetConstraintsOutput {
  constraints?: ConstraintInfo[];
  error?: string;
}

export async function getConstraintsTool(input: GetConstraintsInput): Promise<GetConstraintsOutput> {
  try {
    const db = getDb();
    
    const query = sql<ConstraintInfo>`
      SELECT 
        c.conname as constraint_name,
        CASE c.contype
          WHEN 'p' THEN 'PRIMARY KEY'
          WHEN 'f' THEN 'FOREIGN KEY'
          WHEN 'u' THEN 'UNIQUE'
          WHEN 'c' THEN 'CHECK'
          ELSE c.contype
        END as constraint_type,
        pg_get_constraintdef(c.oid) as constraint_definition
      FROM pg_constraint c
      JOIN pg_namespace n ON n.oid = c.connamespace
      JOIN pg_class cl ON cl.oid = c.conrelid
      WHERE n.nspname = ${input.schema}
        AND cl.relname = ${input.table}
      ORDER BY c.conname
    `;
    
    const result = await query.execute(db);
    
    return {
      constraints: result.rows,
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}