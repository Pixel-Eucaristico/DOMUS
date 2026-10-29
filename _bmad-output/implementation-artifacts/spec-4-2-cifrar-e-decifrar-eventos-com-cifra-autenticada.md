---
title: 'Story 4.2: Cifrar e decifrar eventos com cifra autenticada'
type: 'feature'
created: '2026-10-29'
status: 'in-progress'
baseline_commit: '5456447'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/planning-artifacts/epics.md'
  - '{project-root}/_bmad-output/planning-artifacts/prds/prd-DOMUS-2026-10-15/prd.md'
  - '{project-root}/_bmad-output/planning-artifacts/prds/prd-DOMUS-2026-10-15/addendum.md'
  - '{project-root}/_bmad-output/planning-artifacts/architecture/architecture-DOMUS-2026-10-15/ARCHITECTURE-SPINE.md'
  - '{project-root}/_bmad-output/implementation-artifacts/spec-4-1-gerar-o-segredo-de-grupo-forte-e-derivar-as-chaves.md'
  - '{project-root}/_bmad-output/implementation-artifacts/revisao-party-29-10.md'
  - '{project-root}/_bmad-output/implementation-artifacts/deferred-work.md'
  - '{project-root}/src/modules/strongGroup/groupSecret.ts'
  - '{project-root}/AGENTS.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** O Grupo antigo cifra cada lote com `encryptPayload` (`src/modules/nostrSync.ts`): XOR com `SHA-256(chave ‖ nonce)` repetido a cada 32 bytes, formato `hex(nonce):hex(cifra)`. Não há autenticação: quem vê os relays pode trocar bytes do texto cifrado e o aparelho decifra lixo ou um lote alterado sem perceber, e o keystream repetido vaza o texto por análise de frequência. A Story 4.1 entregou a `encryptionKey` de 256 bits do Grupo forte (`deriveStrongGroupKeys`), mas ainda não existe função que a use. O FR-12 pede cifra autenticada, e o dono já escolheu AES-GCM (D-3 da 4.1).

**Approach:** Um módulo puro novo, `src/modules/strongGroup/eventCipher.ts`, sem `react-native` nem `expo`, com duas funções síncronas: `encryptStrongPayload` cifra um texto (o JSON de um lote de envelopes, como hoje) com AES-256-GCM do `@noble/ciphers` (o Hermes não tem `crypto.subtle`), nonce aleatório de 96 bits, e devolve um texto com marcador de formato próprio e versionado (`domus-gcm-v1.`), que não se confunde com o `hex:hex` do XOR; `decryptStrongPayload` devolve o texto original ou um motivo fixo de recusa, sem nunca devolver dado de um texto adulterado. O dado associado (AAD) liga o texto cifrado ao marcador e à chave pública do Grupo forte, para um lote não ser movido de um grupo para outro. Sem relay, sem publicação, sem leitura, sem UI: isso é da Story 4.5. O código do Grupo antigo não muda.

## Boundaries & Constraints

**Always:**
- AES-256-GCM pelo `gcm` de `@noble/ciphers/aes.js` (2.1.1, já instalado e usado pelo `BackupCryptoService`). Chave de 32 bytes (`StrongGroupKeys.encryptionKey`); nonce de 12 bytes; tag de 16 bytes.
- Nonce novo a cada cifragem, de `globalThis.crypto.getRandomValues` (via `randomBytes` do `@noble/ciphers/utils.js`, ou o gerador injetado nos testes). Sem gerador, `encryptStrongPayload` **lança erro**; nunca cai para `Math.random`.
- Uma instância de `gcm(chave, nonce, aad)` por chamada; nunca reaproveitar nonce.
- AAD = `utf8("domus-gcm-v1|" + nostrPublicKey)` (chave pública do Grupo forte em hex minúsculo, 64 caracteres). Decifrar com a chave certa mas a chave pública de outro grupo falha.
- Tudo o que vem do relay é tratado como hostil: tamanho conferido antes de decodificar, base64 estrito, qualquer exceção do `@noble/ciphers` vira motivo fixo.
- Decifração tudo ou nada: se a tag não confere, nenhum byte do texto é devolvido (o `gcm` do noble confere a tag antes de decifrar).
- Funções puras (mesmas entradas e o mesmo nonce dão a mesma saída; gerador injetável) que rodam no vitest sem `react-native` nem `expo`.
- Imports do `@noble/*` com sufixo `.js`, como na 4.1.
- Comentários e mensagens novas em pt-BR com acentos.

