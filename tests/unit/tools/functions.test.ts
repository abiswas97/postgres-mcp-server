import { describe, test, expect, afterEach } from '@jest/globals';
import { cleanupDatabase } from '../../helpers/cleanup';

// Mock kysely sql
jest.mock('kysely', () => ({
  sql: jest.fn(() => ({
    execute: jest.fn(() => Promise.resolve({
      rows: [
        {
          schema_name: 'public',
          function_name: 'calculate_total',
          return_type: 'numeric',
          argument_types: 'price numeric, tax_rate numeric',
          function_type: 'function',
          language: 'plpgsql',
          is_aggregate: false,
          is_window: false,
          security_type: 'invoker',
          volatility: 'immutable',
          parallel_safety: 'safe',
          description: 'Calculates total price including tax'
        },
        {
          schema_name: 'public',
          function_name: 'update_user_stats',
          return_type: 'void',
          argument_types: '',
          function_type: 'procedure',
          language: 'plpgsql',
          is_aggregate: false,
          is_window: false,
          security_type: 'definer',
          volatility: 'volatile',
          parallel_safety: 'unsafe',
          description: null
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

describe('List Functions Tool Unit Tests', () => {
  afterEach(async () => {
    await cleanupDatabase();
    jest.clearAllMocks();
  });

  describe('Input Validation', () => {
    test('should accept valid schema input', async () => {
      const { listFunctionsTool } = await import('../../../src/tools/functions');
      
      const result = await listFunctionsTool({ schema: 'public' });
      
      expect(result).toBeDefined();
      expect(typeof result).toBe('object');
    });

    test('should use default schema when none provided', async () => {
      const { listFunctionsTool } = await import('../../../src/tools/functions');
      
      const result = await listFunctionsTool({});
      
      expect(result).toBeDefined();
      expect(result.functions).toBeDefined();
    });

    test('should handle custom schema', async () => {
      const { listFunctionsTool } = await import('../../../src/tools/functions');
      
      const result = await listFunctionsTool({ schema: 'custom_schema' });
      
      expect(result).toBeDefined();
    });
  });

  describe('Return Value Structure', () => {
    test('should return functions array', async () => {
      const { listFunctionsTool } = await import('../../../src/tools/functions');
      
      const result = await listFunctionsTool({ schema: 'public' });
      
      expect(result).toHaveProperty('functions');
      expect(result).not.toHaveProperty('error');
      expect(Array.isArray(result.functions)).toBe(true);
    });

    test('should return function objects with correct structure', async () => {
      const { listFunctionsTool } = await import('../../../src/tools/functions');
      
      const result = await listFunctionsTool({ schema: 'public' });
      
      expect(result.functions).toBeDefined();
      expect(result.functions!.length).toBeGreaterThan(0);
      
      const firstFunction = result.functions![0];
      expect(firstFunction).toHaveProperty('schema_name');
      expect(firstFunction).toHaveProperty('function_name');
      expect(firstFunction).toHaveProperty('return_type');
      expect(firstFunction).toHaveProperty('argument_types');
      expect(firstFunction).toHaveProperty('function_type');
      expect(firstFunction).toHaveProperty('language');
      expect(firstFunction).toHaveProperty('is_aggregate');
      expect(firstFunction).toHaveProperty('is_window');
      expect(firstFunction).toHaveProperty('security_type');
      expect(firstFunction).toHaveProperty('volatility');
      expect(firstFunction).toHaveProperty('parallel_safety');
      expect(typeof firstFunction.schema_name).toBe('string');
      expect(typeof firstFunction.function_name).toBe('string');
      expect(typeof firstFunction.return_type).toBe('string');
      expect(typeof firstFunction.argument_types).toBe('string');
      expect(typeof firstFunction.function_type).toBe('string');
      expect(typeof firstFunction.language).toBe('string');
      expect(typeof firstFunction.is_aggregate).toBe('boolean');
      expect(typeof firstFunction.is_window).toBe('boolean');
      expect(typeof firstFunction.security_type).toBe('string');
      expect(typeof firstFunction.volatility).toBe('string');
      expect(typeof firstFunction.parallel_safety).toBe('string');
    });

    test('should include both functions and procedures', async () => {
      const { listFunctionsTool } = await import('../../../src/tools/functions');
      
      const result = await listFunctionsTool({ schema: 'public' });
      
      const functionTypes = result.functions!.map(f => f.function_type);
      expect(functionTypes).toContain('function');
      expect(functionTypes).toContain('procedure');
    });

    test('should handle null description', async () => {
      const { listFunctionsTool } = await import('../../../src/tools/functions');
      
      const result = await listFunctionsTool({ schema: 'public' });
      
      const functionWithNullDesc = result.functions!.find(f => f.description === null);
      expect(functionWithNullDesc).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    test('should return error object for failed queries', async () => {
      const { sql } = await import('kysely');
      const mockSql = sql as jest.MockedFunction<typeof sql>;
      
      mockSql.mockImplementationOnce(() => ({
        execute: jest.fn(() => Promise.reject(new Error('Database error')))
      } as any));

      const { listFunctionsTool } = await import('../../../src/tools/functions');
      
      const result = await listFunctionsTool({ schema: 'public' });
      
      expect(result.error).toBeDefined();
      expect(typeof result.error).toBe('string');
      expect(result.functions).toBeUndefined();
    });

    test('should handle non-Error exceptions', async () => {
      const { sql } = await import('kysely');
      const mockSql = sql as jest.MockedFunction<typeof sql>;
      
      mockSql.mockImplementationOnce(() => ({
        execute: jest.fn(() => Promise.reject('string error'))
      } as any));

      const { listFunctionsTool } = await import('../../../src/tools/functions');
      
      const result = await listFunctionsTool({ schema: 'public' });
      
      expect(result.error).toBe('Unknown error occurred');
    });
  });
});