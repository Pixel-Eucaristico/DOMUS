---
title: 'Story 5.9: Pedir confirmação antes de apagar por causa de um marcador'
type: 'feature'
created: '2026-11-11'
status: 'done'
baseline_revision: '4064db0feec25dc0b16d61c8bbfc37ef8e164633'
review_loop_iteration: 1
followup_review_recommended: false
context:
  - '_bmad-output/implementation-artifacts/epic-5-context.md'
  - '_bmad-output/implementation-artifacts/spec-5-8-publicar-o-marcador-de-reset-e-de-restauracao.md'
warnings: []
deferred: []
---

<intent-contract>

## Intent

**Problem:** Quando um aparelho pareado em um Grupo forte recebe um marcador remoto de reset ou restauração (`SYNC_RESET_RECORDED`), apagar automaticamente os dados locais sem ciência ou consentimento do usuário acarretaria perda irreversível de dados locais não autorizada, caso outro aparelho tenha sido resetado acidentalmente ou por outro participante do grupo.

**Approach:** Implementar um mecanismo de proteção e decisão explícita via `appConfirm` (diálogo customizado do DOMUS em pt-BR com acentos completos) que intercepta marcadores remotos recebidos do Grupo forte: quando um marcador remoto inédito é detectado, o app solicita confirmação em pt-BR explicando claramente o que será apagado. Se o usuário confirma, os dados locais são expurgados e o marcador registrado; se recusa, nada é apagado e o app não pergunta novamente para aquele marcador, perguntando apenas se um novo marcador chegar no futuro. O aparelho jamais apaga dados sem a resposta do usuário.

## Boundaries & Constraints

**Always:**
- Um aparelho que recebe um marcador de reset ou restauração de outro aparelho do Grupo forte deve solicitar confirmação explícita do usuário antes de expurgar qualquer dado local.
- O diálogo confirmatório deve estar em português do Brasil (pt-BR) com acentuação correta e explicar o que será apagado.
- Utilizar exclusivamente o serviço `appConfirm` de `src/services/appAlert.ts`. Nunca invocar o `Alert.alert` nativo do sistema operacional.
- O aparelho jamais apaga qualquer dado local sem a resposta do usuário.
- Se o usuário confirma (`true`), os dados locais são apagados e o marcador é registrado como aceito, evitando ressurreição em pulls futuros.
- Se o usuário recusa (`false`), nenhum dado é apagado e o app registra o marcador como dispensado, não perguntando novamente para aquele mesmo marcador.
- Chegando um novo marcador (identificador diferente), o app pergunta novamente.
- Marcadores do próprio aparelho (`deviceId === currentDeviceId`) ou do canal legado (`isStrong: false`) jamais acionam diálogo de exclusão remota nem apagam dados.

**Never:**
- Nunca apagar ou descartar dados locais automaticamente ao receber um marcador remoto sem a confirmação positiva do usuário.
- Nunca reabrir o diálogo de confirmação repetidamente para o mesmo ID de marcador após o usuário ter recusado.
- Nunca emitir `Alert.alert` nativo; utilizar exclusivamente `appAlert`/`appConfirm`.
- Nunca alterar `packages/sync` (WebRTC legado congelado).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Marcador remoto com confirmação do usuário | Aparelho B recebe marcador de Aparelho A; usuário responde "Sim/Apagar" no `appConfirm` | Dados locais de B são apagados; marcador registrado; pull subsequente não ressuscita dados antigos | Operação concluída com sucesso |
| Marcador remoto com recusa do usuário | Aparelho B recebe marcador de Aparelho A; usuário responde "Não/Manter" no `appConfirm` | Nenhum dado local de B é apagado; marcador registrado como recusado; pulls subsequentes não perguntam de novo | Dados preservados integralmente |
| Chegada de um segundo marcador diferente | Aparelho B recusou marcador 1; Aparelho A emite marcador 2 | App exibe nova confirmação referente ao marcador 2 | Controle por ID de marcador |
| Marcador pendente de resposta do usuário | Marcador remoto chega; diálogo está aberto na tela aguardando resposta | Nenhum dado é apagado enquanto a Promise de confirmação não for resolvida | Bloqueio preventivo |
| Marcador do próprio aparelho | Aparelho A recebe seu próprio marcador emitido anteriormente | Ignorado silenciosamente; nenhuma confirmação exibida; nenhum dado apagado | Filtro por `deviceId` |
| Marcador do Grupo legado | Aparelho recebe marcador via canal antigo (`isStrong: false`) | Rejeitado de imediato; nenhum diálogo exibido; nenhum dado apagado | Rejeição segura |

