#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

import { zodToJsonSchema } from "zod-to-json-schema";
import { 
  QueryInputSchema, 
  QueryOutputSchema, 
  DescribeTableInputSchema,
  ListTablesInputSchema,
  ListSchemasInputSchema,
  ListIndexesInputSchema,
  ExplainQueryInputSchema,
  GetTableStatsInputSchema,
  ListViewsInputSchema,
  ListFunctionsInputSchema,
  validateInput
} from "./validation.js";
import { queryTool } from "./tools/query.js";
import { describeTableTool, getConstraintsTool } from "./tools/describe.js";
import { listTablesTool, listViewsTool } from "./tools/list.js";
import { listSchemasTool } from "./tools/schemas.js";
import { listIndexesTool } from "./tools/indexes.js";
import { explainQueryTool, getTableStatsTool } from "./tools/performance.js";
import { listFunctionsTool } from "./tools/functions.js";
import { closeDb } from "./db.js";

const server = new Server(
  {
    name: "postgres-mcp-server",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "query",
        description: "Execute SQL queries with pagination support and parameterization for security. Supports page sizes up to 500 rows.",
        inputSchema: zodToJsonSchema(QueryInputSchema, { name: "QueryInput" }),
        outputSchema: zodToJsonSchema(QueryOutputSchema, { name: "QueryOutput" }),
      },
      {
        name: "describe_table",
        description: "Get the structure of a database table",
        inputSchema: {
          type: "object",
          properties: {
            schema: {
              type: "string",
              description: "The schema name",
            },
            table: {
              type: "string",
              description: "The table name",
            },
          },
          required: ["schema", "table"],
        },
      },
      {
        name: "list_tables",
        description: "List all tables in a schema",
        inputSchema: {
          type: "object",
          properties: {
            schema: {
              type: "string",
              description: "The schema name (default: public)",
            },
          },
        },
      },
      {
        name: "get_constraints",
        description: "Get constraints for a table",
        inputSchema: {
          type: "object",
          properties: {
            schema: {
              type: "string",
              description: "The schema name",
            },
            table: {
              type: "string",
              description: "The table name",
            },
          },
          required: ["schema", "table"],
        },
      },
      {
        name: "list_schemas",
        description: "List all schemas in the database",
        inputSchema: {
          type: "object",
          properties: {
            includeSystemSchemas: {
              type: "boolean",
              description: "Include system schemas (default: false)",
            },
          },
        },
      },
      {
        name: "list_indexes",
        description: "List indexes for a table or schema",
        inputSchema: {
          type: "object",
          properties: {
            schema: {
              type: "string",
              description: "The schema name",
            },
            table: {
              type: "string",
              description: "The table name (optional - if omitted, lists all indexes in schema)",
            },
          },
          required: ["schema"],
        },
      },
      {
        name: "explain_query",
        description: "Get query execution plan (EXPLAIN)",
        inputSchema: {
          type: "object",
          properties: {
            sql: {
              type: "string",
              description: "The SELECT query to explain",
            },
            analyze: {
              type: "boolean",
              description: "Include actual execution statistics (default: false)",
            },
            buffers: {
              type: "boolean",
              description: "Include buffer usage statistics (default: false)",
            },
            costs: {
              type: "boolean",
              description: "Include cost information (default: true)",
            },
            format: {
              type: "string",
              enum: ["text", "json", "xml", "yaml"],
              description: "Output format (default: text)",
            },
          },
          required: ["sql"],
        },
      },
      {
        name: "get_table_stats",
        description: "Get table statistics and size information",
        inputSchema: {
          type: "object",
          properties: {
            schema: {
              type: "string",
              description: "The schema name",
            },
            table: {
              type: "string",
              description: "The table name (optional - if omitted, lists all tables in schema)",
            },
          },
          required: ["schema"],
        },
      },
      {
        name: "list_views",
        description: "List views in a schema",
        inputSchema: {
          type: "object",
          properties: {
            schema: {
              type: "string",
              description: "The schema name (default: public)",
            },
          },
        },
      },
      {
        name: "list_functions",
        description: "List functions and procedures in a schema",
        inputSchema: {
          type: "object",
          properties: {
            schema: {
              type: "string",
              description: "The schema name (default: public)",
            },
          },
        },
      },
    ],
  };
});

