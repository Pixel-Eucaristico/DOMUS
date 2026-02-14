import type { DomainEvent } from "../../events/src/types";
import type { AppState } from "./state";
import { createInitialState } from "./state";
import { domainReducer } from "./reducer";

export function replayEvents(events: DomainEvent[]): AppState {
  let state = createInitialState();
  for (const event of events) {
    state = domainReducer(state, event);
  }
  return state;
}

export function replayEventsSince(
  baseState: AppState,
  events: DomainEvent[],
): AppState {
  let state = baseState;
  for (const event of events) {
    state = domainReducer(state, event);
  }
  return state;
}