</intent-contract>

## Code Map

- `src/modules/syncDecisions.ts`:
  - `shouldPromptForRemoteResetMarker(params: { marker: ResetMarkerPayload | SyncEvent; currentDeviceId: string | null; isStrong: boolean; handledMarkerIds: ReadonlySet<string> }): boolean`
  - `formatResetMarkerPromptMessage(marker: ResetMarkerPayload): { title: string; message: string; confirmLabel: string; cancelLabel: string }`
  - Constantes de mensagens em pt-BR padronizadas.
- `src/modules/testing/simulatedDevice.ts`:
  - Suporte a manipulador assíncrono de confirmação `promptResetConfirmation?: (marker: ResetMarkerPayload) => Promise<boolean>`.
  - Conjunto `handledRemoteMarkerIds` para rastreamento de marcadores confirmados ou recusados.
  - No `pull()` e na ingestão ao vivo: detecção de marcadores remotos do Grupo forte, execução de `shouldPromptForRemoteResetMarker`, invocação de confirmação, e apagamento condicional estrito conforme a resposta.
- `src/context/useSyncEngine.ts`:
  - Fiação do tratamento de marcadores remotos do Grupo forte em `processIncomingEvents` / `coordinator`, invocando `appConfirm` e `resetApp` caso confirmado.
- `src/modules/__tests__/threeDeviceSyncSimulation.test.ts`:
  - Suíte completa de testes da Story 5.9 cobrindo todos os cenários da matriz de I/O.
- `src/context/__tests__/syncCoexistence.test.ts`:
  - Verificação do contrato estático e comportamental de `shouldPromptForRemoteResetMarker` e mensagens em pt-BR.

## Tasks & Acceptance

**Execution:**
- `src/modules/syncDecisions.ts` -- Implementar funções puras de decisão e formatação de texto para confirmação de marcador remoto -- Centraliza regras determinísticas de prompt e mensagens em pt-BR.
- `src/modules/testing/simulatedDevice.ts` -- Adicionar suporte a prompt de confirmação de marcadores remotos com apagamento condicional -- Permite simulação determinística do comportamento de aceitação e recusa.
- `src/context/useSyncEngine.ts` -- Conectar detecção de marcadores remotos ao `appConfirm` e ao fluxo de reset -- Garante proteção em tempo de execução na aplicação.
- `src/modules/__tests__/threeDeviceSyncSimulation.test.ts` -- Implementar suíte completa de testes da Story 5.9 -- Valida confirmação positiva, recusa, segundo marcador, espera de resposta e marcador legado/próprio.
- `src/context/__tests__/syncCoexistence.test.ts` -- Testar contrato e decisões de confirmação de marcadores -- Garante conformidade estática.

**Acceptance Criteria:**
- Given um aparelho recebe um marcador de reset de outro aparelho do grupo
- When o app mostra uma confirmação em pt-BR explicando o que será apagado
- Then se eu confirmo, os dados locais são apagados e o marcador é registrado
- And se eu recuso, nada é apagado e o app pergunta de novo só se chegar outro marcador
- And o aparelho não apaga nada sem a minha resposta.

## Spec Change Log

*(Vazio - primeira versão da especificação)*

## Review Triage Log

- **Identidade Canônica do Marcador (Blind Hunter)**: Um envelope de marcador de reset remoto pode possuir um `id` arbitrário ou gerado externamente, porém sua identidade lógica é governada pelo conteúdo de payload (`marker-${action}-${deviceId}-${timestamp}`). A função `getResetMarkerId` foi ajustada para extrair e priorizar sempre a identidade canônica sintética a partir dos campos do payload, assegurando que verificações com o envelope ou payload cru usem IDs coincidentes e previnam prompts duplicados.
- **Reset do Cursor do Coordinator (Edge Case Hunter)**: Ao confirmar a limpeza por marcador remoto, apenas invocar `resetApp()` deixava o cursor do `SyncCoordinator` com o valor antigo, omitindo eventos históricos anteriores ao cursor se um backup remoto fosse restaurado. Foi adicionado `await coordinatorRef.current.reset()` após `resetApp()`.
- **Serialização de Batches em Live Sync (Edge Case Hunter)**: Em subscrições WebSocket em tempo real, lotes mistos contendo marcadores e eventos de domínio despachavam o prompt de forma assíncrona enquanto enfileiravam os eventos imediatamente. O fluxo foi ajustado para aguardar a resolução da confirmação do marcador (`await handleRemoteMarkerRef.current(marker)`) antes de submeter eventos adicionais do lote.
- **Momento da Persistência de Marcadores Tratados (Verification Gap)**: IDs de marcadores tratados só devem ser gravados no `AsyncStorage` após a conclusão efetiva do diálogo `appConfirm`, evitando que demissões acidentais ou cancelamento por encerramento prematuro do app suprimam silenciosamente marcadores não avaliados.
- **Alinhamento com Intent / pt-BR (Intent Alignment Auditor)**: Verificado cumprimento estrito de textos em pt-BR com acentos completos, uso exclusivo de `appConfirm` (sem `Alert.alert` nativo), preservação irrestrita de dados locais em caso de recusa, e bloqueio de apagamento enquanto pendente. Todos os critérios foram atendidos e cobertos por testes unitários e de integração.

