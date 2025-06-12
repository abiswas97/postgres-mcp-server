import { describe, test, expect, afterEach } from '@jest/globals';
import { cleanupDatabase } from '../../helpers/cleanup';

// Mock kysely sql
jest.mock('kysely', () => ({
  sql: jest.fn(() => ({
    execute: jest.fn(() => Promise.resolve({
      rows: [
        {
          column_name: 'id',
          data_type: 'integer',
          character_maximum_length: null,
          is_nullable: 'NO',
          column_default: 'nextval(...)'
        },
        {
          column_name: 'name',
          data_type: 'character varying',
          character_maximum_length: 100,
          is_nullable: 'NO',
          column_default: null
        }
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

describe('Describe Table Tool Unit Tests', () => {
  afterEach(async () => {
    await cleanupDatabase();
    jest.clearAllMocks();
  });

  describe('Input Validation', () => {
    test('should accept valid schema and table input', async () => {
      const { describeTableTool } = await import('../../../src/tools/describe');
      
      const result = await describeTableTool({
        schema: 'public',
        table: 'users'
      });
      
      expect(result).toBeDefined();
      expect(typeof result).toBe('object');
    });

    test('should handle empty schema or table names', async () => {
      const { describeTableTool } = await import('../../../src/tools/describe');
      
      const result = await describeTableTool({
        schema: '',
        table: ''
      });
      
      expect(result).toBeDefined();
      // Should not crash, but may return empty results
    });
  });

  describe('Return Value Structure', () => {
    test('should return columns array', async () => {
      const { describeTableTool } = await import('../../../src/tools/describe');
      
      const result = await describeTableTool({
        schema: 'public',
        table: 'users'
      });
      
      expect(result).toHaveProperty('columns');
      expect(result).not.toHaveProperty('error');
      expect(Array.isArray(result.columns)).toBe(true);
    });

    test('should return column objects with correct structure', async () => {
      const { describeTableTool } = await import('../../../src/tools/describe');
      
      const result = await describeTableTool({
        schema: 'public',
        table: 'users'
      });
      
      expect(result.columns).toBeDefined();
      expect(result.columns!.length).toBeGreaterThan(0);
      
      const firstColumn = result.columns![0];
      expect(firstColumn).toHaveProperty('column_name');
      expect(firstColumn).toHaveProperty('data_type');
      expect(firstColumn).toHaveProperty('character_maximum_length');
      expect(firstColumn).toHaveProperty('is_nullable');
      expect(firstColumn).toHaveProperty('column_default');
    });
  });

  describe('Error Handling', () => {
    test('should return error object for failed queries', async () => {
      const { sql } = await import('kysely');
      const mockSql = sql as jest.MockedFunction<typeof sql>;
      
      mockSql.mockImplementationOnce(() => ({
        execute: jest.fn(() => Promise.reject(new Error('Table not found')))
      } as any));

      const { describeTableTool } = await import('../../../src/tools/describe');
      
      const result = await describeTableTool({
        schema: 'public',
        table: 'nonexistent'
      });
      
      expect(result.error).toBeDefined();
      expect(typeof result.error).toBe('string');
      expect(result.columns).toBeUndefined();
    });
  });
});

describe('Get Constraints Tool Unit Tests', () => {
  beforeEach(() => {
    const { sql } = require('kysely');
    sql.mockImplementation(() => ({
      execute: jest.fn(() => Promise.resolve({
        rows: [
          {
            constraint_name: 'users_pkey',
            constraint_type: 'PRIMARY KEY',
            constraint_definition: 'PRIMARY KEY (id)'
          },
          {
            constraint_name: 'users_email_unique',
            constraint_type: 'UNIQUE',
            constraint_definition: 'UNIQUE (email)'
          }
        ]
      }))
    }));
  });

  afterEach(async () => {
    await cleanupDatabase();
    jest.clearAllMocks();
  });

  describe('Input Validation', () => {
    test('should accept valid schema and table input', async () => {
      const { getConstraintsTool } = await import('../../../src/tools/describe');
      
      const result = await getConstraintsTool({
        schema: 'public',
        table: 'users'
      });
      
      expect(result).toBeDefined();
      expect(typeof result).toBe('object');
    });
  });

  describe('Return Value Structure', () => {
    test('should return constraints array', async () => {
      const { getConstraintsTool } = await import('../../../src/tools/describe');
      
      const result = await getConstraintsTool({
        schema: 'public',
        table: 'users'
      });
      
      expect(result).toHaveProperty('constraints');
      expect(result).not.toHaveProperty('error');
      expect(Array.isArray(result.constraints)).toBe(true);
    });

    test('should return constraint objects with correct structure', async () => {
      const { getConstraintsTool } = await import('../../../src/tools/describe');
      
      const result = await getConstraintsTool({
        schema: 'public',
        table: 'users'
      });
      
      expect(result.constraints).toBeDefined();
      expect(result.constraints!.length).toBeGreaterThan(0);
      
      const firstConstraint = result.constraints![0];
      expect(firstConstraint).toHaveProperty('constraint_name');
      expect(firstConstraint).toHaveProperty('constraint_type');
      expect(firstConstraint).toHaveProperty('constraint_definition');
    });
  });

  describe('Error Handling', () => {
    test('should return error object for failed queries', async () => {
      const { sql } = await import('kysely');
      const mockSql = sql as jest.MockedFunction<typeof sql>;
      
      mockSql.mockImplementationOnce(() => ({
        execute: jest.fn(() => Promise.reject(new Error('Permission denied')))
      } as any));

      const { getConstraintsTool } = await import('../../../src/tools/describe');
      
      const result = await getConstraintsTool({
        schema: 'public',
        table: 'users'
      });
      
      expect(result.error).toBeDefined();
      expect(typeof result.error).toBe('string');
      expect(result.constraints).toBeUndefined();
    });
  });
});