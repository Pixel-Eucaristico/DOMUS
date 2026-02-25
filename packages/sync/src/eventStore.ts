import type { SyncEvent } from "./types";
import type { CryptoAdapter } from "./crypto";

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 11);
}

export class EventStore {
  private events: SyncEvent[] = [];
  private eventIds: Set<string> = new Set();
  private crypto: CryptoAdapter;
  private deviceId: string;
  private privateKey: string;

  constructor(deviceId: string, privateKey: string, cryptoAdapter: CryptoAdapter) {
    this.deviceId = deviceId;
    this.privateKey = privateKey;
    this.crypto = cryptoAdapter;
  }

  async appendEvent(type: string, payload: unknown): Promise<SyncEvent> {
    const id = generateId();
    const timestamp = Date.now();
    const dataToSign = JSON.stringify({ id, type, payload, timestamp, deviceId: this.deviceId });
    const signature = await this.crypto.sign(dataToSign, this.privateKey);

    const event: SyncEvent = {
      id,
      type,
      payload,
      timestamp,
      deviceId: this.deviceId,
      signature,
    };

    this.events.push(event);
    this.eventIds.add(id);
    return event;
  }

  addRemoteEvent(event: SyncEvent): boolean {
    if (this.eventIds.has(event.id)) {
      return false;
    }
    this.events.push(event);
    this.eventIds.add(event.id);
    this.events.sort((a, b) => a.timestamp - b.timestamp);
    return true;
  }

  addRemoteEvents(events: SyncEvent[]): number {
    let added = 0;
    for (const event of events) {
      if (this.addRemoteEvent(event)) {
        added++;
      }
    }
    return added;
  }

  getEventsSince(timestamp: number): SyncEvent[] {
    return this.events.filter((e) => e.timestamp > timestamp);
  }

  getEventsNotIn(knownIds: Set<string>): SyncEvent[] {
    return this.events.filter((e) => !knownIds.has(e.id));
  }

  getAllEvents(): SyncEvent[] {
    return [...this.events];
  }

  getEventCount(): number {
    return this.events.length;
  }

  hasEvent(id: string): boolean {
    return this.eventIds.has(id);
  }

  replayEvents<TState>(
    initialState: TState,
    reducer: (state: TState, event: SyncEvent) => TState,
  ): TState {
    let state = initialState;
    const sorted = [...this.events].sort((a, b) => a.timestamp - b.timestamp);
    for (const event of sorted) {
      state = reducer(state, event);
    }
    return state;
  }

  async verifyEvent(event: SyncEvent, publicKey: string): Promise<boolean> {
    const dataToVerify = JSON.stringify({
      id: event.id,
      type: event.type,
      payload: event.payload,
      timestamp: event.timestamp,
      deviceId: event.deviceId,
    });
    return this.crypto.verify(dataToVerify, event.signature, publicKey);
  }
}
