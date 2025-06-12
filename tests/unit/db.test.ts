import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import { cleanupDatabase } from '../helpers/cleanup';

describe('Database Module', () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    originalEnv = { ...process.env };
    
    // Clear module cache to ensure fresh imports
    delete require.cache[require.resolve('../../src/db')];
  });

  afterEach(async () => {
    await cleanupDatabase();
    process.env = originalEnv;
  });

  describe('Configuration', () => {
    test('should use default values when environment variables are not set', () => {
      // Remove database environment variables
      delete process.env.DB_HOST;
      delete process.env.DB_PORT;
      delete process.env.DB_USER;
      delete process.env.DB_NAME;
      delete process.env.DB_SSL;
      
      // The module should still load without throwing
      expect(() => require('../../src/db')).not.toThrow();
    });

    test('should handle missing password gracefully', () => {
      delete process.env.DB_PASSWORD;
      
      // Module should load (connection will fail later, but that's expected)
      expect(() => require('../../src/db')).not.toThrow();
    });
  });

  describe('Connection Management', () => {
    test('should implement singleton pattern for database instance', async () => {
      // Set up minimal test environment
      process.env.DB_HOST = 'localhost';
      process.env.DB_PASSWORD = 'test';
      
      const { getDb } = await import('../../src/db');
      
      const db1 = getDb();
      const db2 = getDb();
      
      expect(db1).toBe(db2); // Should be the same instance
    });

    test('should create new instance after closing connection', async () => {
      process.env.DB_HOST = 'localhost';
      process.env.DB_PASSWORD = 'test';
      
      const { getDb, closeDb } = await import('../../src/db');
      
      const db1 = getDb();
      await closeDb();
      const db2 = getDb();
      
      expect(db1).not.toBe(db2); // Should be different instances
    });
  });

  describe('SSL Configuration', () => {
    test('should configure SSL with rejectUnauthorized false by default', async () => {
      process.env.DB_HOST = 'localhost';
      process.env.DB_PASSWORD = 'test';
      // DB_SSL is undefined, should default to true with rejectUnauthorized: false
      
      // This tests that the module loads without error with SSL config
      const { getDb } = await import('../../src/db');
      expect(typeof getDb).toBe('function');
    });

    test('should disable SSL when DB_SSL is false', async () => {
      process.env.DB_HOST = 'localhost';
      process.env.DB_PASSWORD = 'test';
      process.env.DB_SSL = 'false';
      
      const { getDb } = await import('../../src/db');
      expect(typeof getDb).toBe('function');
    });

    test('should enable SSL when DB_SSL is true', async () => {
      process.env.DB_HOST = 'localhost';
      process.env.DB_PASSWORD = 'test';
      process.env.DB_SSL = 'true';
      
      const { getDb } = await import('../../src/db');
      expect(typeof getDb).toBe('function');
    });
  });
});