**Never:**
- Registrar o texto claro, o texto cifrado, a chave ou o nonce: nada de `console.*` no módulo; nenhuma mensagem de erro ou motivo repete a entrada nem a mensagem da biblioteca.
- Alterar `encryptPayload`/`decryptPayload`, `deriveKeysFromCode`, `publishSyncEvents`, `pullSyncEvents`, `subscribeToSyncEvents`, `syncPayload.ts`, `useSyncEngine.ts` ou o formato do Grupo antigo. O XOR continua sendo lido e escrito pelo código existente, sem mudança (critério do épico).
- Publicar, ler ou assinar eventos Nostr, escolher relays, montar lotes ou decidir o que vai a qual grupo (4.5, 4.6, 5.3).
- Comprimir antes de cifrar (ver Auditoria).
- Usar a `encryptionKey` em NIP-04/NIP-44, na assinatura ou em qualquer outro uso.
- Tocar `packages/sync`, `replit.md`, `replit.nix`, `.replit`, `ios/` ou `android/`.
- Adicionar dependência (`@scure/base` é dependência só do `nostr-tools`: não importar).

## I/O & Edge-Case Matrix

`k` = chaves de um Grupo forte (`deriveStrongGroupKeys`), `k2` = de outro grupo.

| Entrada | Saída |
|---|---|
| `decryptStrongPayload(encryptStrongPayload(t, k), k)` para `t` qualquer (acentos, emoji, `""`, JSON de lote) | `{ ok: true, plaintext: t }` |
| `encryptStrongPayload(t, k)` duas vezes | textos diferentes (nonce novo), os dois decifram para `t` |
| `encryptStrongPayload(t, k, rng)` | `rng` chamado uma vez com `12`; `Math.random` nunca chamado |
| `encryptStrongPayload` sem `globalThis.crypto` | lança erro (nada cifrado com nonce fraco) |
| `encryptStrongPayload` com chave de tamanho ≠ 32 ou chave pública que não é hex de 64 | lança erro sem os bytes na mensagem |
| `encryptStrongPayload` com `t` acima de `STRONG_MAX_PLAINTEXT_BYTES` (UTF-8) | lança erro (D-6); a 4.5 divide o lote antes |
| um byte trocado em qualquer posição (nonce, cifra ou tag) | `{ ok: false, reason: "auth-failed" }` |
| texto cifrado cortado ou com bytes a mais (dentro do base64 válido) | `{ ok: false, reason: "auth-failed" }` ou `"malformed"` se ficar menor que nonce + tag |
| decifrar com `k2.encryptionKey` | `{ ok: false, reason: "auth-failed" }` |
| decifrar com a chave certa e a `nostrPublicKey` de `k2` | `{ ok: false, reason: "auth-failed" }` |
| conteúdo do Grupo antigo (`hex:hex` do `encryptPayload`) | `{ ok: false, reason: "legacy-xor" }` |
| `domus-gcm-v2.…` ou outra versão | `{ ok: false, reason: "unsupported-version" }` |
| texto sem marcador conhecido, vazio ou que não é `string` | `{ ok: false, reason: "unknown-format" }` |
| marcador certo e base64 inválido, com espaço, com bits de sobra ou com menos de 28 bytes | `{ ok: false, reason: "malformed" }` |
| conteúdo maior que `STRONG_MAX_CONTENT_CHARS` | `{ ok: false, reason: "too-large" }`, sem decodificar |
| o mesmo texto cifrado entregue de novo (reenvio pelo relay) | `{ ok: true }` de novo: a cifra não impede repetição; a importação ignora por `id` (AD-2) |

</frozen-after-approval>

## Auditoria (baseline `5456447`, 29/10/2026)

**Cifra do Grupo antigo hoje** (`src/modules/nostrSync.ts`, sem mudança nesta story).
- `encryptPayload(payload, encKey)` (privada): nonce de 16 bytes de `getRandomBytes` (cai para `Math.random` sem `crypto`, D43); `expanded = SHA-256(encKey ‖ nonce)`; XOR do UTF-8 com `expanded` repetido; saída `hex(nonce):hex(cifra)` (32 hex, `:`, 2 hex por byte).
- `decryptPayload` faz `split(":")` e decifra qualquer coisa: chave errada ou adulteração dão lixo, que só é pego depois pelo `JSON.parse` (`parseSyncPayloadDetailed` → `malformedJson`, com aviso no log). No pull, qualquer exceção é engolida como "evento de outro grupo".
- O helper `encrypt`/`decrypt` de `src/modules/__tests__/nostrSync.test.ts` reproduz o formato XOR: serve de fonte para o caso `legacy-xor`.

