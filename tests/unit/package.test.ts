import { describe, test, expect } from "@jest/globals";

describe("Package Structure", () => {
  describe("Module Exports", () => {
    test("should export database module without errors", () => {
      expect(() => require("../../src/db")).not.toThrow();
    });

    test("should export all tool modules without errors", () => {
      expect(() => require("../../src/tools/query")).not.toThrow();
      expect(() => require("../../src/tools/list")).not.toThrow();
      expect(() => require("../../src/tools/describe")).not.toThrow();
    });
  });

  describe("Configuration Files", () => {
    test("should have valid package.json structure", () => {
      const pkg = require("../../package.json");

      expect(pkg.name).toBe("postgres-mcp-server");
      expect(pkg.main).toBe("dist/index.js");
      expect(pkg.type).toBe("module");
      expect(pkg.bin).toHaveProperty("postgres-mcp-server");

      // Check required dependencies
      expect(pkg.dependencies).toHaveProperty("@modelcontextprotocol/sdk");
      expect(pkg.dependencies).toHaveProperty("kysely");
      expect(pkg.dependencies).toHaveProperty("pg");
      expect(pkg.dependencies).toHaveProperty("dotenv");
    });

    test("should have valid TypeScript configuration", () => {
      const tsconfig = require("../../tsconfig.json");

      expect(tsconfig.compilerOptions.target).toBe("ES2022");
      expect(tsconfig.compilerOptions.module).toBe("ES2022");
      expect(tsconfig.compilerOptions.strict).toBe(true);
      expect(tsconfig.compilerOptions.outDir).toBe("./dist");
    });
  });

  describe("Database Module Interface", () => {
    test("should export required database functions", async () => {
      const dbModule = await import("../../src/db");

      expect(typeof dbModule.getDb).toBe("function");
      expect(typeof dbModule.closeDb).toBe("function");
    });
  });

  describe("Tool Module Interfaces", () => {
    test("should export query tool function", async () => {
      const { queryTool } = await import("../../src/tools/query");
      expect(typeof queryTool).toBe("function");
    });

    test("should export list tables tool function", async () => {
      const { listTablesTool } = await import("../../src/tools/list");
      expect(typeof listTablesTool).toBe("function");
    });

    test("should export describe table tools", async () => {
      const { describeTableTool, getConstraintsTool } = await import(
        "../../src/tools/describe"
      );
      expect(typeof describeTableTool).toBe("function");
      expect(typeof getConstraintsTool).toBe("function");
    });
  });
});
