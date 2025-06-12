#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

import { queryTool } from "./tools/query.js";
import { describeTableTool, getConstraintsTool } from "./tools/describe.js";
import { listTablesTool } from "./tools/list.js";
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
        description: "Execute raw SQL queries on the database",
        inputSchema: {
          type: "object",
          properties: {
            sql: {
              type: "string",
              description: "The SQL query to execute",
            },
          },
          required: ["sql"],
        },
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
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case "query": {
        const result = await queryTool(args as any);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case "describe_table": {
        const result = await describeTableTool(args as any);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case "list_tables": {
        const result = await listTablesTool(args as any);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case "get_constraints": {
        const result = await getConstraintsTool(args as any);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              error: error instanceof Error ? error.message : "Unknown error",
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