**O que é cifrado hoje.** Um lote, não um evento: `publishSyncEvents` fatia os eventos em lotes de `BATCH_SIZE = 20`, faz `JSON.stringify` de um array de envelopes `{id, type, payload, timestamp, deviceId, signature}` e cifra o texto inteiro, que vai no `content` de um evento Nostr kind `30333` (substituível, `d = sync-<deviceId>-<lote>`, `t = domus-sync`, `device`, `batch` = quantidade, todos em claro). O pull decifra o `content` e `parseSyncPayloadDetailed` aceita array ou objeto único. A 4.2 mantém essa fronteira: cifra **um texto** (o JSON do lote) e não conhece envelopes; a 4.5 decide o lote e a 5.3 o torna imutável.

**Tamanho.** Um lote de 20 transações típicas (descrição de ~45 caracteres) dá ~7,8 KB de JSON; em hex (XOR) vira ~15,5 KB, em base64 ~10,4 KB. Limites de relay conhecidos (padrões, não conferidos nos seis relays da lista): strfry recusa evento acima de 64 KiB e nostr-rs-relay acima de 128 KiB; o evento inteiro (tags, `id`, `pubkey`, `sig`) conta. Hoje não há teto: um lote com payloads grandes (itens de NF, texto de holerite) pode passar e ser recusado em silêncio pelo relay. A 4.2 fixa um teto (D-6); medir os relays é da 4.5.

**Compressão.** Nenhuma hoje (nem `pako`, `fflate` ou `lz-string` no `package.json`). Fica fora da 4.2: comprimir antes de cifrar faz o tamanho do texto cifrado depender do conteúdo (vazamento do tipo CRIME), exige dependência nova e o ganho é pequeno com lotes de ~8 KB. Se um dia for preciso, entra como `v2` do formato.

**Biblioteca** (`@noble/ciphers` 2.1.1, conferido no Node da sessão).
- `gcm(key, nonce, AAD?)` → `{ encrypt(pt) → cifra ‖ tag(16), decrypt(cifra ‖ tag) → pt }`; `nonceLength: 12`, `tagLength: 16`.
- Erros: tag errada → `aes/gcm: invalid ghash tag` (confere a tag com `equalBytes` antes de decifrar); entrada menor que 16 bytes → `"ciphertext" expected length bigger than tagLength=16`; segunda `encrypt` na mesma instância → `cannot encrypt() twice with same key + nonce`. Nenhuma mensagem carrega dado, mas o módulo não as repassa.
- `managedNonce(gcm, randomBytes_)` (`utils.js`) faz `nonce ‖ cifra ‖ tag` com gerador injetável; serve, mas escrever as três linhas à mão deixa o formato explícito no código.
- `gcmsiv` (RFC 8452), no mesmo arquivo, resiste a nonce repetido (só revela que dois textos são iguais); é ~20% mais lento. Ver D-5.
- Limite de uso (README do noble, `draft-irtf-cfrg-aead-limits`): com nonce aleatório de 96 bits, até 2²³ mensagens por chave a chance de colisão é 2⁻⁵⁰; até 2³² ainda é desprezível. Uma família com 10 aparelhos publicando 1.000 lotes por dia leva mais de 11 mil anos para chegar a 2³².
- Sem base64 no `@noble/ciphers` nem no `@noble/hashes` (só hex e UTF-8).
- Vetores conferidos: NIST GCM (McGrew–Viega) caso 16 (AES-256, AAD de 20 bytes) dá o mesmo resultado no `gcm` do noble e no `aes-256-gcm` do `node:crypto`; RFC 8452 apêndice C.2 (primeiro vetor AES-256, texto vazio) dá `07f5f4169bbf55a8400cd47ea6fd400f` no `gcmsiv`.

**Hermes.** Sem `crypto.subtle`; `getRandomValues` vem do `cryptoPolyfill` (`expo-crypto`), importado primeiro em `app/_layout.tsx`. O `gcm` do noble já roda no aparelho pelo backup. `TextDecoder` já é usado pelo `decryptPayload` do Grupo antigo; o `bytesToUtf8`/`utf8ToBytes` do noble servem.

**Revisão em party (29/10).** Aprovou gerador, HKDF e comparação da 4.1; não houve achado específico para a cifra. O princípio aplicado aqui é o mesmo: vetores conferidos por implementação independente (`node:crypto`).

## Padrão proposto

### Arquivos

