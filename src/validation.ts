import { z } from 'zod';

export const QueryInputSchema = z.object({
  sql: z.string().min(1, "SQL query cannot be empty").max(50000, "SQL query too long"),
  parameters: z.array(z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.null()
  ])).optional().describe("Optional array of parameters for parameterized queries"),
  pageSize: z.number().min(1).max(500).optional().describe("Number of rows to return (1-500, default: 100)"),
  offset: z.number().min(0).optional().describe("Number of rows to skip for pagination")
});

export const QueryOutputSchema = z.object({
  rows: z.array(z.record(z.any())).optional().describe("Query result rows (for SELECT queries)"),
  rowCount: z.number().optional().describe("Number of rows affected/returned"),
  error: z.string().optional().describe("Error message if query failed"),
  code: z.string().optional().describe("Error code for categorized errors"),
  hint: z.string().optional().describe("Helpful hint for resolving errors"),
  pagination: z.object({
    hasMore: z.boolean().describe("Whether more rows are available"),
    pageSize: z.number().describe("Actual page size used"),
    offset: z.number().describe("Offset used for this query"),
    totalRows: z.number().optional().describe("Total rows available (if determinable)")
  }).optional().describe("Pagination metadata for SELECT queries")
});

export const DescribeTableInputSchema = z.object({
  schema: z.string().min(1, "Schema name is required").max(63, "Schema name too long")
    .regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/, "Invalid schema name format"),
  table: z.string().min(1, "Table name is required").max(63, "Table name too long")
    .regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/, "Invalid table name format")
});

export const ListTablesInputSchema = z.object({
  schema: z.string().min(1).max(63)
    .regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/, "Invalid schema name format")
    .optional()
});

export const ListSchemasInputSchema = z.object({
  includeSystemSchemas: z.boolean().optional()
});

export const ListIndexesInputSchema = z.object({
  schema: z.string().min(1, "Schema name is required").max(63, "Schema name too long")
    .regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/, "Invalid schema name format"),
  table: z.string().min(1).max(63)
    .regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/, "Invalid table name format")
    .optional()
});

export const ExplainQueryInputSchema = z.object({
  sql: z.string().min(1, "SQL query cannot be empty").max(50000, "SQL query too long"),
  analyze: z.boolean().optional(),
  buffers: z.boolean().optional(),
  costs: z.boolean().optional(),
  format: z.enum(['text', 'json', 'xml', 'yaml']).optional()
});

export const GetTableStatsInputSchema = z.object({
  schema: z.string().min(1, "Schema name is required").max(63, "Schema name too long")
    .regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/, "Invalid schema name format"),
  table: z.string().min(1).max(63)
    .regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/, "Invalid table name format")
    .optional()
});

export const ListViewsInputSchema = z.object({
  schema: z.string().min(1).max(63)
    .regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/, "Invalid schema name format")
    .optional()
});

export const ListFunctionsInputSchema = z.object({
  schema: z.string().min(1).max(63)
    .regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/, "Invalid schema name format")
    .optional()
});

export function validateInput<T>(schema: z.ZodSchema<T>, input: unknown): { success: true; data: T } | { success: false; error: string } {
  try {
    const data = schema.parse(input);
    return { success: true, data };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const firstError = error.errors[0];
      return { 
        success: false, 
        error: `${firstError.path.join('.')}: ${firstError.message}` 
      };
    }
    return { 
      success: false, 
      error: 'Invalid input format' 
    };
  }
}

export type QueryInput = z.infer<typeof QueryInputSchema>;
export type QueryOutput = z.infer<typeof QueryOutputSchema>;
export type DescribeTableInput = z.infer<typeof DescribeTableInputSchema>;
export type ListTablesInput = z.infer<typeof ListTablesInputSchema>;
export type ListSchemasInput = z.infer<typeof ListSchemasInputSchema>;
export type ListIndexesInput = z.infer<typeof ListIndexesInputSchema>;
export type ExplainQueryInput = z.infer<typeof ExplainQueryInputSchema>;
export type GetTableStatsInput = z.infer<typeof GetTableStatsInputSchema>;
export type ListViewsInput = z.infer<typeof ListViewsInputSchema>;
export type ListFunctionsInput = z.infer<typeof ListFunctionsInputSchema>;