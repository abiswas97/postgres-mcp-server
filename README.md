# Postgres MCP Server

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

**Response:**

- For SELECT queries: Returns rows as JSON array
- For INSERT/UPDATE/DELETE: Returns affected row count

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

| Variable      | Default     | Description           |
| ------------- | ----------- | --------------------- |
| `DB_HOST`     | `127.0.0.1` | PostgreSQL host       |
| `DB_PORT`     | `5432`      | PostgreSQL port       |
| `DB_USER`     | `postgres`  | Database user         |
| `DB_PASSWORD` | _required_  | Database password     |
| `DB_NAME`     | `postgres`  | Database name         |
| `DB_SSL`      | `true`      | Enable SSL connection |

## License

ISC