- `src/modules/strongGroup/eventCipher.ts` (novo): constantes, `encryptStrongPayload`, `decryptStrongPayload`.
- `src/modules/strongGroup/base64.ts` (novo, se D-4 = a): base64 RFC 4648 §4 com `=`, estrito, ~40 linhas, puro (mesmo estilo do `base32.ts`).
- `src/modules/__tests__/eventCipher.test.ts` e `src/modules/__tests__/base64.test.ts` (novos).

### API

```ts
import type { StrongGroupKeys } from "./groupSecret";

/** Marcador e versão do formato; faz parte do AAD. */
export const STRONG_CIPHER_MARKER = "domus-gcm-v1";
export const STRONG_NONCE_BYTES = 12;
export const STRONG_TAG_BYTES = 16;
/** D-6: teto do texto claro (UTF-8) por chamada. */
export const STRONG_MAX_PLAINTEXT_BYTES = 32 * 1024;
/** Teto do conteúdo recebido, conferido antes de decodificar. */
export const STRONG_MAX_CONTENT_CHARS: number; // marcador + "." + base64(12 + 32 KiB + 16)

export type StrongCipherKeys = Pick<StrongGroupKeys, "encryptionKey" | "nostrPublicKey">;

/** Cifra um texto (o JSON de um lote) para o `content` do evento do Grupo forte. */
export function encryptStrongPayload(
  plaintext: string,
  keys: StrongCipherKeys,
  rng?: (n: number) => Uint8Array,
): string;

export type StrongDecryptError =
  | "unknown-format" | "legacy-xor" | "unsupported-version"
  | "too-large" | "malformed" | "auth-failed";
export function decryptStrongPayload(content: unknown, keys: StrongCipherKeys):
  | { ok: true; plaintext: string }
  | { ok: false; reason: StrongDecryptError };

/** Tamanho em bytes UTF-8, para a 4.5 dividir o lote antes de cifrar. */
export function strongPlaintextBytes(plaintext: string): number;
```

Síncronas: o `gcm` do noble é síncrono e um lote de ~8 KB leva poucos milissegundos (medir no aparelho na 4.5). `decryptStrongPayload` não lança para entrada do relay; só `encryptStrongPayload` lança, e só por erro de programação (chave de tamanho errado, chave pública inválida, texto grande demais, sem gerador).

### Formato do `content`

```
domus-gcm-v1.<base64( nonce(12) ‖ cifra(n) ‖ tag(16) )>
```

- O marcador tem letras fora de `0–9a–f` e `-`, então nunca casa com `hex:hex`; o separador é `.`, não `:`.
- Leitura, nesta ordem: não é `string` ou vazio → `unknown-format`; casa com `^[0-9a-f]+:[0-9a-f]+$` → `legacy-xor`; começa com `domus-gcm-v` mas não com `domus-gcm-v1.` → `unsupported-version`; outro começo → `unknown-format`; maior que `STRONG_MAX_CONTENT_CHARS` → `too-large`; base64 inválido ou não canônico, ou menos de 28 bytes → `malformed`; tag não confere (adulteração, chave errada, outro grupo, corte) → `auth-failed`.
- `auth-failed` não distingue chave errada de adulteração: a cifra não sabe a diferença, e não deve parecer que sabe.
- Um aparelho na versão antiga nunca recebe esse conteúdo: a 4.5 publica com a identidade Nostr do Grupo forte, e o filtro do Grupo antigo é `authors: [publicKey antiga]`. Se recebesse, o `decryptPayload` antigo daria lixo e o `JSON.parse` descartaria com aviso.

### AAD

`utf8("domus-gcm-v1|" + keys.nostrPublicKey)`.
- O marcador no AAD impede reaproveitar a cifra num formato futuro com outra interpretação.
- A chave pública amarra o lote ao grupo: mesmo que dois grupos tivessem a mesma `encryptionKey` (não acontece pelo HKDF da 4.1), um lote copiado de um para o outro seria recusado.
- `d`, `device`, `created_at` e as outras tags ficam fora do AAD: o evento Nostr inteiro já é assinado pela chave do grupo (4.5), e a 5.3 vai mudar o `d`. Pôr mais campos no AAD é decisão de `v2`.

### O que a 4.2 deixa para as próximas

- **4.5:** chama `encryptStrongPayload(JSON.stringify(lote), keys)` e põe o resultado no `content`; no pull, `decryptStrongPayload` e, se `ok`, `parseSyncPayloadDetailed(plaintext)`. Recusas são contadas e registradas só pelo `reason` e pelo `id` do evento Nostr, nunca pelo conteúdo. Divide o lote se `strongPlaintextBytes` passar do teto; confere o limite real de cada relay.
- **4.6/5.x:** repetição de um lote antigo (relay que reentrega, ou atacante que republica um evento assinado antigo) decifra normalmente; quem protege é a inserção idempotente por `id` (AD-2, `INSERT OR IGNORE`). Um evento que o aparelho apagou por reset e volta por repetição é o caso do marcador de reset (FR-10, Epic 5), não da cifra.
- **4.9/4.10:** a checklist do NFR-6 pode apontar para este módulo como a única cifra do Grupo forte.