// Helper function to safely validate and execute tools
function createSafeToolResponse(result: any) {
  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(result, null, 2),
      },
    ],
  };
}

function createErrorResponse(error: string, code: string = "VALIDATION_ERROR") {
  return {
    isError: true,
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(
          {
            error,
            code,
            timestamp: new Date().toISOString()
          },
          null,
          2
        ),
      },
    ],
  };
}

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case "query": {
        const validation = validateInput(QueryInputSchema, args);
        if (!validation.success) {
          return createErrorResponse(`Input validation failed: ${validation.error}`);
        }
        const result = await queryTool(validation.data);
        return createSafeToolResponse(result);
      }

      case "describe_table": {
        const validation = validateInput(DescribeTableInputSchema, args);
        if (!validation.success) {
          return createErrorResponse(`Input validation failed: ${validation.error}`);
        }
        const result = await describeTableTool(validation.data);
        return createSafeToolResponse(result);
      }

      case "list_tables": {
        const validation = validateInput(ListTablesInputSchema, args);
        if (!validation.success) {
          return createErrorResponse(`Input validation failed: ${validation.error}`);
        }
        const result = await listTablesTool(validation.data);
        return createSafeToolResponse(result);
      }

      case "get_constraints": {
        const validation = validateInput(DescribeTableInputSchema, args);
        if (!validation.success) {
          return createErrorResponse(`Input validation failed: ${validation.error}`);
        }
        const result = await getConstraintsTool(validation.data);
        return createSafeToolResponse(result);
      }

      case "list_schemas": {
        const validation = validateInput(ListSchemasInputSchema, args);
        if (!validation.success) {
          return createErrorResponse(`Input validation failed: ${validation.error}`);
        }
        const result = await listSchemasTool(validation.data);
        return createSafeToolResponse(result);
      }

      case "list_indexes": {
        const validation = validateInput(ListIndexesInputSchema, args);
        if (!validation.success) {
          return createErrorResponse(`Input validation failed: ${validation.error}`);
        }
        const result = await listIndexesTool(validation.data);
        return createSafeToolResponse(result);
      }

      case "explain_query": {
        const validation = validateInput(ExplainQueryInputSchema, args);
        if (!validation.success) {
          return createErrorResponse(`Input validation failed: ${validation.error}`);
        }
        const result = await explainQueryTool(validation.data);
        return createSafeToolResponse(result);
      }

      case "get_table_stats": {
        const validation = validateInput(GetTableStatsInputSchema, args);
        if (!validation.success) {
          return createErrorResponse(`Input validation failed: ${validation.error}`);
        }
        const result = await getTableStatsTool(validation.data);
        return createSafeToolResponse(result);
      }

      case "list_views": {
        const validation = validateInput(ListViewsInputSchema, args);
        if (!validation.success) {
          return createErrorResponse(`Input validation failed: ${validation.error}`);
        }
        const result = await listViewsTool(validation.data);
        return createSafeToolResponse(result);
      }

      case "list_functions": {
        const validation = validateInput(ListFunctionsInputSchema, args);
        if (!validation.success) {
          return createErrorResponse(`Input validation failed: ${validation.error}`);
        }
        const result = await listFunctionsTool(validation.data);
        return createSafeToolResponse(result);
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    
    return {
      isError: true,
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              error: "Tool execution failed",
              code: "TOOL_EXECUTION_ERROR",
              timestamp: new Date().toISOString(),
              hint: "Check your input parameters and try again"
            },
            null,
            2
          ),
        },
      ],
    };
  }
});

async function shutdown() {
  await closeDb();
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});
