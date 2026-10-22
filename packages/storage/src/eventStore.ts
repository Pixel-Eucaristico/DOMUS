import type { DatabaseAdapter, EventRow } from "./types";

export interface SyncEvent {
  id: string;
  type: string;
  payload: unknown;
  timestamp: number;
  deviceId: string;
  signature: string;
}

const CREATE_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS events (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL,
    payload TEXT NOT NULL,
    timestamp INTEGER NOT NULL,
    deviceId TEXT NOT NULL,
    signature TEXT NOT NULL
  )
`;

const INSERT_EVENT_SQL = `
  INSERT OR IGNORE INTO events (id, type, payload, timestamp, deviceId, signature)
  VALUES (?, ?, ?, ?, ?, ?)
`;

// Story 3.4: mesmos campos do `compareEvents` (timestamp, deviceId, id), mas NÃO é
// garantida a mesma ordem em todo caso. Coincide para timestamps inteiros finitos e
// texto ASCII. Diverge quando: timestamp é texto não numérico (fica TEXT e o SQLite o
// põe depois de todo número; a memória o trata como 0), `Infinity`/`NaN` (o driver
// grava valor ou NULL diferente do 0 da memória), e texto fora do BMP contra
// U+E000–U+FFFF (BINARY compara bytes UTF-8 = code point; o JS compara unidades
// UTF-16). Por isso a memória sempre reordena com `compareEvents` depois de carregar.
export const SELECT_ALL_SQL = `
  SELECT id, type, payload, timestamp, deviceId, signature
  FROM events
  ORDER BY timestamp ASC, deviceId ASC, id ASC
`;

export const SELECT_SINCE_SQL = `
  SELECT id, type, payload, timestamp, deviceId, signature
  FROM events
  WHERE timestamp > ?
  ORDER BY timestamp ASC, deviceId ASC, id ASC
`;

const SELECT_EXISTS_SQL = `
  SELECT id FROM events WHERE id = ?
`;

function rowToEvent(row: EventRow): SyncEvent {
  let parsed: unknown;
  try {
    parsed = JSON.parse(row.payload);
  } catch {
    parsed = row.payload;
  }

  return {
    id: row.id,
    type: row.type,
    payload: parsed,
    timestamp: row.timestamp,
    deviceId: row.deviceId,
    signature: row.signature,
  };
}

export class SQLiteEventStore {
  private db: DatabaseAdapter;
  private initialized = false;

  constructor(db: DatabaseAdapter) {
    this.db = db;
  }

  initDatabase(): void {
    if (this.initialized) return;
    this.db.execute(CREATE_TABLE_SQL);
    this.initialized = true;
  }

  appendEvent(event: SyncEvent): boolean {
    this.ensureInitialized();

    if (this.eventExists(event.id)) {
      return false;
    }

    const payloadJson =
      typeof event.payload === "string"
        ? event.payload
        : JSON.stringify(event.payload);

    this.db.execute(INSERT_EVENT_SQL, [
      event.id,
      event.type,
      payloadJson,
      event.timestamp,
      event.deviceId,
      event.signature,
    ]);

    return true;
  }

  getAllEvents(): SyncEvent[] {
    this.ensureInitialized();
    const rows = this.db.query<EventRow>(SELECT_ALL_SQL);
    return rows.map(rowToEvent);
  }

  getEventsSince(timestamp: number): SyncEvent[] {
    this.ensureInitialized();
    const rows = this.db.query<EventRow>(SELECT_SINCE_SQL, [timestamp]);
    return rows.map(rowToEvent);
  }

  eventExists(id: string): boolean {
    this.ensureInitialized();
    const result = this.db.queryOne<{ id: string }>(SELECT_EXISTS_SQL, [id]);
    return result !== null;
  }

  replayEvents<TState>(
    initialState: TState,
    reducer: (state: TState, event: SyncEvent) => TState,
  ): TState {
    const events = this.getAllEvents();
    let state = initialState;
    for (const event of events) {
      state = reducer(state, event);
    }
    return state;
  }

  getEventCount(): number {
    return this.getAllEvents().length;
  }

  clearAllEvents(): void {
    this.ensureInitialized();
    this.db.execute("DELETE FROM events");
  }

  private ensureInitialized(): void {
    if (!this.initialized) {
      this.initDatabase();
    }
  }
}
