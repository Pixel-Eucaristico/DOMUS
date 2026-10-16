---
title: 'Story 1.5: Alinhar o formulário Data safety ao comportamento'
type: 'chore'
created: '2026-10-16'
status: 'in-progress'
baseline_commit: 'c6208c854d4ab0b4115680acc13b2b9fe602f140'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-1-context.md'
  - '{project-root}/docs/politica-de-privacidade.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** O Play Console exige o formulário *Data safety* igual ao comportamento do app (FR-5). Não existe um levantamento: o `PLAY_STORE_LISTING.md` só tem uma tabela de permissões incompleta (sem `RECORD_AUDIO`, `MODIFY_AUDIO_SETTINGS`, `POST_NOTIFICATIONS`; a linha INTERNET ainda diz "Sincronização P2P"), o adiado D13.

**Approach:** Criar `docs/data-safety.md` como folha de respostas do formulário: cada fluxo que sai do aparelho, com tipo de dado no vocabulário do Play, destino, se é opcional e como o usuário ativa, se vai cifrado em trânsito e o que acontece na exclusão, coerente com `docs/politica-de-privacidade.md`. Corrigir a tabela de permissões do `PLAY_STORE_LISTING.md` (D13) e apontar para o novo arquivo. Preencher o Play Console é do dono (Story 1.6).

## Boundaries & Constraints

**Always:** cada linha tem evidência no código ou na política; o comportamento descrito é o da `dev` atual (com as Stories 12.1 a 12.3 já entregues); pt-BR com acentos; os termos de tipo de dado seguem as categorias do Play (ex.: "Informações financeiras", "Fotos", "Gravações de voz ou som", "IDs do dispositivo ou outros IDs", "Registros de falhas", "Diagnóstico", "Endereço de e-mail").

**Never:** mudar código ou comportamento; mudar a política (se algo divergir, registrar como achado); declarar dado que o app não envia; preencher o Play Console.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Fluxo opt-in | IA, voz, Cloud Vision, sync, Drive, Firebase, anúncios | Linha com "Opcional: sim" e onde ativar | N/A |
| Fluxo sem flag | consultas de código de barras, NCM, preços, ícones, SEFAZ | Linha com "Opcional: não" e nota de que a flag vem na Story 12.6 | N/A |
| Divergência com a política | Fluxo na lista e ausente na política (ou o contrário) | Registrado em Implementation Notes; política não muda nesta story | N/A |

**Decisão do dono (16/10/2026):** à pergunta do Play sobre pedido de exclusão de dados, responder **"Não"**: o desenvolvedor não guarda dados em servidor e não consegue apagar os de terceiros; a política explica o reset local e o que não é apagado.

</frozen-after-approval>

## Code Map

- `docs/politica-de-privacidade.md` -- fonte dos fluxos (§2 sync, §3 IA e voz, §4 fotos e SEFAZ, §5 backup e Drive, §6 Firebase e AdMob, §7 consultas); a lista tem de bater com ela
- `app.json` -- `android.permissions`: CAMERA, READ/WRITE_EXTERNAL_STORAGE, USE_BIOMETRIC, USE_FINGERPRINT, RECORD_AUDIO, MODIFY_AUDIO_SETTINGS, POST_NOTIFICATIONS; `blockedPermissions`: RECEIVE_BOOT_COMPLETED; plugin do AdMob (ID de publicidade)
- `PLAY_STORE_LISTING.md` -- seção "Permissões justificadas (Data Safety)": tabela a corrigir (D13) e apontar para `docs/data-safety.md`
- Evidências de cada fluxo: ver o Code Map de `spec-1-4-corrigir-loja-e-politica-de-privacidade.md`; mudanças depois dela: o código do grupo não vai mais à IA (12.1), PIN em PBKDF2 (12.3)
- Cifra em trânsito: HTTPS para todos os provedores e `wss://` para os relays (`src/modules/nostrSync.ts:8-15`); os eventos do sync também vão cifrados com a chave do grupo (fraca, declarar)
- Identificadores: `deviceId` do app vai em claro nos relays (`nostrSync.ts:415,422-424`); AdMob usa o ID de publicidade quando há modo de apoio com anúncio

## Tasks & Acceptance

**Execution:**
- [ ] `docs/data-safety.md` -- criar: (1) resumo das respostas gerais do formulário (coleta, compartilhamento, cifra em trânsito, exclusão); (2) tabela por fluxo: destino, tipos de dado do Play, finalidade, opcional e como ativar, coletado/compartilhado; (3) tabela de permissões do Android com justificativa -- FR-5
- [ ] `PLAY_STORE_LISTING.md` -- substituir a tabela de permissões pela versão completa (D13), igual à de `docs/data-safety.md`, e apontar para o arquivo -- D13
- [ ] `_bmad-output/implementation-artifacts/deferred-work.md` -- marcar o D13 como resolvido por esta story -- rastreio

**Acceptance Criteria:**
- Given `docs/data-safety.md`, when o leio, then há uma linha para relays Nostr, Google Drive, provedores de IA (texto e voz), OCR de terceiros (Cloud Vision), Firebase (Analytics, Crashlytics, Performance), AdMob e as consultas sem flag, cada uma com o dado enviado e o consentimento
- Given o fluxo de IA e OCR, when o leio, then ele cita que fotos de nota fiscal e holerite vão ao provedor escolhido
- Given a lista e `docs/politica-de-privacidade.md`, when os comparo, then nenhum fluxo está em um e falta no outro
- Given a tabela de permissões, when a comparo com `app.json`, then todas as permissões declaradas aparecem com justificativa e nenhuma sobra

## Implementation Notes

## Spec Change Log

## Review Triage Log

## Verification

**Manual checks (if no CLI):**
- Comparar cada `android.permission.*` de `app.json` com a tabela de permissões dos dois arquivos
- Comparar cada seção de `docs/politica-de-privacidade.md` com as linhas de fluxo de `docs/data-safety.md`
