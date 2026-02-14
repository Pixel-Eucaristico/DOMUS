export interface StoredEvent {
  id: string;
  type: string;
  payload: string;
  timestamp: number;
  deviceId: string;
  signature: string;
}

export interface EventRow {
  id: string;
  type: string;
  payload: string;
  timestamp: number;
  deviceId: string;
  signature: string;
}

export interface DatabaseAdapter {
  execute(sql: string, params?: unknown[]): void;
  query<T>(sql: string, params?: unknown[]): T[];
  queryOne<T>(sql: string, params?: unknown[]): T | null;
}
