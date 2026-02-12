import type { SyncEvent } from "./types";

export function lastWriteWins(events: SyncEvent[]): SyncEvent[] {
  const sorted = [...events].sort((a, b) => {
    if (a.timestamp !== b.timestamp) {
      return a.timestamp - b.timestamp;
    }
    return a.deviceId.localeCompare(b.deviceId);
  });
  return sorted;
}

export function deduplicateEvents(events: SyncEvent[]): SyncEvent[] {
  const seen = new Set<string>();
  const result: SyncEvent[] = [];
  for (const event of events) {
    if (!seen.has(event.id)) {
      seen.add(event.id);
      result.push(event);
    }
  }
  return result;
}

export function resolveConflicts(events: SyncEvent[]): SyncEvent[] {
  const deduplicated = deduplicateEvents(events);
  return lastWriteWins(deduplicated);
}

export function mergeEventStreams(
  local: SyncEvent[],
  remote: SyncEvent[],
): SyncEvent[] {
  const combined = [...local, ...remote];
  return resolveConflicts(combined);
}
