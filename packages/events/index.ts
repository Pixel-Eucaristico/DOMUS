export type {
  DomainEvent,
  AccountCreatedEvent,
  AccountUpdatedEvent,
  AccountDeletedEvent,
  TransactionCreatedEvent,
  TransactionUpdatedEvent,
  TransactionDeletedEvent,
  CategoryCreatedEvent,
  EventType,
  AccountType,
  TransactionType,
  CategoryGroup,
  AccountPayload,
  TransactionPayload,
  InstallmentInfo,
  CategoryPayload,
} from "./src/types";

export {
  EVENT_TYPES,
  ACCOUNT_TYPES,
  TRANSACTION_TYPES,
  CATEGORY_GROUPS,
} from "./src/types";

export { createEvent, generateId } from "./src/factory";

export {
  validateEnvelope,
  partitionEnvelopes,
  describeRejection,
  MIN_ENVELOPE_TIMESTAMP_MS,
  MAX_ENVELOPE_TIMESTAMP_MS,
} from "./src/validateEnvelope";
export type {
  EnvelopeRejectionReason,
  EnvelopeRejection,
  EnvelopeAccepted,
  EnvelopeValidationResult,
  EnvelopePartition,
} from "./src/validateEnvelope";

export {
  SCHEMA_REGISTRY,
  SCHEMA_VERSION_FIELD,
  PROFILE_ID_FIELD,
  PAYLOAD_METADATA_FIELDS,
  currentSchemaVersion,
  shouldStampSchemaVersion,
  readSchemaVersion,
  stripPayloadMetadata,
  upcastPayload,
  stampSchemaVersion,
} from "./src/schemaVersion";
export type {
  PayloadUpcaster,
  TypeSchema,
  SchemaRegistry,
  SchemaVersionRead,
  UpcastResult,
} from "./src/schemaVersion";
