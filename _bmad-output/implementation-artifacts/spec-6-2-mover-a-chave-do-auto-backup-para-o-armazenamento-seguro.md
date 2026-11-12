---
title: 'Story 6.2: Mover a chave do auto-backup para o armazenamento seguro'
type: 'feature'
created: '2026-11-12'
status: 'done'
baseline_revision: '68cbaee1a8fd41edcc94e7dd6082698b7da02252'
review_loop_iteration: 1
followup_review_recommended: false
context:
  - '_bmad-output/implementation-artifacts/epic-6-context.md'
warnings: []
deferred: []
---

<intent-contract>

## Intent

**Problem:** A chave gerada para o backup automático (`domus_auto_backup_device_key`), usada para criptografar cópias locais e sincronizadas com o Google Drive, é salva em texto puro no `AsyncStorage`, violando os requisitos de proteção de segredos (FR-23 e NFR-1).

**Approach:** Mover a persistência da chave de dispositivo para o armazenamento seguro — `expo-secure-store` no ambiente nativo (Android Keystore / iOS Keychain) e `webSecrets` (AES-GCM) no ambiente Web —, com migração automática e preservação estrita do valor idêntico da chave pré-existente no primeiro acesso (`getDeviceBackupKey` ou `getOrCreateDeviceBackupKey`), garantindo que backups gerados anteriormente continuem 100% restauráveis.

## Boundaries & Constraints

**Always:**
- A chave `domus_auto_backup_device_key` deve ser persistida exclusivamente em `expo-secure-store` (nativo) ou `webSecrets` (web).
- O valor da chave migrada deve ser rigorosamente idêntico ao valor pré-existente, sem qualquer alteração de caracteres ou formato (`XXXXXX-XXXXXX-XXXXXX-XXXXXX`).
- Em caso de existência de chave legada no `AsyncStorage`, migrar atômica e automaticamente para o armazenamento seguro e remover a chave do `AsyncStorage` somente após confirmação da persistência segura.
- Se a gravação no armazenamento seguro falhar durante a migração, a chave legada deve ser mantida temporariamente no `AsyncStorage` para não destruir a capacidade de restaurar backups do usuário.
- Se nenhuma chave existir, `getOrCreateDeviceBackupKey()` gera nova chave de 24 caracteres e a salva diretamente no armazenamento seguro, sem tocar o `AsyncStorage`.
- Preservar compatibilidade total de exportação das funções `getDeviceBackupKey`, `getOrCreateDeviceBackupKey` e `autoBackupFilePath` em `src/hooks/useAutoBackup.ts` para que `src/hooks/useBackupRestore.ts` e `app/backup.tsx` funcionem sem alterações.

**Never:**
- Nunca gravar nova chave do auto-backup em texto puro no `AsyncStorage`.
- Nunca redefinir ou alterar o valor de uma chave já existente, o que inutilizaria os arquivos de auto-backup (`domus-autobackup.domusbackup`).
- Nunca alterar `packages/sync` nem código nativo em `android/` ou `ios/`.
- Nunca usar alertas nativos (`Alert.alert`, `window.alert`); usar `appAlert` se necessário.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Leitura sem chave gerada | SecureStore e AsyncStorage vazios | `getDeviceBackupKey()` retorna `null` | Retorna `null` de forma limpa |
| Geração da primeira chave | `getOrCreateDeviceBackupKey()` chamado com armazenamento vazio | Gera chave de 24 caracteres (`XXXXXX-XXXXXX-XXXXXX-XXXXXX`), grava no SecureStore/webSecrets, retorna a chave | Lança erro se a gravação segura falhar; nunca cai para AsyncStorage |
| Migração automática de chave legada | `AsyncStorage` contém `domus_auto_backup_device_key: "K12345-..."`; SecureStore vazio | Chave gravada no SecureStore/webSecrets; removida do `AsyncStorage`; retorna `"K12345-..."` idêntica | Se SecureStore falhar, preserva chave no AsyncStorage e retorna o valor para não quebrar a restauração |
| Leitura após migração | SecureStore contém `"K12345-..."`; AsyncStorage vazio | `getDeviceBackupKey()` retorna `"K12345-..."`; AsyncStorage permanece intocado | Retorna o valor seguro |
| Plataforma Web | `isWeb() === true` | Chave lida/gravada via `webSecrets` (AES-GCM); nunca grava texto puro em AsyncStorage | Captura falhas e não crasha |
| Falha temporária do SecureStore na leitura | Leitura do SecureStore lança erro | Se houver chave legada em AsyncStorage, retorna como fallback; se não houver, retorna `null` | Loga o erro sem crashar |

