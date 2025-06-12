import { Kysely, PostgresDialect } from "kysely";
import { Pool } from "pg";
import * as dotenv from "dotenv";

dotenv.config();

export interface Database {
  [key: string]: any;
}

let db: Kysely<Database> | null = null;

export function getDb(): Kysely<Database> {
  if (!db) {
    const pool = new Pool({
      host: process.env.DB_HOST || "127.0.0.1",
      port: parseInt(process.env.DB_PORT || "5432"),
      user: process.env.DB_USER || "postgres",
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME || "postgres",
      max: 1,
      idleTimeoutMillis: 5000,
      ssl:
        process.env.DB_SSL === "true" || process.env.DB_SSL === undefined
          ? {
              rejectUnauthorized: false,
            }
          : false,
    });

    db = new Kysely<Database>({
      dialect: new PostgresDialect({
        pool,
      }),
    });
  }

  return db;
}

export async function closeDb(): Promise<void> {
  if (db) {
    await db.destroy();
    db = null;
  }
}