## Decisões do dono (aprovadas em 29/10: D-4 base64, D-5 AES-GCM comum, D-6 teto de 32 KiB)

- **D-4: como o texto cifrado vira texto no evento.**
  - (a) base64 (letras, números, `+`, `/`, `=`), escrito no módulo como o base32 da 4.1, com os vetores da RFC 4648. Um lote típico fica com ~10 KB.
  - (b) hex (0–9 e a–f), como o Grupo antigo, com o `bytesToHex` que já vem no `@noble/ciphers`. Nada novo para escrever, mas o lote fica com ~15,5 KB, 50% maior.

  Em palavras simples: o base64 gasta um terço a menos de rede e cabe mais evento por lote no limite dos relays; custa ~40 linhas e um teste, iguais às do base32 já revisado. **Recomendado: (a).**
- **D-5: AES-GCM comum ou AES-GCM-SIV.**
  - (a) AES-GCM comum com número único (nonce) aleatório, como diz o FR-12 e como o backup já faz.
  - (b) AES-GCM-SIV (RFC 8452), da mesma biblioteca: se um dia o mesmo nonce sair duas vezes (gerador defeituoso), só revela que dois lotes são iguais, em vez de abrir caminho para forjar lotes. ~20% mais lento e outro nome para a política e a loja ("AES-GCM-SIV").

  O risco que o SIV cobre é o gerador falhar, e o módulo já lança erro sem gerador e nunca cai para `Math.random`; com nonce aleatório o volume do DOMUS fica bilhões de vezes abaixo do limite. **Recomendado: (a)**, com o SIV registrado como caminho para um `v2` se a revisão de segurança pedir.
- **D-6: o que fazer com um lote grande demais.**
  - (a) A cifra recusa texto acima de 32 KiB (lança erro) e exporta o tamanho para a 4.5 dividir o lote antes; na leitura, conteúdo acima do teto é recusado sem decodificar.
  - (b) Sem teto na 4.2; a 4.5 cuida do tamanho.

  32 KiB viram ~44 KB em base64, abaixo dos 64 KiB do relay mais restritivo conhecido, e são 4 vezes um lote típico. Com teto, um lote grande falha no teste, não em silêncio no relay; e um conteúdo gigante vindo do relay não trava o aparelho. **Recomendado: (a).**

## Code Map

- `src/modules/strongGroup/eventCipher.ts` (novo)
- `src/modules/strongGroup/base64.ts` (novo, D-4 a)
- `src/modules/__tests__/eventCipher.test.ts` (novo)
- `src/modules/__tests__/base64.test.ts` (novo, D-4 a)
- Sem mudança: `src/modules/nostrSync.ts`, `src/modules/syncPayload.ts`, `src/modules/strongGroup/groupSecret.ts`, `src/modules/__tests__/nostrSync.test.ts`, `src/context/*`, `app/*`, `src/modules/cryptoPolyfill.ts`, `vitest.config.ts`, `package.json`, `package-lock.json`, `packages/*`

## Tasks & Acceptance