## Design Notes

Decisão pura de prompt:
```ts
export function shouldPromptForRemoteResetMarker(params: {
  marker: ResetMarkerPayload | SyncEvent;
  currentDeviceId: string | null;
  isStrong?: boolean;
  handledMarkerIds: ReadonlySet<string>;
}): boolean
```

Formatação de mensagens em pt-BR:
```ts
export function formatResetMarkerPrompt(payload: ResetMarkerPayload): AppConfirmParams {
  const isRestore = payload.action === "restore";
  return {
    title: isRestore ? "Restauração solicitada no grupo" : "Redefinição solicitada no grupo",
    message: isRestore
      ? "Outro aparelho do grupo restaurou um backup. Deseja apagar os dados locais para sincronizar com a restauração?"
      : "Outro aparelho do grupo redefiniu os dados. Deseja apagar os dados locais deste aparelho?",
    confirmLabel: "Apagar dados",
    cancelLabel: "Manter dados",
    destructive: true,
  };
}
```

## Verification

**Commands:**
- `rm -f expo-env.d.ts && npx vitest run src/modules/__tests__/threeDeviceSyncSimulation.test.ts src/context/__tests__/syncCoexistence.test.ts` -- expected: Suíte da Story 5.9 e regressões 100% aprovados.
- `rm -f expo-env.d.ts && npx tsc --noEmit` -- expected: 0 erros de tipo no TypeScript.
- `npx eslint src/modules/syncDecisions.ts src/modules/testing/simulatedDevice.ts src/context/useSyncEngine.ts src/modules/__tests__/threeDeviceSyncSimulation.test.ts src/context/__tests__/syncCoexistence.test.ts` -- expected: 0 erros e 0 avisos.

## Auto Run Result

### Summary of implemented change
- `src/modules/syncDecisions.ts`:
  - Implementada função pura `shouldPromptForRemoteResetMarker({ marker, currentDeviceId, isStrong, handledMarkerIds })` com validação de canal forte (`isStrong !== false`), filtro de marcador próprio (`deviceId !== currentDeviceId`), checagem em `handledMarkerIds` (por ID explícito e sintético) e validação de `action` ("reset" | "restore").
  - Implementada função pura `formatResetMarkerPrompt(payload)` e alias `formatResetMarkerPromptMessage` gerando mensagens em pt-BR com acentos completos e parâmetros `AppConfirmParams` (`confirmLabel: "Apagar dados"`, `cancelLabel: "Manter dados"`, `destructive: true`).
  - Implementada função pura `getResetMarkerId(marker)` para extração determinística do identificador de marcadores em envelopes `SyncEvent` ou objetos `ResetMarkerPayload`.
- `src/modules/testing/simulatedDevice.ts`:
  - Adicionado suporte a `promptResetConfirmation?: (marker: ResetMarkerPayload) => Promise<boolean>` em `CreateSimulatedDeviceOptions` e `SimulatedSyncDevice`.
  - Adicionado rastreador `handledRemoteMarkerIds: Set<string>` e métodos `setPromptResetConfirmation` / `getHandledRemoteMarkerIds`.
  - Implementado `handleRemoteMarker(marker: SyncEvent)`: intercepta marcadores remotos, avalia elegibilidade com `shouldPromptForRemoteResetMarker`, invoca o manipulador assíncrono de confirmação, e só expurga os dados locais (`clearAllEvents()`) e registra o marcador em `knownMarkers` caso o usuário responda `true`. Em caso de recusa (`false`), nenhum dado é apagado e o marcador é assinalado como dispensado em `handledRemoteMarkerIds`.
  - Atualizados `pull()` e `drainOnce()` (live sync) para processar marcadores sob o mutex de importação antes dos eventos de domínio.
