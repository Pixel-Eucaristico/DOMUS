import type { DatabaseAdapter } from "./types";

let SQLite: typeof import("expo-sqlite") | null = null;

async function loadSQLite() {
  if (!SQLite) {
    SQLite = await import("expo-sqlite");
  }
  return SQLite;
}

export async function createSQLiteAdapter(
  dbName: string = "domus.db",
): Promise<DatabaseAdapter> {
  const sqlite = await loadSQLite();
  const db = sqlite.openDatabaseSync(dbName);

  return {
    execute(sql: string, params?: unknown[]): void {
      db.runSync(sql, params ?? []);
    },

    query<T>(sql: string, params?: unknown[]): T[] {
      return db.getAllSync<T>(sql, params ?? []);
    },

    queryOne<T>(sql: string, params?: unknown[]): T | null {
      const result = db.getFirstSync<T>(sql, params ?? []);
      return result ?? null;
    },
  };
}
