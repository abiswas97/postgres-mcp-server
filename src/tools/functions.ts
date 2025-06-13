import { getDb } from '../db.js';
import { sql } from 'kysely';
import { ListFunctionsInputSchema, validateInput, type ListFunctionsInput } from '../validation.js';

export interface FunctionInfo {
  schema_name: string;
  function_name: string;
  return_type: string;
  argument_types: string;
  function_type: string;
  language: string;
  is_aggregate: boolean;
  is_window: boolean;
  security_type: string;
  volatility: string;
  parallel_safety: string;
  description?: string;
}

export interface ListFunctionsOutput {
  functions?: FunctionInfo[];
  error?: string;
}

export async function listFunctionsTool(input: unknown): Promise<ListFunctionsOutput> {
  try {
    // Validate input
    const validation = validateInput(ListFunctionsInputSchema, input);
    if (!validation.success) {
      return { error: `Input validation failed: ${validation.error}` };
    }
    
    const validatedInput = validation.data;
    const db = getDb();
    const schema = validatedInput.schema || 'public';
    
    const query = sql<FunctionInfo>`
      SELECT 
        n.nspname as schema_name,
        p.proname as function_name,
        pg_get_function_result(p.oid) as return_type,
        pg_get_function_arguments(p.oid) as argument_types,
        CASE p.prokind
          WHEN 'f' THEN 'function'
          WHEN 'p' THEN 'procedure'
          WHEN 'a' THEN 'aggregate'
          WHEN 'w' THEN 'window'
          ELSE 'unknown'
        END as function_type,
        l.lanname as language,
        CASE WHEN p.prokind = 'a' THEN true ELSE false END as is_aggregate,
        CASE WHEN p.prokind = 'w' THEN true ELSE false END as is_window,
        CASE p.prosecdef
          WHEN true THEN 'definer'
          ELSE 'invoker'
        END as security_type,
        CASE p.provolatile
          WHEN 'i' THEN 'immutable'
          WHEN 's' THEN 'stable'
          WHEN 'v' THEN 'volatile'
          ELSE 'unknown'
        END as volatility,
        CASE p.proparallel
          WHEN 's' THEN 'safe'
          WHEN 'r' THEN 'restricted'
          WHEN 'u' THEN 'unsafe'
          ELSE 'unknown'
        END as parallel_safety,
        obj_description(p.oid) as description
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
      JOIN pg_language l ON l.oid = p.prolang
      WHERE n.nspname = ${schema}
        AND p.prokind IN ('f', 'p', 'a', 'w')
      ORDER BY function_type, function_name
    `;
    
    const result = await query.execute(db);
    
    return {
      functions: result.rows,
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}