</intent-contract>

## Code Map

- `src/modules/backup/infrastructure/deviceBackupKey.ts`:
  - Constante de armazenamento `DEVICE_KEY_STORAGE = "domus_auto_backup_device_key"`.
  - Helpers puros: `isWeb()`, `loadSecureDeviceKey()`, `saveSecureDeviceKey(key: string)`, `deleteSecureDeviceKey()`.
  - `generateDeviceBackupKey()`: gera a string alfanumérica de 24 caracteres (base32 custom sem ambiguidades).
  - `getDeviceBackupKey()`: lê do armazenamento seguro com migração automática transparente de chave legada no `AsyncStorage`.
  - `getOrCreateDeviceBackupKey()`: obtém a chave existente ou gera uma nova salvando diretamente no armazenamento seguro.
  - `clearDeviceBackupKey()`: limpeza segura idempotente.
- `src/hooks/useAutoBackup.ts`:
  - Re-exporta `getDeviceBackupKey`, `getOrCreateDeviceBackupKey`, `DEVICE_KEY_STORAGE` a partir de `deviceBackupKey.ts` mantendo 100% da interface consumida por `useBackupRestore.ts` e `app/backup.tsx`.
- `src/modules/backup/infrastructure/__tests__/deviceBackupKey.test.ts`:
  - Nova suíte de testes unitários abrangente cobrindo leitura, criação, migração automática, preservação de integridade de chave, isolamento multiplataforma (nativo e web) e resiliência contra falhas.

## Tasks & Acceptance

**Execution:**
- `src/modules/backup/infrastructure/deviceBackupKey.ts` -- Implementar infraestrutura de chave de backup de dispositivo com persistência em `expo-secure-store` e `webSecrets` com migração automática do `AsyncStorage` -- Atende FR-23 e NFR-1.
- `src/hooks/useAutoBackup.ts` -- Delegar gerenciamento de chave para `deviceBackupKey.ts` mantendo retrocompatibilidade das APIs exportadas.
- `src/modules/backup/infrastructure/__tests__/deviceBackupKey.test.ts` -- Implementar suíte de testes unitários validando migração e segurança.

**Acceptance Criteria:**
- Given `domus_auto_backup_device_key` fica em `AsyncStorage`
- When passo a gravá-la em `expo-secure-store` (nativo) ou `webSecrets` (web), com migração do valor atual
- Then o valor da chave é **o mesmo** antes e depois, então um backup automático já feito continua restaurável
- And a chave não aparece mais em `AsyncStorage`
- And um teste de migração confirma o valor preservado.

## Spec Change Log

*(Vazio - primeira versão da especificação)*

## Review Triage Log