- `src/context/useSyncEngine.ts`:
  - Conectada a interceptação de marcadores remotos em `coordinator.pull` e nas subscrições ao vivo para o Grupo forte.
  - Invocação de `appConfirm(formatResetMarkerPrompt(payload))` e acionamento de `resetApp()` exclusivamente sob resposta afirmativa.
  - Persistência assíncrona de marcadores já tratados via `@domus:handled_remote_markers` no `AsyncStorage`.
- `src/context/SyncProvider.tsx`:
  - Propagado `resetApp` do `useAppState()` para `useSyncEngine`.
- `src/modules/__tests__/threeDeviceSyncSimulation.test.ts`:
  - Implementada suíte completa da Story 5.9 com 8 cenários determinísticos cobrindo:
    1. Confirmação positiva do usuário (apaga dados locais, registra marcador como aceito, pulls seguintes não ressuscitam dados).
    2. Recusa do usuário (dados preservados integralmente, marcador registrado como dispensado, pulls seguintes não perguntam novamente).
    3. Chegada de um segundo marcador diferente (após recusar o 1º, novo marcador aciona nova confirmação com sucesso).
    4. Marcador pendente de confirmação (bloqueio preventivo: nenhum dado apagado enquanto a Promise não resolver).
    5. Marcador do próprio aparelho (ignorado silenciosamente, diálogo de exclusão jamais exibido).
    6. Marcador do canal legado (rejeitado de imediato, diálogo jamais exibido, nenhum dado apagado).
    7. Subscrição ao vivo com confirmação (recebimento em tempo real solicita confirmação e apaga dados).
    8. Subscrição ao vivo com recusa (recebimento em tempo real solicita confirmação e preserva dados).
- `src/context/__tests__/syncCoexistence.test.ts`:
  - Adicionados 8 testes de contrato estático e comportamental validando `shouldPromptForRemoteResetMarker`, formatação em pt-BR com acentos completos e fiação do `appConfirm` em `useSyncEngine`.

### Files changed
- `src/modules/syncDecisions.ts`: Funções puras de prompt, formatação pt-BR e identificação de marcadores.
- `src/modules/testing/simulatedDevice.ts`: Fiação de confirmação assíncrona, rastreamento de marcadores tratados e apagamento condicional.
- `src/context/useSyncEngine.ts`: Integração com `appConfirm`, `resetApp` e persistência de marcadores tratados.
- `src/context/SyncProvider.tsx`: Passagem do `resetApp` para o motor de sincronização.
- `src/modules/__tests__/threeDeviceSyncSimulation.test.ts`: 8 testes cobrindo a matriz completa da Story 5.9.
- `src/context/__tests__/syncCoexistence.test.ts`: 8 testes de contrato e regras puras.
- `_bmad-output/implementation-artifacts/sprint-status.yaml`: Atualização de status da Story 5.9 e Epic 5 para `done`.
- `_bmad-output/implementation-artifacts/spec-5-9-pedir-confirmacao-antes-de-apagar-por-causa-de-um-marcador.md`: Status atualizado para `done` e relatório de execução.

### Verification performed
- `rm -f expo-env.d.ts && npx vitest run src/modules/__tests__/threeDeviceSyncSimulation.test.ts src/context/__tests__/syncCoexistence.test.ts`: 129/129 testes aprovados (100% verde).
- `rm -f expo-env.d.ts && npx tsc --noEmit`: 0 erros de tipo no TypeScript.
- `npx eslint src/modules/syncDecisions.ts src/modules/testing/simulatedDevice.ts src/context/useSyncEngine.ts src/context/SyncProvider.tsx src/modules/__tests__/threeDeviceSyncSimulation.test.ts src/context/__tests__/syncCoexistence.test.ts`: 0 erros e 0 avisos.
- `rm -f expo-env.d.ts && npx vitest run`: Suíte de regressão completa aprovada com 115 arquivos e 2.754 testes verdes.

### Residual risks
- Nenhum risco residual identificado. O mecanismo de interceptação de marcadores remotos impede qualquer exclusão automática de dados locais sem o consentimento afirmativo do usuário via `appConfirm`, enquanto recusas são gravadas para evitar prompts repetitivos para o mesmo marcador.
