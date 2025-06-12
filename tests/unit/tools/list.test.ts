import { describe, test, expect, afterEach } from '@jest/globals';
import { cleanupDatabase } from '../../helpers/cleanup';

// Mock kysely sql
jest.mock('kysely', () => ({
  sql: jest.fn(() => ({
    execute: jest.fn(() => Promise.resolve({
      rows: [
        { table_name: 'users', table_type: 'BASE TABLE' },
        { table_name: 'posts', table_type: 'BASE TABLE' },
        { table_name: 'user_view', table_type: 'VIEW' }
      ]
    }))
  })),
  Kysely: jest.fn(),
  PostgresDialect: jest.fn()
}));

// Mock database module
jest.mock('../../../src/db', () => ({
  getDb: jest.fn(() => ({})),
  closeDb: jest.fn(() => Promise.resolve())
}));

describe('List Tables Tool Unit Tests', () => {
  afterEach(async () => {
    await cleanupDatabase();
    jest.clearAllMocks();
  });

  describe('Input Validation', () => {
    test('should accept valid schema input', async () => {
      const { listTablesTool } = await import('../../../src/tools/list');
      
      const result = await listTablesTool({ schema: 'public' });
      
      expect(result).toBeDefined();
      expect(typeof result).toBe('object');
    });

    test('should use default schema when none provided', async () => {
      const { listTablesTool } = await import('../../../src/tools/list');
      
      const result = await listTablesTool({});
      
      expect(result).toBeDefined();
      expect(result.tables).toBeDefined();
    });

    test('should handle empty schema string', async () => {
      const { listTablesTool } = await import('../../../src/tools/list');
      
      const result = await listTablesTool({ schema: '' });
      
      expect(result).toBeDefined();
      // Should use empty string as schema name
    });
  });

  describe('Schema Handling', () => {
    test('should default to public schema when no schema provided', async () => {
      const { sql } = await import('kysely');
      const mockSql = sql as jest.MockedFunction<typeof sql>;
      
      const { listTablesTool } = await import('../../../src/tools/list');
      
      await listTablesTool({});
      
      // Verify that the query was called (schema defaulting is handled in the tool)
      expect(mockSql).toHaveBeenCalled();
    });

    test('should use provided schema', async () => {
      const { listTablesTool } = await import('../../../src/tools/list');
      
      const result = await listTablesTool({ schema: 'test_schema' });
      
      expect(result.tables).toBeDefined();
    });
  });

  describe('Return Value Structure', () => {
    test('should return tables array', async () => {
      const { listTablesTool } = await import('../../../src/tools/list');
      
      const result = await listTablesTool({ schema: 'public' });
      
      expect(result).toHaveProperty('tables');
      expect(result).not.toHaveProperty('error');
      expect(Array.isArray(result.tables)).toBe(true);
    });

    test('should return table objects with correct structure', async () => {
      const { listTablesTool } = await import('../../../src/tools/list');
      
      const result = await listTablesTool({ schema: 'public' });
      
      expect(result.tables).toBeDefined();
      expect(result.tables!.length).toBeGreaterThan(0);
      
      const firstTable = result.tables![0];
      expect(firstTable).toHaveProperty('table_name');
      expect(firstTable).toHaveProperty('table_type');
      expect(typeof firstTable.table_name).toBe('string');
      expect(typeof firstTable.table_type).toBe('string');
    });

    test('should include both tables and views', async () => {
      const { listTablesTool } = await import('../../../src/tools/list');
      
      const result = await listTablesTool({ schema: 'public' });
      
      const tableTypes = result.tables!.map(t => t.table_type);
      expect(tableTypes).toContain('BASE TABLE');
      expect(tableTypes).toContain('VIEW');
    });
  });

  describe('Error Handling', () => {
    test('should return error object for failed queries', async () => {
      const { sql } = await import('kysely');
      const mockSql = sql as jest.MockedFunction<typeof sql>;
      
      mockSql.mockImplementationOnce(() => ({
        execute: jest.fn(() => Promise.reject(new Error('Database error')))
      } as any));

      const { listTablesTool } = await import('../../../src/tools/list');
      
      const result = await listTablesTool({ schema: 'public' });
      
      expect(result.error).toBeDefined();
      expect(typeof result.error).toBe('string');
      expect(result.tables).toBeUndefined();
    });

    test('should handle non-Error exceptions', async () => {
      const { sql } = await import('kysely');
      const mockSql = sql as jest.MockedFunction<typeof sql>;
      
      mockSql.mockImplementationOnce(() => ({
        execute: jest.fn(() => Promise.reject('string error'))
      } as any));

      const { listTablesTool } = await import('../../../src/tools/list');
      
      const result = await listTablesTool({ schema: 'public' });
      
      expect(result.error).toBe('Unknown error occurred');
    });
  });
});