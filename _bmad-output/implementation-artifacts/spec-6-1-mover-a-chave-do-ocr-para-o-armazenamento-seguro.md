---
title: 'Story 6.1: Mover a chave do OCR para o armazenamento seguro'
type: 'feature'
created: '2026-11-12'
status: 'done'
baseline_revision: '721fe3995e9dce4dec9d020e5f84f89a34875400'
review_loop_iteration: 1
followup_review_recommended: false
context:
  - '_bmad-output/implementation-artifacts/epic-6-context.md'
warnings: []
deferred: []
---

<intent-contract>

## Intent

**Problem:** A chave da API de OCR (`cloudVisionApiKey`) é gravada em texto puro no `AsyncStorage` junto do JSON `@domus:ocr_config`, expondo credenciais de nuvem a backups não criptografados e inspeção indevida no sistema de arquivos local.

**Approach:** Extrair a chave `cloudVisionApiKey` para armazenamento seguro — `expo-secure-store` no ambiente nativo (Android Keystore / iOS Keychain) e `webSecrets` (AES-GCM) no ambiente Web — mantendo apenas os campos não sensíveis no `@domus:ocr_config` do `AsyncStorage`, com migração automática e transparente de chaves pré-existentes na primeira leitura.

## Boundaries & Constraints

**Always:**
- A chave `cloudVisionApiKey` deve ser persistida exclusivamente em `expo-secure-store` (nativo) ou `webSecrets` (web).
- O JSON `@domus:ocr_config` no `AsyncStorage` não deve conter a propriedade `cloudVisionApiKey`.
- Migração automática: se uma chave for encontrada no JSON de `AsyncStorage`, ela deve ser transferida para o armazenamento seguro e removida do `AsyncStorage` no primeiro `loadConfig()`, sem intervenção do usuário.
- O OCR na nuvem (`Cloud Vision`) deve continuar funcionando de forma idêntica antes e depois da migração (`getCloudVisionConfig` e `isCloudVisionConfigured`).
- Preservar retrocompatibilidade da interface pública do `OCRConfigService` para que `ocr-settings.tsx`, `useInvoiceScanner.ts`, `useOleriteScanner.ts` e `usePayslipScanner.ts` funcionem sem alterações de contrato.

**Never:**
- Nunca gravar a chave do Cloud Vision em texto puro no `AsyncStorage`.
- Nunca apagar ou descartar a chave do usuário se a migração falhar (manter consistência).
- Nunca alterar `packages/sync` nem arquivos de plataformas nativas (`android/`, `ios/`).
- Nunca usar alertas nativos do sistema operacional; usar `appAlert` se necessário.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Leitura sem chave prévia | `AsyncStorage` com `{ preferredProvider: "mlkit" }`; SecureStore vazio | Retorna config com `cloudVisionApiKey: undefined`; nenhum dado sensível gravado | Retorna default com segurança |
| Migração automática de chave legada | `AsyncStorage` com `{ preferredProvider: "cloudvision", cloudVisionApiKey: "AIzaSy..." }`; SecureStore vazio | Chave gravada no SecureStore/webSecrets; `AsyncStorage` regravado SEM `cloudVisionApiKey`; config retornado com `cloudVisionApiKey: "AIzaSy..."` | Se SecureStore falhar, não apaga do AsyncStorage antes de confirmar gravação |
| Leitura após migração | `AsyncStorage` com `{ preferredProvider: "cloudvision" }`; SecureStore com `"AIzaSy..."` | Retorna config com `cloudVisionApiKey: "AIzaSy..."`; `AsyncStorage` permanece intacto sem a chave | Leitura transparente |
| Gravação de nova chave | Usuário insere chave via `setCloudVisionApiKey("nova-chave")` | Chave gravada em SecureStore/webSecrets; `AsyncStorage` não contém a chave; config do OCR salvo | Lança exceção se armazenamento falhar |
| Limpeza da chave | Usuário limpa chave via `clearCloudVisionApiKey()` | Chave removida de SecureStore/webSecrets; propriedade removida de qualquer resíduo em `AsyncStorage` | Remoção idempotente |
| Plataforma Web | `Platform.OS === "web"` | Chave gravada e lida via `webSecrets` (AES-GCM); nunca grava texto puro em AsyncStorage | WebCrypto / IndexedDB vault |

</intent-contract>

## Code Map

- `src/services/ocrConfigService.ts`:
  - Constante de armazenamento seguro `OCR_API_KEY_SECURE_KEY = "domus_ocr_cloud_vision_api_key"`.
  - Helpers puros e assíncronos: `loadSecureApiKey()`, `saveSecureApiKey(key: string)`, `deleteSecureApiKey()`.
  - Método `loadConfig()`: lê `AsyncStorage`, detecta se `cloudVisionApiKey` está presente no JSON legado, executa a migração atômica para o armazenamento seguro, expurga a chave do `AsyncStorage`, lê a chave segura e retorna o objeto `OCRConfig` montado.
  - Método `saveConfig()`: assegura que se `cloudVisionApiKey` for passado, ele seja direcionado para o armazenamento seguro e sanitizado fora do JSON do `AsyncStorage`.
  - Métodos `setCloudVisionApiKey()` e `clearCloudVisionApiKey()`: atualizados para interagir com o armazenamento seguro.
