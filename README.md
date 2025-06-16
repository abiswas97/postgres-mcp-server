# Postgres MCP Server

[![npm version](https://badge.fury.io/js/postgres-mcp-server.svg)](https://www.npmjs.com/package/postgres-mcp-server)
[![Tests](https://github.com/abiswas97/postgres-mcp-server/actions/workflows/test.yml/badge.svg)](https://github.com/abiswas97/postgres-mcp-server/actions/workflows/test.yml)
[![GitHub issues](https://img.shields.io/github/issues/abiswas97/postgres-mcp-server)](https://github.com/abiswas97/postgres-mcp-server/issues)

A Model Context Protocol (MCP) server that provides secure database access to PostgreSQL through Kysely ORM. This server enables Claude Desktop to interact with PostgreSQL databases using natural language.

## Features

- **MCP Tools**: Query execution, table listing, schema inspection, and constraint information
- **Type Safety**: Full TypeScript support with typed inputs/outputs
- **Connection Pooling**: Configurable connection limits with idle timeout
- **Error Handling**: Graceful error messages for connection and query issues
- **Security**: Parameterized queries to prevent SQL injection

## Installation

```bash
npx postgres-mcp-server
```

## Configuration

Create a `.env` file with your database credentials:

```env
DB_HOST=127.0.0.1
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=your_password_here
DB_NAME=postgres
DB_SSL=true
```

## Available Tools

| Tool                  | Description                                 | Required Parameters                 | Optional Parameters                                         |
| --------------------- | ------------------------------------------- | ----------------------------------- | ----------------------------------------------------------- |
| **`query`**           | Execute SQL queries with pagination support | `sql` (string)                      | `pageSize` (1-500), `offset` (number), `parameters` (array) |
| **`describe_table`**  | Get table structure and column details      | `schema` (string), `table` (string) | -                                                           |
| **`list_tables`**     | List all tables in a schema                 | `schema` (string)                   | -                                                           |
| **`list_schemas`**    | List all schemas in the database            | -                                   | `includeSystemSchemas` (boolean)                            |
| **`get_constraints`** | Get table constraints (PK, FK, etc.)        | `schema` (string), `table` (string) | -                                                           |
| **`list_indexes`**    | List indexes for a table or schema          | `schema` (string)                   | `table` (string)                                            |
| **`list_views`**      | List views in a schema                      | `schema` (string)                   | -                                                           |
| **`list_functions`**  | List functions and procedures               | `schema` (string)                   | -                                                           |
| **`explain_query`**   | Get query execution plan                    | `sql` (string)                      | `analyze` (boolean), `format` (text/json/xml/yaml)          |
| **`get_table_stats`** | Get table size and statistics               | `schema` (string)                   | `table` (string)                                            |

### Key Features

- **Pagination**: Query tool supports up to 500 rows per page with automatic LIMIT/OFFSET handling
- **Security**: Parameterized queries prevent SQL injection, READ_ONLY mode by default
- **Type Safety**: Full TypeScript support with Zod schema validation

## Claude Desktop Configuration

Add this server to your Claude Desktop configuration file:

Edit `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "postgres-mcp-server": {
      "command": "npx",
      "args": ["postgres-mcp-server"],
      "env": {
        "DB_HOST": "127.0.0.1",
        "DB_PORT": "5432",
        "DB_USER": "postgres",
        "DB_PASSWORD": "your_password_here",
        "DB_NAME": "your_database_name",
        "DB_SSL": "true"
      }
    }
  }
}
```

### Configuration File Locations

- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

## Development

```bash
# Clone and install dependencies
git clone https://github.com/abiswas97/postgres-mcp-server.git
cd postgres-mcp-server
npm install

# Run in development mode with hot reload
npm run dev

# Build for production
npm run build

# Run tests
npm run test

# Run specific test suites
npm run test:unit
npm run test:integration
```

## Environment Variables

| Variable            | Default     | Description                             |
| ------------------- | ----------- | --------------------------------------- |
| `DB_HOST`           | `127.0.0.1` | PostgreSQL host                         |
| `DB_PORT`           | `5432`      | PostgreSQL port                         |
| `DB_USER`           | `postgres`  | Database user                           |
| `DB_PASSWORD`       | _required_  | Database password                       |
| `DB_NAME`           | `postgres`  | Database name                           |
| `DB_SSL`            | `true`      | Enable SSL connection                   |
| `READ_ONLY`         | `true`      | Restrict to SELECT/WITH/EXPLAIN queries |
| `QUERY_TIMEOUT`     | `30000`     | Query timeout in milliseconds           |
| `MAX_PAGE_SIZE`     | `500`       | Maximum rows per page                   |
| `DEFAULT_PAGE_SIZE` | `100`       | Default page size when not specified    |

## License

ISC
