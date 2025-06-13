import { describe, test, expect, afterEach } from '@jest/globals';
import { cleanupDatabase } from '../../helpers/cleanup';

// Mock sql.raw for explain queries
const mockSqlRaw = jest.fn(() => ({
  execute: jest.fn(() => Promise.resolve({
    rows: [
      { 'QUERY PLAN': 'Seq Scan on users  (cost=0.00..35.50 rows=2550 width=4)' }
    ]
  }))
}));

// Mock sql template function for table stats
const mockSql = jest.fn(() => ({
  execute: jest.fn(() => Promise.resolve({
    rows: [
      {
        schema_name: 'public',
        table_name: 'users',
        row_count: 1000,
        table_size_bytes: 65536,
        table_size_pretty: '64 kB',
        index_size_bytes: 16384,
        index_size_pretty: '16 kB',
        total_size_bytes: 81920,
        total_size_pretty: '80 kB',
        last_vacuum: '2024-01-01 12:00:00',
        last_autovacuum: null,
        last_analyze: '2024-01-01 12:00:00',
        last_autoanalyze: '2024-01-01 11:00:00'
      }
    ]
  }))
}));

// Mock kysely 
jest.mock('kysely', () => ({
  sql: Object.assign(mockSql, { raw: mockSqlRaw }),
  Kysely: jest.fn(),
  PostgresDialect: jest.fn()
}));

// Mock database module  
jest.mock('../../../src/db', () => ({
  getDb: jest.fn(() => ({})),
  closeDb: jest.fn(() => Promise.resolve())
}));