**Execution:**
- [x] 4.2-1 `base64.ts` (D-4 a): `encodeBase64`/`decodeBase64` (RFC 4648 §4, com `=`; `decode` devolve `null` em símbolo inválido, espaço, padding errado ou bits de sobra diferentes de zero). Testes com os vetores da RFC 4648 §10 (`""`, `f`→`Zg==`, `fo`→`Zm8=`, `foo`→`Zm9v`, `foob`→`Zm9vYg==`, `fooba`→`Zm9vYmE=`, `foobar`→`Zm9vYmFy`) e ida e volta de 1.000 entradas aleatórias de 0 a 300 bytes conferidas com o `Buffer` do Node.
- [x] 4.2-2 `eventCipher.ts`: constantes, `encryptStrongPayload`, `decryptStrongPayload`, `strongPlaintextBytes`, conforme o padrão e D-4/D-5/D-6. Sem `console.*`; todo `catch` devolve motivo fixo; buffers temporários (texto claro em bytes) zerados com `fill(0)` depois do uso, sem promessa além disso.
- [x] 4.2-3 Testes de ida e volta: todas as linhas de sucesso da matriz; textos com acentos pt-BR, emoji (pares substitutos), `""` e exatamente `STRONG_MAX_PLAINTEXT_BYTES`; dois textos cifrados do mesmo texto diferem; `rng` injetado recebe `12`; `vi.spyOn(Math, "random")` nunca chamado; sem `globalThis.crypto` (`vi.stubGlobal`) lança erro.
- [x] 4.2-4 Testes de recusa: trocar cada byte (amostra cobrindo nonce, cifra e tag) → `auth-failed`; cortar 1 byte e acrescentar 1 byte → `auth-failed`; chave de outro grupo e chave pública de outro grupo → `auth-failed`; conteúdo do helper XOR do `nostrSync.test.ts` → `legacy-xor`; `domus-gcm-v2.` → `unsupported-version`; vazio, número, `null` → `unknown-format`; base64 inválido e menos de 28 bytes → `malformed`; conteúdo acima do teto → `too-large`. Em toda recusa, `plaintext` não existe no resultado.
- [x] 4.2-5 Vetores: (a) NIST GCM caso 16 (chave `feffe992…`, IV `cafebabefacedbaddecaf888`, AAD `feedfacedeadbeef…abaddad2`, tag `76fc6ece0f4e1768cddf8853bb2d551b`) pelo `gcm` do noble (confere a ligação da biblioteca); (b) para 100 textos e nonces aleatórios, o `content` de `encryptStrongPayload` decifra no `aes-256-gcm` do `node:crypto` com o mesmo AAD (implementação independente), e o inverso; (c) vetor de ouro com as chaves do segredo de padrão `00 01 … 1f` da 4.1 (`encryptionKey` `6896799c…809a`, `nostrPublicKey` `edf43ce4…8e03`), nonce `00 01 … 0b` e um lote JSON fixo de um envelope: `content` em texto fixo no teste (calculado na implementação e anotado no Spec Change Log).
- [x] 4.2-6 Testes de vazamento e isolamento: nenhum `reason` nem mensagem de erro lançada contém o texto claro, a chave (hex) ou o conteúdo recebido; o fonte de `eventCipher.ts` não importa `react-native`, `expo*`, `@scure/base` nem `nostr-tools/pool`, e não contém `console.` nem `Math.random`; o fonte de `nostrSync.ts` não importa `strongGroup/eventCipher` (o Grupo antigo não usa a cifra nova nesta story).

**Acceptance Criteria:**
- Given um texto e as chaves de um Grupo forte, when cifro com `encryptStrongPayload` e decifro com `decryptStrongPayload`, then recebo o texto original, e o `content` começa com `domus-gcm-v1.`.
- Given um texto cifrado com um byte trocado, cortado ou com bytes a mais, when decifro, then recebo `ok: false` com `auth-failed` ou `malformed` e nenhum dado.
- Given outra chave ou a chave pública de outro grupo, when decifro, then recebo `ok: false` com `auth-failed`.
- Given o conteúdo `hex:hex` do Grupo antigo, when passo a `decryptStrongPayload`, then recebo `legacy-xor`; e o `encryptPayload`/`decryptPayload` do Grupo antigo e os testes de `nostrSync.test.ts` seguem iguais e passando.
- Given um ambiente sem `crypto.getRandomValues`, when cifro, then a função lança erro e nada é cifrado.
- Given os vetores NIST e o `node:crypto`, when comparo, then os resultados batem, e o vetor de ouro bate.
- Given `npx vitest run`, when os testes novos rodam, then passam sem `react-native` e sem mock de `expo`; `npx tsc --noEmit` e `npx eslint .` ficam com 0 erros.

## Riscos e notas para a implementação

