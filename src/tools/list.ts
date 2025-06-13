import { getDb } from "../db.js";
import { sql } from "kysely";
import {
  ListTablesInputSchema,
  ListViewsInputSchema,
  validateInput,
} from "../validation.js";

export interface TableInfo {
  table_name: string;
  table_type: string;
}

export interface ListTablesOutput {
  tables?: TableInfo[];
  error?: string;
}

export async function listTablesTool(
  input: unknown
): Promise<ListTablesOutput> {
  try {
    const validation = validateInput(ListTablesInputSchema, input);
    if (!validation.success) {
      return { error: `Input validation failed: ${validation.error}` };
    }

    const validatedInput = validation.data;
    const db = getDb();
    const schema = validatedInput.schema || "public";

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
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}

export interface ViewInfo {
  schema_name: string;
  view_name: string;
  view_definition: string;
  is_updatable: string;
  check_option: string;
}

export interface ListViewsOutput {
  views?: ViewInfo[];
  error?: string;
}

export async function listViewsTool(input: unknown): Promise<ListViewsOutput> {
  try {
    const validation = validateInput(ListViewsInputSchema, input);
    if (!validation.success) {
      return { error: `Input validation failed: ${validation.error}` };
    }

    const validatedInput = validation.data;
    const db = getDb();
    const schema = validatedInput.schema || "public";

    const query = sql<ViewInfo>`
      SELECT 
        table_schema as schema_name,
        table_name as view_name,
        view_definition,
        is_updatable,
        check_option
      FROM information_schema.views
      WHERE table_schema = ${schema}
      ORDER BY table_name
    `;

    const result = await query.execute(db);

    return {
      views: result.rows,
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}
