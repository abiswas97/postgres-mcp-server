import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import { createTestEnvironment, withDocker } from '../helpers/test-db';
import { teardownTestContainer } from '../setup/testcontainer';

describe('Full Workflow Integration Tests', () => {
  let testEnv: Awaited<ReturnType<typeof createTestEnvironment>> | null = null;

  beforeAll(async () => {
    try {
      testEnv = await createTestEnvironment();
    } catch (error) {
      // Docker not available - tests will be skipped
      testEnv = null;
    }
  }, 120000); // 2 minutes timeout

  afterAll(async () => {
    if (testEnv) {
      testEnv.cleanup();
      await teardownTestContainer();
    }
  }, 30000);

  describe('Complete Database Workflow', () => {
    test('should perform end-to-end database operations', async () => {
      await withDocker(async () => {
        if (!testEnv) return;

        const { queryTool, listTablesTool, describeTableTool, getConstraintsTool, closeDb } = 
          await testEnv.getTools();

        try {
          // Step 1: Verify database connection
          const connectionTest = await queryTool({
            sql: 'SELECT current_database() as db_name, version() as version'
          });
          expect(connectionTest.error).toBeUndefined();
          expect(connectionTest.rows).toBeDefined();
          expect(connectionTest.rows!.length).toBe(1);

          // Step 2: List tables in test schema
          const tablesResult = await listTablesTool({ schema: 'testschema' });
          expect(tablesResult.error).toBeUndefined();
          expect(tablesResult.tables).toBeDefined();
          expect(tablesResult.tables!.length).toBe(6); // 5 tables + 1 view

          const tableNames = tablesResult.tables!.map((t: any) => t.table_name).sort();
          expect(tableNames).toEqual([
            'categories', 'post_tags', 'posts', 'published_posts', 'tags', 'users'
          ]);

          // Step 3: Describe users table
          const describeResult = await describeTableTool({
            schema: 'testschema',
            table: 'users'
          });
          expect(describeResult.error).toBeUndefined();
          expect(describeResult.columns).toBeDefined();
          expect(describeResult.columns!.length).toBe(6);

          const columnNames = describeResult.columns!.map((c: any) => c.column_name);
          expect(columnNames).toContain('id');
          expect(columnNames).toContain('name');
          expect(columnNames).toContain('email');

          // Step 4: Get constraints for users table
          const constraintsResult = await getConstraintsTool({
            schema: 'testschema',
            table: 'users'
          });
          expect(constraintsResult.error).toBeUndefined();
          expect(constraintsResult.constraints).toBeDefined();
          expect(constraintsResult.constraints!.length).toBeGreaterThan(0);

          // Step 5: Query existing data
          const dataQuery = await queryTool({
            sql: 'SELECT COUNT(*) as user_count FROM testschema.users'
          });
          expect(dataQuery.error).toBeUndefined();
          expect(dataQuery.rows![0].user_count).toBe('3');

          // Step 6: Complex join query
          const joinQuery = await queryTool({
            sql: `
              SELECT 
                u.name as author,
                COUNT(p.id) as post_count,
                AVG(p.view_count) as avg_views
              FROM testschema.users u
              LEFT JOIN testschema.posts p ON u.id = p.user_id
              GROUP BY u.id, u.name
              ORDER BY post_count DESC
            `
          });
          expect(joinQuery.error).toBeUndefined();
          expect(joinQuery.rows).toBeDefined();
          expect(joinQuery.rows!.length).toBe(3);

        } finally {
          await closeDb();
        }
      });
    });

    test('should handle data manipulation operations', async () => {
      await withDocker(async () => {
        if (!testEnv) return;

        const { queryTool, closeDb } = await testEnv.getTools();

        try {
          // Insert new user
          const insertResult = await queryTool({
            sql: `
              INSERT INTO testschema.users (name, email, age) 
              VALUES ('Integration Test User', 'integration@test.com', 25)
              RETURNING id, name
            `
          });

          expect(insertResult.error).toBeUndefined();
          let userId: number;

          if (insertResult.rows && insertResult.rows.length > 0) {
            userId = insertResult.rows[0].id;
            expect(insertResult.rows[0].name).toBe('Integration Test User');
          } else {
            // Fallback if RETURNING doesn't work
            const userQuery = await queryTool({
              sql: "SELECT id FROM testschema.users WHERE email = 'integration@test.com'"
            });
            expect(userQuery.error).toBeUndefined();
            userId = userQuery.rows![0].id;
          }

          // Update user
          const updateResult = await queryTool({
            sql: `UPDATE testschema.users SET age = 26 WHERE id = ${userId}`
          });
          expect(updateResult.error).toBeUndefined();
          expect(updateResult.rowCount).toBe(1);

          // Verify update
          const verifyUpdate = await queryTool({
            sql: `SELECT age FROM testschema.users WHERE id = ${userId}`
          });
          expect(verifyUpdate.error).toBeUndefined();
          expect(verifyUpdate.rows![0].age).toBe(26);

          // Test foreign key relationships - insert post for user
          const postInsert = await queryTool({
            sql: `
              INSERT INTO testschema.posts (user_id, title, content, published) 
              VALUES (${userId}, 'Test Post', 'Integration test content', true)
              RETURNING id
            `
          });
          expect(postInsert.error).toBeUndefined();

          // Clean up - delete post first (foreign key constraint)
          if (postInsert.rows && postInsert.rows.length > 0) {
            const deletePost = await queryTool({
              sql: `DELETE FROM testschema.posts WHERE id = ${postInsert.rows[0].id}`
            });
            expect(deletePost.error).toBeUndefined();
          }

          // Delete user
          const deleteUser = await queryTool({
            sql: `DELETE FROM testschema.users WHERE id = ${userId}`
          });
          expect(deleteUser.error).toBeUndefined();
          expect(deleteUser.rowCount).toBe(1);

        } finally {
          await closeDb();
        }
      });
    });

    test('should handle error scenarios gracefully', async () => {
      await withDocker(async () => {
        if (!testEnv) return;

        const { queryTool, describeTableTool, listTablesTool, closeDb } = 
          await testEnv.getTools();

        try {
          // Test invalid SQL
          const invalidQuery = await queryTool({
            sql: 'INVALID SQL SYNTAX'
          });
          expect(invalidQuery.error).toBeDefined();
          expect(invalidQuery.error).toContain('syntax error');

          // Test constraint violation
          const duplicateEmail = await queryTool({
            sql: `
              INSERT INTO testschema.users (name, email, age) 
              VALUES ('Duplicate', 'john@example.com', 25)
            `
          });
          expect(duplicateEmail.error).toBeDefined();
          expect(duplicateEmail.error).toContain('duplicate key value');

          // Test non-existent table
          const nonExistentTable = await describeTableTool({
            schema: 'testschema',
            table: 'nonexistent_table_12345'
          });
          expect(nonExistentTable.error).toBeUndefined();
          expect(nonExistentTable.columns).toBeDefined();
          expect(nonExistentTable.columns!.length).toBe(0);

          // Test non-existent schema
          const nonExistentSchema = await listTablesTool({
            schema: 'nonexistent_schema_12345'
          });
          expect(nonExistentSchema.error).toBeUndefined();
          expect(nonExistentSchema.tables).toBeDefined();
          expect(nonExistentSchema.tables!.length).toBe(0);

        } finally {
          await closeDb();
        }
      });
    });
  });

  describe('View and Complex Query Support', () => {
    test('should work with database views', async () => {
      await withDocker(async () => {
        if (!testEnv) return;

        const { queryTool, describeTableTool, closeDb } = await testEnv.getTools();

        try {
          // Query the view
          const viewQuery = await queryTool({
            sql: 'SELECT * FROM testschema.published_posts ORDER BY view_count DESC'
          });
          expect(viewQuery.error).toBeUndefined();
          expect(viewQuery.rows).toBeDefined();
          expect(viewQuery.rows!.length).toBeGreaterThan(0);

          // Describe the view structure
          const viewStructure = await describeTableTool({
            schema: 'testschema',
            table: 'published_posts'
          });
          expect(viewStructure.error).toBeUndefined();
          expect(viewStructure.columns).toBeDefined();

          const viewColumns = viewStructure.columns!.map((c: any) => c.column_name);
          expect(viewColumns).toContain('title');
          expect(viewColumns).toContain('author_name');
          expect(viewColumns).toContain('category_name');

        } finally {
          await closeDb();
        }
      });
    });

    test('should handle complex queries with aggregations', async () => {
      await withDocker(async () => {
        if (!testEnv) return;

        const { queryTool, closeDb } = await testEnv.getTools();

        try {
          // Complex aggregation query
          const aggregationQuery = await queryTool({
            sql: `
              SELECT 
                c.name as category,
                COUNT(p.id) as post_count,
                AVG(p.view_count) as avg_views,
                MAX(p.created_at) as latest_post
              FROM testschema.categories c
              LEFT JOIN testschema.posts p ON c.id = p.category_id AND p.published = true
              GROUP BY c.id, c.name
              HAVING COUNT(p.id) > 0
              ORDER BY post_count DESC
            `
          });

          expect(aggregationQuery.error).toBeUndefined();
          expect(aggregationQuery.rows).toBeDefined();
          expect(aggregationQuery.rows!.length).toBeGreaterThan(0);

          // Window function query
          const windowQuery = await queryTool({
            sql: `
              SELECT 
                title,
                view_count,
                ROW_NUMBER() OVER (ORDER BY view_count DESC) as rank,
                view_count - LAG(view_count) OVER (ORDER BY view_count DESC) as view_diff
              FROM testschema.posts
              WHERE published = true
            `
          });

          expect(windowQuery.error).toBeUndefined();
          expect(windowQuery.rows).toBeDefined();

        } finally {
          await closeDb();
        }
      });
    });
  });
});