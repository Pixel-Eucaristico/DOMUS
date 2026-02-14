import type { DomainEvent, EventType } from "./types";

export function generateId(): string {
  return (
    Date.now().toString(36) + Math.random().toString(36).substring(2, 11)
  );
}

export function createEvent<T extends DomainEvent>(
  type: T["type"],
  payload: T["payload"],
  deviceId: string = "local",
): T {
  return {
    id: generateId(),
    type: type as EventType,
    payload,
    timestamp: Date.now(),
    deviceId,
    signature: "",
  } as T;
}