- **R-1, vazamento por log.** O texto claro é o lote de dados financeiros. O módulo não loga; a 4.5 registra só `reason` e o `id` do evento Nostr. O aviso de pull do Grupo antigo ("Ignorando evento do relay com JSON malformado") não deve ser copiado para o forte com o conteúdo.
- **R-2, repetição.** GCM autentica, mas não impede reentregar um texto cifrado antigo e válido. A idempotência por `id` (AD-2) cobre a importação; a "ressurreição" depois de reset é do FR-10 (Epic 5). Documentar no comentário do módulo.
- **R-3, nonce repetido.** Com AES-GCM, nonce repetido sob a mesma chave revela o XOR dos dois textos e permite forjar a tag. O nonce sai sempre do gerador criptográfico e a instância do `gcm` não é reaproveitada; o noble ainda recusa uma segunda `encrypt` na mesma instância. O SIV fica como `v2` (D-5).
- **R-4, não é "key-committing".** Um texto cifrado de GCM pode ser montado para decifrar sob duas chaves diferentes ("invisible salamanders"). Só importa quando o atacante escolhe as chaves; no DOMUS cada grupo tem uma chave secreta e o AAD inclui a chave pública. Registrar, não tratar.
- **R-5, metadados em claro.** A cifra protege o `content`; tamanho do lote, `device`, `created_at`, quantidade (`batch`) e a chave pública do grupo continuam visíveis (já declarados na política). A 4.5 pode reduzir tags; não é da 4.2.
- **R-6, desempenho no Hermes.** O noble em JS puro sem JIT é mais lento que no Node; ~8 KB por lote devem ficar em milissegundos, mas o primeiro pull de um histórico longo decifra centenas de lotes. Medir no aparelho na 4.5.
- **R-7, teto do relay.** Os 64 KiB do strfry e 128 KiB do nostr-rs-relay são padrões conhecidos, não conferidos nos seis relays da lista; a 4.5 confere (NIP-11 `limitation.max_message_length`/`max_content_length`).

## Spec Change Log

- 29/10/2026: rascunho. Vetores NIST GCM caso 16 e RFC 8452 C.2 conferidos no `@noble/ciphers` 2.1.1 e no `node:crypto` durante a pesquisa.
- 29/10/2026 (implementação, 4.2-5c): vetor de ouro fixado em `eventCipher.test.ts` (`GOLDEN_CONTENT`). Chaves do segredo de padrão `00 01 … 1f` da 4.1 (`encryptionKey` `6896799c…809a`, `nostrPublicKey` `edf43ce4…8e03`), nonce `00 01 … 0b`, AAD `utf8("domus-gcm-v1|edf43ce4…8e03")`. Calculado no `aes-256-gcm` do `node:crypto` (implementação independente) e conferido igual no `encryptStrongPayload`.
  - texto claro (208 bytes UTF-8): `[{"id":"evt-0001","type":"TRANSACTION_CREATED","payload":{"amount":12345,"description":"Pão de queijo ☕","category":"alimentação"},"timestamp":1700000000000,"deviceId":"device-a","signature":"sig-0001"}]`
  - `content`: `domus-gcm-v1.AAECAwQFBgcICQoLvTgp2q/Wjr4/niJu3g+5HyvT02GX/ct8c4swKDOlysdiYIL+MlR0g5QKTJ3XTw/3hBX4Xbb6+mF5/w+OY8KGOHHDTNMsxmovx+wzK/haCNtZq4m2c+i0g+Oi42ersTbN0moKvQfoDQeg55uLiyT1I5DLfWBZ3qRzVWga/VfJQ9XcRbUvK51vnooxLxODn55fcefMLq/FJ/lNkPnP+CnthsuetLHtGNl06JZmRyN6i1PXXgZyKTeXj4qQdMepsK1Eei9JPS6dlAnTDOJjaN3MK79nI9OZL25FGGaRNhGeDS8=`

## Verification

**Comandos (local)**
- `npx vitest run src/modules/__tests__/eventCipher.test.ts src/modules/__tests__/base64.test.ts`: todos passam.
- `npx vitest run`: 0 falhas (baseline da `dev` sem falhas).
- `npx tsc --noEmit`: 0 erros (sem `expo-env.d.ts`).
- `npx eslint .`: 0 erros.
- `git diff 5456447 -- src/modules/nostrSync.ts src/modules/syncPayload.ts src/modules/strongGroup/groupSecret.ts src/modules/__tests__/nostrSync.test.ts src/context app packages vitest.config.ts package.json package-lock.json replit.md replit.nix .replit`: vazio.
- `grep -n "console\.\|Math.random" src/modules/strongGroup/*.ts`: nada.

**Revisão manual**
- O marcador, o separador e a montagem do AAD estão no código exatamente como na spec (fazem parte do formato: mudar depois quebra a leitura entre versões).
- Nenhuma chave real em teste; os vetores usam o segredo de padrão da 4.1 e os vetores públicos do NIST.

## Implementation Notes

