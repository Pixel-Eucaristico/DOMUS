---
title: 'Story 12.3: Proteger o PIN com salt criptográfico e derivação lenta'
type: 'bugfix'
created: '2026-10-16'
status: 'done'
baseline_commit: '4c7188ad01f364e1158ba9757396bc467f0de6bf'
route: 'oneshot'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-12-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** `PinAuthService` (`src/modules/security/application/PinAuthService.ts`) gera o salt com `Math.random` e guarda `SHA-256(pin:salt:domus_v1)`, um hash rápido: um PIN de 4 a 6 dígitos sai por força bruta em instantes por quem ler o armazenamento (D8).

**Approach:** Salt de 16 bytes de `expo-crypto.getRandomBytes` e hash PBKDF2-SHA256 (`@noble/hashes`, já usado no backup) com 30 mil iterações, gravado com prefixo de versão `pbkdf2-sha256$30000$<hex>`. `verifyPin` aceita o formato antigo (sem prefixo) e, no desbloqueio certo, regrava o PIN no formato novo com salt novo, sem pedir de novo. Testes cobrem o formato novo, a migração e o PIN errado nos dois formatos.

</frozen-after-approval>

## Implementation Notes

- `PinAuthService.ts`: salt de `Crypto.getRandomBytes(16)`; `hashPin` = PBKDF2-SHA256 (`@noble/hashes`, `pbkdf2Async`) com 30 mil iterações, formato `pbkdf2-sha256$<iterações>$<hex>`; `hashPinLegacy` mantém o SHA-256 antigo só para migrar.
- `verifyPin` lê as iterações gravadas no hash, regrava com salt novo quando o formato é antigo ou as iterações mudaram, e trata formato desconhecido como PIN errado. Contadores de tentativa zeram no sucesso, inclusive na migração.
- 30 mil iterações: escolha de equilíbrio entre força bruta e tempo de desbloqueio; o backup usa 100 mil sem interação por tecla. Medição em aparelho fica no D15.
- Testes: mock do `expo-crypto` com o `crypto` do Node (SHA-256 real e bytes aleatórios reais); vetores de referência para PBKDF2 e para o formato antigo; migração, iterações gravadas, formato desconhecido e PIN errado.
- Política (três textos): PIN em PBKDF2-SHA256 com 30 mil iterações e migração no próximo desbloqueio por PIN.
- `npx vitest run src/modules/security`: 34 passaram; `npx tsc --noEmit`: 0 erros; `eslint`: limpo.

## Review Triage Log

| Achado | Veredito | Evidência |
|---|---|---|
| Mudar `PIN_PBKDF2_ITERATIONS` trancaria todos os PINs salvos | medium | `verifyPin` recalculava com a constante atual. **patch**: lê as iterações do hash, regrava se mudaram, formato desconhecido não confere. |
| Sem vetor conhecido do PBKDF2 e mock do SHA-256 legado falso | medium | O mock era um hash de brinquedo. **patch**: `pbkdf2Sync`/`createHash` do Node como referência. |
| Política diz que o PIN "é guardado" em PBKDF2, mas os antigos só migram ao desbloquear | low | **patch** no texto dos três arquivos. |
| Teste de migração não confere zeragem das tentativas | low | **patch**: começa com tentativas e bloqueio vencido e confere a zeragem. |
| Velocidade no aparelho não medida e sem indicador de espera | maybe-false | Seria medium se o desbloqueio travar perceptivelmente em aparelho fraco; medir em Android real (Story 1.3). **defer** (D15). |
| Data da política não mudou | false | Continua "outubro de 2026", correto. |
| Linhas longas nos textos | low | Cosmético. rejeitado |
| Comparação sem tempo constante | low | Checagem local, com limite de tentativas e bloqueio. rejeitado |
| Spec incompleta / status | false | Preenchidos na finalização do oneshot. |