describe('Performance Tools Unit Tests', () => {
  afterEach(async () => {
    await cleanupDatabase();
    jest.clearAllMocks();
  });

  describe('Explain Query Tool', () => {
    describe('Input Validation', () => {
      test('should accept valid SELECT query', async () => {
        const { explainQueryTool } = await import('../../../src/tools/performance');
        
        const result = await explainQueryTool({ sql: 'SELECT * FROM users' });
        
        expect(result).toBeDefined();
        expect(typeof result).toBe('object');
      });

      test('should reject INSERT queries', async () => {
        const { explainQueryTool } = await import('../../../src/tools/performance');
        
        const result = await explainQueryTool({ sql: 'INSERT INTO users (name) VALUES (\'test\')' });
        
        expect(result.error).toBeDefined();
        expect(result.error).toContain('EXPLAIN is only allowed for SELECT queries');
      });

      test('should reject UPDATE queries', async () => {
        const { explainQueryTool } = await import('../../../src/tools/performance');
        
        const result = await explainQueryTool({ sql: 'UPDATE users SET name = \'test\'' });
        
        expect(result.error).toBeDefined();
        expect(result.error).toContain('EXPLAIN is only allowed for SELECT queries');
      });

      test('should reject DELETE queries', async () => {
        const { explainQueryTool } = await import('../../../src/tools/performance');
        
        const result = await explainQueryTool({ sql: 'DELETE FROM users' });
        
        expect(result.error).toBeDefined();
        expect(result.error).toContain('EXPLAIN is only allowed for SELECT queries');
      });

      test('should reject DROP queries', async () => {
        const { explainQueryTool } = await import('../../../src/tools/performance');
        
        const result = await explainQueryTool({ sql: 'DROP TABLE users' });
        
        expect(result.error).toBeDefined();
        expect(result.error).toContain('EXPLAIN is only allowed for SELECT queries');
      });

      test('should accept WITH queries', async () => {
        const { explainQueryTool } = await import('../../../src/tools/performance');
        
        const result = await explainQueryTool({ sql: 'WITH cte AS (SELECT * FROM users) SELECT * FROM cte' });
        
        expect(result).toBeDefined();
        expect(result.plan).toBeDefined();
      });
    });

    describe('Return Value Structure', () => {
      test('should return plan array for valid queries', async () => {
        const { explainQueryTool } = await import('../../../src/tools/performance');
        
        const result = await explainQueryTool({ sql: 'SELECT * FROM users' });
        
        expect(result).toHaveProperty('plan');
        expect(result).not.toHaveProperty('error');
        expect(Array.isArray(result.plan)).toBe(true);
      });

      test('should handle analyze option', async () => {
        const { explainQueryTool } = await import('../../../src/tools/performance');
        
        const result = await explainQueryTool({ sql: 'SELECT * FROM users', analyze: true });
        
        expect(result).toBeDefined();
        expect(result.plan).toBeDefined();
      });

      test('should handle buffers option', async () => {
        const { explainQueryTool } = await import('../../../src/tools/performance');
        
        const result = await explainQueryTool({ sql: 'SELECT * FROM users', buffers: true });
        
        expect(result).toBeDefined();
        expect(result.plan).toBeDefined();
      });

      test('should handle format option', async () => {
        const { explainQueryTool } = await import('../../../src/tools/performance');
        
        const result = await explainQueryTool({ sql: 'SELECT * FROM users', format: 'json' });
        
        expect(result).toBeDefined();
        expect(result.plan).toBeDefined();
      });
    });

    describe('Error Handling', () => {
      test('should return error object for failed queries', async () => {
        mockSqlRaw.mockImplementationOnce(() => ({
          execute: jest.fn(() => Promise.reject(new Error('Database error')))
        } as any));

        const { explainQueryTool } = await import('../../../src/tools/performance');
        
        const result = await explainQueryTool({ sql: 'SELECT * FROM users' });
        
        expect(result.error).toBeDefined();
        expect(typeof result.error).toBe('string');
        expect(result.plan).toBeUndefined();
      });
    });
  });

  describe('Get Table Stats Tool', () => {

    describe('Input Validation', () => {
      test('should accept schema and table input', async () => {
        const { getTableStatsTool } = await import('../../../src/tools/performance');
        
        const result = await getTableStatsTool({ schema: 'public', table: 'users' });
        
        expect(result).toBeDefined();
        expect(typeof result).toBe('object');
      });

      test('should accept schema without table', async () => {
        const { getTableStatsTool } = await import('../../../src/tools/performance');
        
        const result = await getTableStatsTool({ schema: 'public' });
        
        expect(result).toBeDefined();
        expect(result.stats).toBeDefined();
      });
    });

    describe('Return Value Structure', () => {
      test('should return stats array', async () => {
        const { getTableStatsTool } = await import('../../../src/tools/performance');
        
        const result = await getTableStatsTool({ schema: 'public' });
        
        expect(result).toHaveProperty('stats');
        expect(result).not.toHaveProperty('error');
        expect(Array.isArray(result.stats)).toBe(true);
      });

      test('should return stats objects with correct structure', async () => {
        const { getTableStatsTool } = await import('../../../src/tools/performance');
        
        const result = await getTableStatsTool({ schema: 'public' });
        
        expect(result.stats).toBeDefined();
        expect(result.stats!.length).toBeGreaterThan(0);
        
        const firstStat = result.stats![0];
        expect(firstStat).toHaveProperty('schema_name');
        expect(firstStat).toHaveProperty('table_name');
        expect(firstStat).toHaveProperty('row_count');
        expect(firstStat).toHaveProperty('table_size_bytes');
        expect(firstStat).toHaveProperty('table_size_pretty');
        expect(firstStat).toHaveProperty('index_size_bytes');
        expect(firstStat).toHaveProperty('index_size_pretty');
        expect(firstStat).toHaveProperty('total_size_bytes');
        expect(firstStat).toHaveProperty('total_size_pretty');
        expect(typeof firstStat.schema_name).toBe('string');
        expect(typeof firstStat.table_name).toBe('string');
        expect(typeof firstStat.row_count).toBe('number');
        expect(typeof firstStat.table_size_bytes).toBe('number');
        expect(typeof firstStat.table_size_pretty).toBe('string');
      });
    });

    describe('Error Handling', () => {
      test('should return error object for failed queries', async () => {
        mockSql.mockImplementationOnce(() => ({
          execute: jest.fn(() => Promise.reject(new Error('Database error')))
        } as any));

        const { getTableStatsTool } = await import('../../../src/tools/performance');
        
        const result = await getTableStatsTool({ schema: 'public' });
        
        expect(result.error).toBeDefined();
        expect(typeof result.error).toBe('string');
        expect(result.stats).toBeUndefined();
      });
    });
  });
});