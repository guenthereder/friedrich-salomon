import Database from "better-sqlite3";
import type { Database as DatabaseType } from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { DB_PATH, DATA_DIR } from "./constants";
import { migrate } from "./migrations";

let db: DatabaseType | null = null;

export function getDb(): DatabaseType {
  if (db) return db;
  mkdirSync(DATA_DIR, { recursive: true });
  const conn = new Database(DB_PATH);
  conn.exec("PRAGMA journal_mode = WAL");
  conn.exec("PRAGMA foreign_keys = ON");
  db = conn;
  // Ensure schema exists on first connection so the app self-initializes
  // without needing a manual `npm run migrate` step.
  migrate();
  return conn;
}

export type Db = DatabaseType;
export default getDb;
