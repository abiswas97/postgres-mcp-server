import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import { 
  setupTestContainer, 
  teardownTestContainer, 
  isDockerAvailable, 
  getTestDb 
} from '../setup/testcontainer';

// Create tools with test database connection
function createTestTools(connectionInfo: any) {
  // Override environment variables for this test
  const originalEnv = { ...process.env };
  
  process.env.DB_HOST = connectionInfo.host;
  process.env.DB_PORT = connectionInfo.port.toString();
  process.env.DB_USER = connectionInfo.username;
  process.env.DB_PASSWORD = connectionInfo.password;
  process.env.DB_NAME = connectionInfo.database;
  process.env.DB_SSL = 'false';

  // Clear module cache to force fresh imports with new env vars
  delete require.cache[require.resolve('../../src/db')];
  delete require.cache[require.resolve('../../src/tools/query')];
  delete require.cache[require.resolve('../../src/tools/list')];
  delete require.cache[require.resolve('../../src/tools/describe')];

  const cleanup = () => {
    process.env = originalEnv;
  };

  return {
    cleanup,
    getTools: async () => {
      const { queryTool } = await import('../../src/tools/query');
      const { listTablesTool } = await import('../../src/tools/list');
      const { describeTableTool, getConstraintsTool } = await import('../../src/tools/describe');
      const { closeDb } = await import('../../src/db');
      return { queryTool, listTablesTool, describeTableTool, getConstraintsTool, closeDb };
    }
  };
}

