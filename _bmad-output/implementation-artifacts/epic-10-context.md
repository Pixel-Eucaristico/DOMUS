# Epic 10 Context: Segredos e backup em todos os aparelhos

<!-- Generated from planning artifacts. Regenerate with compile-epic-context if planning docs change. -->

## Goal

Bring sensitive preferences, opt-in API key sync, and full-scope Google Drive backup parity across devices. Religious preference syncs exclusively over the strong group, AI and OCR API keys sync encrypted only between opted-in native devices, and Drive backups restore complete state without ever storing plaintext secrets.

## Stories

- Story 10.1: Registrar a exceção do AD-6 e atualizar os textos
- Story 10.2: Sincronizar a preferência religiosa só pelo Grupo forte
- Story 10.3: Ativar o sync de chaves com opt-in explícito
- Story 10.4: Enviar as chaves cifradas ao Grupo forte
- Story 10.5: Receber as chaves em outro aparelho nativo
- Story 10.6: Desligar o sync de chaves
- Story 10.7: Backup do Drive com o mesmo escopo, sem chave em texto puro

## Requirements & Constraints

- **Religious preference isolation:** `domus_is_catholic_v1` is sensitive data; sync it as `SETTING_CHANGED` exclusively over the strong group, never over the legacy group (even during coexistence), and keep it local-only when no strong group is active.
- **Native-only opt-in key sync:** AI and OCR API keys sync only between native devices, over the strong group, with explicit per-device opt-in (default off, never synced). Web browsers must never show the opt-in, publish keys, decrypt keys, or store synced keys.
- **Zero plaintext secrets:** Key-sync payloads must use authenticated encryption with a key derived (with a dedicated label) from the strong group secret. SQLite, Drive backup files, and Nostr relays must never contain plaintext API keys.
- **Tamper & opt-out safety:** Invalid or tampered key payloads must be rejected without overwriting existing `SecureStore` keys. Disabling key sync stops both publishing and receiving while preserving keys already in `SecureStore`.
- **Drive backup parity:** Restoring a Drive backup on a new device must reproduce the same state (expenses, wishlist, trophies, and syncable preferences) without plaintext API keys; keys only return if the strong group and opt-in are active on that device.
- **Out of scope:** AI chat history never syncs.
- **Governance before code:** Update the architecture rule exception, data inventory, privacy policy, and store Data Safety disclosures before implementing key sync.

## Technical Decisions

- **Event-sourced state:** All state mutations go through the append-only event log and pure replay reducers; preference conflicts resolve by total event order (`timestamp`, `deviceId`, `id`).
- **Secret storage:** API keys and group secrets live exclusively in `expo-secure-store` on native (and `webSecrets` on web), never in `AsyncStorage` or `EXPO_PUBLIC_*` variables.
- **Strong group cryptography:** Strong groups use a cryptographic secret (>=128 bits, paired via QR/paste) and authenticated encryption (e.g., AES-GCM with a 256-bit derived key). Key-sync events derive a separate key with its own label and never route to the legacy group.
- **UI & alerts:** All UI copy must be in pt-BR with complete accents; use `appAlert`/`appConfirm` instead of native `Alert.alert` or browser dialogs.

## UX & Interaction Patterns

- **Opt-in toggle:** Show the key-sync option ("Sincronizar minhas chaves de IA e OCR entre meus aparelhos") only on native devices with an active strong group, explaining in pt-BR that keys travel encrypted over public relays and already-published events cannot be deleted from relays.
- **Opt-out warning:** When disabling key sync, inform the user that previously published encrypted events remain on relays and that invalidating them requires rotating the key with the provider.

## Cross-Story Dependencies

- **Upstream epics:** Requires strong group and authenticated encryption (Epic 4), reliable/echo-free sync (Epic 5), secure on-device secret storage (Epic 6), and preference-as-event infrastructure and storage inventory (Epic 9).
- **Internal ordering:** Architecture/policy exception (10.1) precedes implementation; opt-in state and UI (10.3) gate encrypted key publishing (10.4), native receiving (10.5), and opt-out (10.6); Drive backup scope (10.7) builds on Epic 9 preferences and Stories 10.3–10.5.