- **Edge Case Hunter & Blind Hunter Review**:
  - *Preservação do Ciphertext em AsyncStorage na Web*: Na plataforma Web, `webSecrets` persiste o ciphertext cifrado por AES-GCM (prefixado com `v1:`) diretamente no `AsyncStorage`. As chamadas a `AsyncStorage.removeItem(DEVICE_KEY_STORAGE)` foram condicionadas a `!isWeb()`, evitando que o ciphertext recém-salvo fosse inadvertidamente purgado na web.
  - *Tratamento de Erros de Leitura no SecureStore*: `loadSecureDeviceKey()` e `getDeviceBackupKey()` agora diferenciam chave ausente de falha de hardware/keystore no nativo. Se o `SecureStore` lançar exceção na leitura e não houver chave legada, o erro é propagado, impedindo que `getOrCreateDeviceBackupKey()` gere uma nova chave e sobrescreva a chave pré-existente de backups do usuário.
  - *Proteção contra Condições de Corrida*: Implementada trava de promessa em voo (`inFlightPromise`) em `getOrCreateDeviceBackupKey()`, garantindo que invocações simultâneas durante a inicialização (ex.: hook de auto-backup em background e renderização da UI de backup) resolvam a mesma chave e evitem geração concorrente.
  - *Validação de Chave e Higienização*: `saveSecureDeviceKey()` valida que a chave não é vazia ou composta apenas de espaços antes de persistir.
  - *Uso Seguro de `crypto`*: Acesso seguro via `globalThis.crypto ?? crypto` para compatibilidade total com o polyfill em ambientes Hermes e JSC.
- **Verification Gap Reviewer**:
  - *Lacuna de Teste de Migração em `getOrCreateDeviceBackupKey`*: Identificada ausência de teste executando `getOrCreateDeviceBackupKey()` com chave legada presente no `AsyncStorage` e armazenamento seguro vazio. Adicionados testes dedicados (nativo e web) assegurando que a chave legada seja migrada integralmente sem gerar uma nova chave.
- **Intent Alignment Auditor**:
  - Validada a conformidade da extração de infraestrutura e da invariante de identidade de chave (`migrated_key === legacy_key`). Compatibilidade de contratos em `src/hooks/useAutoBackup.ts` preservada, incluindo a re-exportação de `clearDeviceBackupKey`.

## Auto Run Result

- **Iteração**: 1
- **Status**: Concluído com sucesso (`done`)
- **Vitest**: 21 testes unitários em `src/modules/backup/infrastructure/__tests__/deviceBackupKey.test.ts` (100% aprovados, 0 stderr) + 53 testes do subsistema de backup + 42 testes de detecção de alertas nativos.
- **TypeScript (`tsc --noEmit`)**: 0 erros.
- **ESLint**: 0 erros, 0 avisos.

## Design Notes

Padrão de migração transparente em `getDeviceBackupKey()`:
```ts
export async function getDeviceBackupKey(): Promise<string | null> {
  const secure = await loadSecureDeviceKey();
  if (secure) {
    // Se ainda houver resíduo em AsyncStorage, limpa defensivamente
    await AsyncStorage.removeItem(DEVICE_KEY_STORAGE).catch(() => {});
    return secure;
  }

  // Tenta migrar chave legada de AsyncStorage
  const legacy = await AsyncStorage.getItem(DEVICE_KEY_STORAGE);
  if (legacy) {
    try {
      await saveSecureDeviceKey(legacy);
      await AsyncStorage.removeItem(DEVICE_KEY_STORAGE);
    } catch (err) {
      console.error("[deviceBackupKey] Falha ao migrar chave legada para armazenamento seguro:", err);
      // Mantém no AsyncStorage para não perder a chave de restauração
    }
    return legacy;
  }

  return null;
}
```

## Verification

**Commands:**
- `rm -f expo-env.d.ts && npx vitest run src/modules/backup/infrastructure/__tests__/deviceBackupKey.test.ts` -- expected: Suíte de testes unitários 100% aprovada.
- `rm -f expo-env.d.ts && npx tsc --noEmit` -- expected: 0 erros no TypeScript.
- `npx eslint src/modules/backup/infrastructure/deviceBackupKey.ts src/hooks/useAutoBackup.ts src/modules/backup/infrastructure/__tests__/deviceBackupKey.test.ts` -- expected: 0 erros, 0 avisos.
- `rm -f expo-env.d.ts && npx vitest run src/services/__tests__/noNativeAlert.test.ts` -- expected: 42/42 aprovados.
