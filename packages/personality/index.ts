export {
  ARCHETYPES,
  PERSONALITY_EVENTS,
  type ArchetypeType,
  type PersonalityEventType,
  type ArchetypeScores,
  type ArchetypeUpdatedPayload,
  type ArchetypeUpdatedEvent,
  type PersonalityEvent,
  type ToneStyle,
  type ToneOutput,
  type PersonalityState,
} from "./src/types";

export {
  detectArchetype,
  calculateScores,
  type RawMetrics,
} from "./src/profileDetector";

export {
  shouldEvolve,
  evolveArchetype,
  getArchetypeDescription,
} from "./src/archetypeEngine";

export { getTone } from "./src/toneEngine";

export {
  createInitialPersonalityState,
  personalityReducer,
  replayPersonalityEvents,
} from "./src/reducer";