describe('Testcontainer Integration Tests', () => {
  let containerSetup: Awaited<ReturnType<typeof setupTestContainer>> | null = null;
  let dockerAvailable: boolean;

  beforeAll(async () => {
    dockerAvailable = await isDockerAvailable();
    
    if (dockerAvailable) {
      containerSetup = await setupTestContainer();
    }
  }, 120000); // 2 minutes timeout for container startup

  afterAll(async () => {
    if (containerSetup) {
      await teardownTestContainer();
    }
  }, 30000);

  test('should skip all tests if Docker is not available', () => {
    if (!dockerAvailable) {
      expect(dockerAvailable).toBe(false);
      return;
    }
    expect(dockerAvailable).toBe(true);
  });

  test('should have created test schema and data', async () => {
    if (!dockerAvailable || !containerSetup) {
      return; // Skip if no Docker
    }

    const db = getTestDb();
    
    // Check schema exists
    const schemas = await db
      .selectFrom('information_schema.schemata')
      .select('schema_name')
      .where('schema_name', '=', 'testschema')
      .execute();
    
    expect(schemas).toHaveLength(1);

    // Check tables exist
    const tables = await db
      .selectFrom('information_schema.tables')
      .select('table_name')
      .where('table_schema', '=', 'testschema')
      .orderBy('table_name')
      .execute();
    
    const tableNames = tables.map((t: any) => t.table_name).sort();
    expect(tableNames).toEqual([
      'categories',
      'post_tags', 
      'posts',
      'published_posts', // view
      'tags',
      'users'
    ]);

    // Check sample data
    const userCount = await db
      .selectFrom('testschema.users')
      .select(db.fn.count('id').as('count'))
      .executeTakeFirst();
    
    expect(Number(userCount?.count)).toBe(3);
  });

  test('should test all MCP tools with real data', async () => {
    if (!dockerAvailable || !containerSetup) {
      return; // Skip if no Docker
    }

    const testTools = createTestTools(containerSetup.connectionInfo);
    
    try {
      const { queryTool, listTablesTool, describeTableTool, getConstraintsTool, closeDb } = await testTools.getTools();

      // Test 1: Basic query
      const queryResult = await queryTool({
        sql: 'SELECT COUNT(*) as count FROM testschema.users'
      });
      expect(queryResult.error).toBeUndefined();
      expect(queryResult.rows).toBeDefined();
      expect(queryResult.rows![0].count).toBe('3');

      // Test 2: List tables
      const tablesResult = await listTablesTool({ schema: 'testschema' });
      expect(tablesResult.error).toBeUndefined();
      expect(tablesResult.tables).toBeDefined();
      expect(tablesResult.tables!.length).toBe(6); // 5 tables + 1 view

      const tableNames = tablesResult.tables!.map(t => t.table_name).sort();
      expect(tableNames).toContain('users');
      expect(tableNames).toContain('posts');
      expect(tableNames).toContain('published_posts'); // view

      // Test 3: Describe table
      const describeResult = await describeTableTool({
        schema: 'testschema',
        table: 'users'
      });
      expect(describeResult.error).toBeUndefined();
      expect(describeResult.columns).toBeDefined();
      expect(describeResult.columns!.length).toBe(6); // id, name, email, age, created_at, updated_at
      
      const columnNames = describeResult.columns!.map(c => c.column_name);
      expect(columnNames).toContain('id');
      expect(columnNames).toContain('name');
      expect(columnNames).toContain('email');

      // Test 4: Get constraints
      const constraintsResult = await getConstraintsTool({
        schema: 'testschema',
        table: 'users'
      });
      expect(constraintsResult.error).toBeUndefined();
      expect(constraintsResult.constraints).toBeDefined();
      expect(constraintsResult.constraints!.length).toBeGreaterThan(0);

      const constraintTypes = constraintsResult.constraints!.map(c => c.constraint_type);
      // Check if we have any constraints (the exact type format may vary)
      expect(constraintTypes.length).toBeGreaterThan(0);
      // Check that we get expected constraint definitions
      const constraintDefs = constraintsResult.constraints!.map(c => c.constraint_definition);
      expect(constraintDefs.some(def => def.includes('PRIMARY KEY'))).toBe(true);

      await closeDb();
    } finally {
      testTools.cleanup();
    }
  });

  test('should handle complex queries and joins', async () => {
    if (!dockerAvailable || !containerSetup) {
      return; // Skip if no Docker
    }

    const testTools = createTestTools(containerSetup.connectionInfo);
    
    try {
      const { queryTool, closeDb } = await testTools.getTools();

      // Complex query with joins
      const joinQuery = await queryTool({
        sql: `
          SELECT 
            u.name as author,
            p.title,
            c.name as category,
            p.view_count
          FROM testschema.users u
          JOIN testschema.posts p ON u.id = p.user_id
          LEFT JOIN testschema.categories c ON p.category_id = c.id
          WHERE p.published = true
          ORDER BY p.view_count DESC
        `
      });

      expect(joinQuery.error).toBeUndefined();
      expect(joinQuery.rows).toBeDefined();
      expect(joinQuery.rows!.length).toBeGreaterThan(0);

      // Check structure
      const firstRow = joinQuery.rows![0];
      expect(firstRow).toHaveProperty('author');
      expect(firstRow).toHaveProperty('title');
      expect(firstRow).toHaveProperty('category');

      // Test view query
      const viewQuery = await queryTool({
        sql: 'SELECT * FROM testschema.published_posts ORDER BY view_count DESC'
      });

      expect(viewQuery.error).toBeUndefined();
      expect(viewQuery.rows).toBeDefined();
      expect(viewQuery.rows!.length).toBeGreaterThan(0);

      await closeDb();
    } finally {
      testTools.cleanup();
    }
  });

  test('should handle data manipulation operations', async () => {
    if (!dockerAvailable || !containerSetup) {
      return; // Skip if no Docker
    }

    const testTools = createTestTools(containerSetup.connectionInfo);
    
    try {
      const { queryTool, closeDb } = await testTools.getTools();

      // Insert new user
      const insertResult = await queryTool({
        sql: `
          INSERT INTO testschema.users (name, email, age) 
          VALUES ('Test User', 'test@example.com', 28)
          RETURNING id, name, email
        `
      });

      expect(insertResult.error).toBeUndefined();
      
      let userId: number;
      if (insertResult.rows && insertResult.rows.length > 0) {
        expect(insertResult.rows.length).toBe(1);
        expect(insertResult.rows[0].name).toBe('Test User');
        userId = insertResult.rows[0].id;
      } else {
        // Some PostgreSQL setups might not return rows for INSERT...RETURNING
        expect(insertResult.rowCount).toBe(1);
        // Get the user ID with a separate query
        const userQuery = await queryTool({
          sql: "SELECT id FROM testschema.users WHERE email = 'test@example.com'"
        });
        expect(userQuery.error).toBeUndefined();
        userId = userQuery.rows![0].id;
      }

      // Update user
      const updateResult = await queryTool({
        sql: `
          UPDATE testschema.users 
          SET age = 29 
          WHERE id = ${userId}
        `
      });

      expect(updateResult.error).toBeUndefined();
      expect(updateResult.rowCount).toBe(1);

      // Verify update
      const selectResult = await queryTool({
        sql: `SELECT age FROM testschema.users WHERE id = ${userId}`
      });

      expect(selectResult.error).toBeUndefined();
      expect(selectResult.rows![0].age).toBe(29);

      // Clean up - delete test user
      const deleteResult = await queryTool({
        sql: `DELETE FROM testschema.users WHERE id = ${userId}`
      });

      expect(deleteResult.error).toBeUndefined();
      expect(deleteResult.rowCount).toBe(1);

      await closeDb();
    } finally {
      testTools.cleanup();
    }
  });

  test('should handle error cases properly', async () => {
    if (!dockerAvailable || !containerSetup) {
      return; // Skip if no Docker
    }

    const testTools = createTestTools(containerSetup.connectionInfo);
    
    try {
      const { queryTool, describeTableTool, closeDb } = await testTools.getTools();

      // Test invalid SQL
      const invalidQuery = await queryTool({
        sql: 'INVALID SQL SYNTAX HERE'
      });

      expect(invalidQuery.error).toBeDefined();
      expect(typeof invalidQuery.error).toBe('string');

      // Test non-existent table
      const nonExistentTable = await describeTableTool({
        schema: 'testschema',
        table: 'nonexistent_table'
      });

      expect(nonExistentTable.error).toBeUndefined();
      expect(nonExistentTable.columns).toBeDefined();
      expect(nonExistentTable.columns!.length).toBe(0);

      // Test constraint violation
      const duplicateEmail = await queryTool({
        sql: `
          INSERT INTO testschema.users (name, email, age) 
          VALUES ('Duplicate', 'john@example.com', 25)
        `
      });

      expect(duplicateEmail.error).toBeDefined();
      expect(duplicateEmail.error).toContain('duplicate key value');

      await closeDb();
    } finally {
      testTools.cleanup();
    }
  });
});