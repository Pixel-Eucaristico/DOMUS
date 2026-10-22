import type { DatabaseAdapter, EventRow } from "./types";
import { compareEvents } from "./eventOrder";

export function createMemoryAdapter(): DatabaseAdapter {
  const tables: Map<string, EventRow[]> = new Map();
  let initialized = false;

  function getTable(): EventRow[] {
    if (!tables.has("events")) {
      tables.set("events", []);
    }
    return tables.get("events")!;
  }

  return {
    execute(sql: string, params?: unknown[]): void {
      const trimmed = sql.trim().toUpperCase();

      if (trimmed.startsWith("CREATE TABLE")) {
        initialized = true;
        if (!tables.has("events")) {
          tables.set("events", []);
        }
        return;
      }

      if (trimmed.startsWith("INSERT")) {
        if (!initialized) return;
        const p = params ?? [];
        const table = getTable();

        const exists = table.some((row) => row.id === p[0]);
        if (exists) return;

        table.push({
          id: p[0] as string,
          type: p[1] as string,
          payload: p[2] as string,
          timestamp: p[3] as number,
          deviceId: p[4] as string,
          signature: p[5] as string,
        });
        return;
      }
    },

    query<T>(sql: string, params?: unknown[]): T[] {
      const table = getTable();
      const trimmed = sql.trim().toUpperCase();

      if (trimmed.includes("WHERE") && trimmed.includes("TIMESTAMP >")) {
        const ts = (params?.[0] ?? 0) as number;
        const filtered = table
          .filter((row) => row.timestamp > ts)
          .sort(compareEvents);
        return filtered as unknown as T[];
      }

      if (trimmed.includes("WHERE") && trimmed.includes("ID =")) {
        const id = params?.[0] as string;
        const found = table.filter((row) => row.id === id);
        return found as unknown as T[];
      }

      const sorted = [...table].sort(compareEvents);
      return sorted as unknown as T[];
    },

    queryOne<T>(sql: string, params?: unknown[]): T | null {
      const results = this.query<T>(sql, params);
      return results.length > 0 ? results[0]! : null;
    },
  };
}