- `src/services/__tests__/ocrConfigService.test.ts`:
  - Nova suíte de testes unitários cobrindo o fluxo completo de leitura, gravação, limpeza, migração automática e suporte a nativo e web.

## Tasks & Acceptance

**Execution:**
- `src/services/ocrConfigService.ts` -- Migrar persistência de `cloudVisionApiKey` para `expo-secure-store` / `webSecrets` com migração automática do `AsyncStorage` -- Elimina armazenamento em texto puro da chave de OCR (FR-23).
- `src/services/__tests__/ocrConfigService.test.ts` -- Implementar suíte de testes unitários para `OCRConfigService` -- Valida armazenamento seguro, migração de chave legada, integridade do `AsyncStorage` e compatibilidade web/nativo.

**Acceptance Criteria:**
- Given `cloudVisionApiKey` é gravada junto da configuração do OCR num JSON em `AsyncStorage` (`@domus:ocr_config`)
- When a chave passa a ser gravada em `expo-secure-store` (nativo) ou em `webSecrets` (web), e o resto da configuração fica onde está
- Then o JSON em `AsyncStorage` não contém mais a chave
- And quem já tem a chave salva tem o valor migrado sozinho na próxima abertura, sem perder o OCR
- And o OCR com serviço de nuvem continua funcionando depois da migração.

## Spec Change Log

*(Vazio - primeira versão da especificação)*

## Review Triage Log

- **Blind Hunter Review**:
  - *Mitigação de perda de chave em `saveConfig` parcial*: Se a migração automática falhou anteriormente por indisponibilidade transitória do SecureStore e `saveConfig` for chamado sem `cloudVisionApiKey`, tenta remigrar ou preserva a chave no `AsyncStorage` em vez de expurgá-la prematuramente.
  - *Retorno imutável de `DEFAULT_CONFIG`*: Em caso de erro na leitura do `AsyncStorage`, `loadConfig()` retorna uma cópia superficial `{ ...DEFAULT_CONFIG }` para impedir mutação global.
  - *Higienização com `trim()`*: `saveSecureApiKey` e `setCloudVisionApiKey` agora removem espaços em branco da chave; `isCloudVisionConfigured` e `getCloudVisionConfig` tratam strings com apenas espaços como vazias.
  - *Tratamento de exceções em ambiente Web*: `loadSecureApiKey` e `deleteSecureApiKey` envolvem chamadas a `webSecrets` em `try/catch` para capturar falhas em navegadores com IndexedDB desabilitado ou modo anônimo estrito.
- **Intent Alignment Auditor**:
  - Conformidade verificada com as diretrizes do Épico 6, FR-23 e NFR-1. Todas as chamadas dos módulos consumidores (`ocr-settings.tsx`, `useInvoiceScanner`, `useOleriteScanner`, `usePayslipScanner`) permanecem 100% compatíveis.
- **Edge Case Hunter**:
  - Análise sistemática de caminhos de execução concluída sem edge cases bloqueantes pendentes.
- **Verification Gap Reviewer**:
  - Zero lacunas de verificação encontradas; todos os critérios de aceitação foram cobertos por testes unitários dedicados.

## Auto Run Result

- **Iteração**: 1
- **Status**: Concluído com sucesso (`done`)
- **Vitest**: 24 testes unitários em `src/services/__tests__/ocrConfigService.test.ts` (100% aprovados) + 42 testes de detecção de alertas nativos em `src/services/__tests__/noNativeAlert.test.ts` (100% aprovados).
- **TypeScript (`tsc --noEmit`)**: 0 erros.
- **ESLint**: 0 erros, 0 avisos.

## Design Notes

Padrão de migração transparente em `loadConfig()`:
```ts
const json = await AsyncStorage.getItem(OCR_CONFIG_KEY);
let config = json ? JSON.parse(json) : { ...DEFAULT_CONFIG };

if (config.cloudVisionApiKey) {
  const legacyKey = config.cloudVisionApiKey;
  await saveSecureApiKey(legacyKey);
  delete config.cloudVisionApiKey;
  await AsyncStorage.setItem(OCR_CONFIG_KEY, JSON.stringify(config));
}

const secureKey = await loadSecureApiKey();
return {
  ...config,
  cloudVisionApiKey: secureKey ?? undefined,
};
```

Padrão multiplataforma (`isWeb`):
```ts
function isWeb(): boolean {
  return Platform.OS === "web";
}
// Nativo: SecureStore.getItemAsync / setItemAsync / deleteItemAsync
// Web: webSecrets.get / set / remove
```

## Verification

**Commands:**
- `rm -f expo-env.d.ts && npx vitest run src/services/__tests__/ocrConfigService.test.ts` -- expected: Todos os testes de migração e armazenamento seguro do OCR 100% aprovados.
- `rm -f expo-env.d.ts && npx tsc --noEmit` -- expected: 0 erros de tipo no TypeScript.
- `npx eslint src/services/ocrConfigService.ts src/services/__tests__/ocrConfigService.test.ts` -- expected: 0 erros e 0 avisos.
