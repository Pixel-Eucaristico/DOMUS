# Epic 9 Context: Configurações iguais em todos os aparelhos

<!-- Generated from planning artifacts. Regenerate with compile-epic-context if planning docs change. -->

## Goal

Synchronize low-risk user preferences (theme, sound, support mode, AI configuration and custom prices, OCR configuration without keys, and Google Drive backup preference) across devices as events in the append-only log, while establishing a complete, test-enforced inventory of all data stored outside the event log. This eliminates reconfiguring each device manually while strictly keeping secrets, auth tokens, and per-device consent isolated to the local device.

## Stories

- Story 9.1: Inventariar e classificar tudo que o app guarda fora do log
- Story 9.2: Criar o evento de preferência e o reducer
- Story 9.3: Sincronizar tema, som e modo de apoio
- Story 9.4: Sincronizar a configuração de IA e os preços personalizados
- Story 9.5: Sincronizar a configuração do OCR sem a chave
- Story 9.6: Sincronizar a preferência do backup no Drive
- Story 9.7: Barrar por teste dado do aparelho no sync

## Requirements & Constraints

- **Complete out-of-log data inventory:** Every key stored outside the event log (`AsyncStorage` and `SecureStore`) must be documented in `docs/inventario-dados.md` and classified into one of four categories with rationale: **vira evento**, **usa outro canal**, **não sincroniza**, or **é segredo**. No key may remain unclassified, and automated tests must fail if code uses an unclassified key.
- **Low-risk preferences only:** Only low-risk preferences synchronize in this epic: theme (`domus_theme_mode_v1`), sound (`domus_sound_enabled_v1`), support mode(s) (`domus_support_mode(s)`), AI provider/model tier/audio/custom prices (`domus_ai_settings_v1`, `domus_ai_custom_prices`), OCR provider/endpoint/vision provider (`@domus:ocr_config` excluding `cloudVisionApiKey`), and Drive backup enabled preference + account email.
- **Strict exclusion of secrets, tokens, and consent:** API keys (`cloudVisionApiKey`, AI keys), OAuth/Drive tokens, token usage counters, PIN/biometrics (`domus_security_settings_v1`), telemetry/AI data consent (`AIDataPermissions`), tour/announcement flags, `deviceId`, sync cursors, and AI chat history must never enter `SETTING_CHANGED` events or travel over sync relays.
- **Sensitive preference exclusion:** Religious preference (`domus_is_catholic_v1`) is sensitive and must not be synced in this epic; it waits for strong group encryption.
- **Deterministic conflict resolution & propagation:** Conflicting preference updates across devices resolve deterministically to the latest event under total replay order `(timestamp, deviceId, id)`. Changes should propagate between paired devices within 15 seconds without blocking the UI (offline-first).
- **Backward and forward compatibility:** Devices on older app versions must ignore unknown `SETTING_CHANGED` keys or newer event schemas without crashing. On first launch after upgrading, if no preference event exists yet for a migrated setting, the device seeds the log with its current local value.
- **Special inventory notes:** Payslip (holerite) data is an event and must be classified as "vira evento" with a sensitivity note; AI data permissions must be classified as "não sincroniza (consentimento por aparelho)". Any unrouted event types (such as `PERSONALITY_EVENTS` or parser event enums) must be explicitly accounted for.

## Technical Decisions

- **Event Sourcing & Pure Core:** Preferences become facts in the event log via a `SETTING_CHANGED` event (carrying key, value, and `schemaVersion`) with a pure reducer in a `packages/*` module, routed in `replayAllEvents`. Packages must never import `react`, `react-native`, or `expo`, and reducers must remain pure (no `Date.now`, `Math.random`, or IO).
- **Envelope & Ordering:** Events use the standard envelope `{id, type, payload, timestamp, deviceId, signature}` with `generateId()` and idempotent insertion by `id`. Total replay order is `(timestamp, deviceId, id)` in both SQLite and in-memory replay.
- **Schema Evolution:** New required payload fields require `schemaVersion` and an upcaster/conversion in the reducer; new fields should be optional by default. Payload structure must not preclude a future `profileId`.
- **Single-Source Allowlist:** Allowed `SETTING_CHANGED` keys must live in a single canonical allowlist shared with the inventory so tests reject any attempt to emit events for disallowed device-local or secret keys, and adding a key forces an inventory update.
- **Platform Secret Boundaries:** Secrets remain in `expo-secure-store` on native and `webSecrets` (AES-GCM with non-extractable IndexedDB key) on web—never plaintext `AsyncStorage`, events, or `EXPO_PUBLIC_*` variables. Google Drive auth tokens are per-device and never synced.

## UX & Interaction Patterns

- **Drive connection prompt per device:** When the "backup do Drive ativo" preference is synced as enabled onto a device that is not logged in to Google Drive, the UI must display `"Conectar o Drive neste aparelho"`.
- **Per-device consent:** AI data permissions (`AIDataPermissions`) remain local so each device prompts the user for its own consent.
- **Language:** All user-facing UI text must be in Brazilian Portuguese (`pt-BR`) with full accents.

## Cross-Story Dependencies

- **Upstream (Robust Log):** Depends on resilient replay/quarantine for unknown event types or malformed payloads, deterministic `(timestamp, deviceId, id)` ordering, and `schemaVersion` support so preference events can be safely added and resolved across app versions.
- **Intra-Epic:** Story 9.1 establishes the data inventory; Story 9.2 creates `SETTING_CHANGED` and its reducer used by Stories 9.3–9.6; Story 9.7 locks down the allowlist by test against Story 9.1's inventory.
- **Downstream (Secrets & Sensitive Backup):** Religious preference (`domus_is_catholic_v1`), opt-in native API/OCR key sync, and full Drive backup scope depend on this epic's inventory and preference-sync foundation, but are deferred until strong sync encryption and auth/backup updates are in place.