**Arquivos**
- `src/modules/strongGroup/base64.ts` (novo): `encodeBase64`/`decodeBase64` e `BASE64_ALPHABET`, no estilo do `base32.ts` (tabela `Int8Array` por código de caractere). `decodeBase64` devolve `null` para tamanho fora de múltiplo de 4, símbolo fora do alfabeto (espaço, quebra, variante URL, não ASCII), `=` fora do fim ou em excesso e bits de sobra diferentes de zero.
- `src/modules/strongGroup/eventCipher.ts` (novo): API da spec, mais `STRONG_KEY_BYTES` e o tipo `StrongDecryptResult` exportados. `STRONG_MAX_CONTENT_CHARS` = 43.741 (13 + base64 de 12 + 32.768 + 16 bytes).
- `src/modules/__tests__/base64.test.ts` (novo, 30 testes) e `src/modules/__tests__/eventCipher.test.ts` (novo, 80 testes).
- Nenhuma mudança em `nostrSync.ts`, `syncPayload.ts`, `groupSecret.ts`, `nostrSync.test.ts`, `src/context/`, `app/`, `packages/`, `vitest.config.ts`, `package.json` nem `package-lock.json`.

**Decisões além da spec**
- Nonce pelo `randomBytes` do `@noble/hashes/utils.js` (o mesmo da 4.1; o do `@noble/ciphers` é idêntico). Os bytes do gerador são copiados, e o gerador que devolve tamanho diferente de 12 ou algo que não é `Uint8Array` faz lançar erro. As conferências de texto, chaves e teto vêm antes do gerador: entrada inválida não consome nonce.
- `strongPlaintextBytes` conta os bytes UTF-8 sem alocar, com a mesma regra do `TextEncoder` (substituto solto = 3 bytes, de U+FFFD); um teste confere contra o `TextEncoder`, inclusive com substitutos soltos.
- Ordem da leitura como na spec, com dois detalhes: `legacy-xor` é reconhecido em qualquer tamanho (um lote antigo grande continua `legacy-xor`, não `unknown-format`); `too-large` só se aplica ao `domus-gcm-v1.` (os outros formatos já são recusados sem decodificar). `domus-gcm-v1:` (separador errado) e `domus-gcm-v` sozinho caem em `unsupported-version`.
- `decryptStrongPayload` com chaves inválidas (tamanho ≠ 32, chave pública que não é hex de 64, `null`) devolve `auth-failed` em vez de lançar, para manter "nunca lança" no caminho do relay; a conferência vem depois da decodificação, então `malformed`/`too-large` não dependem da chave.
- Texto decifrado com tag válida mas bytes que não são UTF-8 (só um cliente defeituoso com a chave produziria isso) vira U+FFFD pelo `bytesToUtf8` do noble (`TextDecoder` sem `fatal`), em vez de motivo novo; o `JSON.parse` da 4.5 recusa depois. Não usei `fatal: true` porque não está conferido no Hermes.
- Buffers zerados com `fill(0)`: o texto claro em bytes na cifragem (em `finally`) e na decifração (depois de virar string). O AAD não é segredo e não é zerado.
- Comentário do módulo registra R-2 (repetição), R-4 (não é key-committing) e R-5 (metadados em claro).
- Testes além da matriz: 2.000 nonces distintos; 50 grupos aleatórios em que cada `content` só abre no próprio grupo; troca de cada byte com dois padrões de bit (`0x01` e `0x80`) em todas as posições; o vetor de ouro não abre sem AAD nem com `.` no lugar de `|`; checagem estática de que o marcador, o separador e a montagem do AAD estão no fonte como na spec e de que não há `gcmsiv`/`managedNonce`.

**Sondas** (quebras temporárias, revertidas e conferidas com `diff`): AAD sem a chave pública (4 testes falham), queda para `Math.random` sem gerador, escrita de forma a escapar da checagem estática (2), motivo com a mensagem da biblioteca (7), sem o teto do conteúdo (1), sem reconhecer o XOR (1), nonce fixo (5), teto contado em caracteres em vez de bytes (1), base64 sem conferir bits de sobra (3), sem o tamanho mínimo de 28 bytes (3).

**Verificação**
- `npx vitest run src/modules/__tests__/eventCipher.test.ts src/modules/__tests__/base64.test.ts`: 110 passam.
- `npx vitest run`: 104 arquivos, 2390 testes passando (baseline 102 / 2280 + 2 arquivos / 110 testes novos), 0 falhas.
- `npx tsc --noEmit`: 0 erros (sem `expo-env.d.ts`).
- `npx eslint .`: 0 erros (12 avisos, todos de antes; os arquivos novos não têm aviso).
- `git diff 5456447 -- src/modules/nostrSync.ts src/modules/syncPayload.ts src/modules/strongGroup/groupSecret.ts src/modules/__tests__/nostrSync.test.ts src/context app packages vitest.config.ts package.json package-lock.json replit.md replit.nix .replit`: vazio.
- `grep -n "console\.\|Math.random" src/modules/strongGroup/*.ts`: nada.
