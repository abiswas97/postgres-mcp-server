# Postgres MCP Server

A Model Context Protocol (MCP) server that provides database access to Postgres through Kysely.

## Features

- **MCP Tools**: Query execution, table listing, schema inspection, and constraint information
- **Type Safety**: Full TypeScript support with typed inputs/outputs
- **Connection Pooling**: Configurable connection limits with idle timeout
- **Error Handling**: Graceful error messages for connection and query issues

## Installation

```bash
npm install
npm run build
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

### 1. `query`

Execute raw SQL queries on the database.

**Input:**

- `sql` (string): The SQL query to execute

**Example:**

```json
{
  "sql": "SELECT * FROM users WHERE active = true LIMIT 10"
}
```

### 2. `describe_table`

Get the structure of a database table.

**Input:**

- `schema` (string): The schema name
- `table` (string): The table name

**Returns:** Column information including name, data type, length, nullable, and default values.

### 3. `list_tables`

List all tables in a schema.

**Input:**

- `schema` (string, optional): The schema name (defaults to 'public')

**Returns:** Table names and types (BASE TABLE or VIEW).

### 4. `get_constraints`

Get constraints for a table.

**Input:**

- `schema` (string): The schema name
- `table` (string): The table name

**Returns:** Constraint names, types, and definitions.

## Claude Desktop Configuration

Add this server to your Claude Desktop configuration file:

Edit `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "postgres-mcp-server": {
      "command": "node",
      "args": ["/path/to/postgres-mcp-server/dist/index.js"],
      "env": {
        "DB_HOST": "127.0.0.1",
        "DB_PORT": "5432",
        "DB_USER": "postgres",
        "DB_PASSWORD": "your_password_here",
        "DB_NAME": "postgres",
        "DB_SSL": "true"
      }
    }
  }
}
```

## Development

```bash
# Run in development mode with hot reload
npm run dev

# Build for production
npm run build

# Run tests
npm run test
```
