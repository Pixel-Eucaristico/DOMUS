---
title: 'Story 4.1: Gerar o Segredo de grupo forte e derivar as chaves'
type: 'feature'
created: '2026-10-29'
status: 'in-progress'
baseline_commit: 'd9886b7'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/planning-artifacts/epics.md'
  - '{project-root}/_bmad-output/planning-artifacts/prds/prd-DOMUS-2026-10-15/prd.md'
  - '{project-root}/_bmad-output/planning-artifacts/prds/prd-DOMUS-2026-10-15/addendum.md'
  - '{project-root}/_bmad-output/planning-artifacts/prds/prd-DOMUS-2026-10-15/reconcile-spine.md'
  - '{project-root}/_bmad-output/planning-artifacts/architecture/architecture-DOMUS-2026-10-15/ARCHITECTURE-SPINE.md'
  - '{project-root}/_bmad-output/implementation-artifacts/spec-12-3-pin-com-salt-criptografico-e-derivacao-lenta.md'
  - '{project-root}/_bmad-output/implementation-artifacts/deferred-work.md'
  - '{project-root}/AGENTS.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** O Grupo antigo nasce de um código de 6 caracteres (`generateGroupCode` em `src/context/syncStorage.ts`: alfabeto de 32 símbolos, 32⁶ = 2³⁰ ≈ 1 bilhão de códigos, sorteados com `Math.random`). `deriveKeysFromCode` (`src/modules/nostrSync.ts`) tira desse código a chave privada do Nostr e a chave de cifra. A chave pública vai em claro em todo evento nos relays: quem a vê testa o bilhão de códigos até bater e obtém a chave de cifra (addendum §H). Trocar o XOR por AES-GCM não resolve enquanto o segredo for curto (PRD §4.4). Não existe hoje nenhum gerador de segredo forte nem derivação separada para o Grupo forte.

**Approach:** Um módulo puro novo, `src/modules/strongGroup/groupSecret.ts`, sem `react-native` nem `expo`, que (1) gera o Segredo de grupo com 256 bits (D-1) do gerador criptográfico (`globalThis.crypto.getRandomValues`, via `randomBytes` do `@noble/hashes`), falhando se ele não existir; (2) o escreve e lê como texto `DOMUS1-…` em base32 maiúsculo com 4 bytes de verificação (D-2), pronto para QR e colagem; (3) deriva do segredo, por HKDF-SHA256 com rótulos novos e versionados, a identidade Nostr do grupo e a chave de 256 bits da cifra da Story 4.2. Funções puras e vetores de teste fixos. Sem UI, sem armazenamento, sem relay: isso é das Stories 4.3 a 4.5.

## Boundaries & Constraints

**Always:**
- Aleatoriedade só de `globalThis.crypto.getRandomValues` (no nativo vem do `cryptoPolyfill` com `expo-crypto`, importado primeiro em `app/_layout.tsx`; na web, do navegador; no vitest, do Node). Sem gerador, `generateGroupSecret` **lança erro**; nunca cai para `Math.random`.
- Pelo menos 128 bits de aleatoriedade (FR-13); o padrão proposto usa 256 (D-1).
- A derivação usa HKDF-SHA256 (`@noble/hashes/hkdf.js`) com `salt` e `info` próprios do Grupo forte, versionados (`v1`), diferentes de todos os rótulos de `deriveKeysFromCode`. Cada chave tem um `info` só dela: a chave da cifra nunca é a chave do Nostr nem sai dela.
- A entrada do HKDF são os bytes do segredo, não o texto: o mesmo segredo escrito em minúsculas, com espaços ou sem hífens gera as mesmas chaves.
- O módulo é puro (mesmas entradas, mesmas saídas; o gerador é injetável) e roda no vitest sem `react-native` nem `expo`.
- Comparações de bytes do segredo e da verificação com `equalBytes` (`@noble/ciphers/utils.js`, tempo constante).
- Imports do `@noble/*` com sufixo `.js` (como `BackupCryptoService` e `PinAuthService`): resolvem pelo `exports` do pacote, sem mexer em `vitest.config.ts`.
- Comentários e mensagens novas em pt-BR com acentos.

**Never:**
- Registrar o segredo, o texto dele ou qualquer chave derivada: nada de `console.*` no módulo, e nenhuma mensagem de erro ou motivo de recusa repete o texto recebido.
- Segredo em `EXPO_PUBLIC_*`, em evento, em `AsyncStorage` ou em arquivo versionado (inclusive testes: os vetores usam bytes fixos de padrão, como `00 01 02 … 1f`).
- Alterar `deriveKeysFromCode`, `encryptPayload`/`decryptPayload`, `generateGroupCode`, `syncStorage.ts`, `useSyncEngine.ts`, `app/sync.tsx` ou o formato do Grupo antigo (o Grupo antigo segue igual até a 4.9).
- Tocar `packages/sync`, `replit.md`, `replit.nix`, `.replit`, `ios/` ou `android/`.
- Adicionar dependência (o `@scure/base` existe só como dependência do `nostr-tools`; importá-lo direto seria dependência fantasma): o base32 é escrito no módulo, com os vetores da RFC 4648.
- Derivação lenta (PBKDF2/scrypt/argon2): ela só ajuda segredo de pouca entropia, como o PIN (30 mil iterações, Story 12.3) e a senha do backup (100 mil). Um segredo aleatório de 256 bits não tem o que esticar.

## I/O & Edge-Case Matrix

| Entrada | Saída |
|---|---|
| `generateGroupSecret()` com `crypto.getRandomValues` | 32 bytes aleatórios; `Math.random` nunca é chamado |
| `generateGroupSecret()` sem `globalThis.crypto` | lança erro (sem segredo fraco) |
| 10.000 chamadas seguidas | 10.000 segredos (e textos) distintos |
| `encodeGroupSecret(s)` | `DOMUS1-XXXX-XXXX-…` (58 símbolos base32 em blocos de 4; 79 caracteres) |
| `parseGroupSecret(encodeGroupSecret(s))` | `{ ok: true, secret: s }` |
| o mesmo texto em minúsculas, com espaços, quebras de linha, sem hífens ou com espaço nas pontas | `{ ok: true }`, mesmos bytes |
| `""` ou só espaços | `{ ok: false, reason: "empty" }` |
| código do Grupo antigo (`K7M2QX`, 6 símbolos do alfabeto antigo) | `{ ok: false, reason: "legacy-code" }` (a 4.4 mostra "use o QR") |
| texto que não começa com `DOMUS` | `{ ok: false, reason: "not-domus" }` |
| `DOMUS2-…` (versão futura) | `{ ok: false, reason: "unsupported-version" }` |
| símbolo fora do base32 (`0`, `1`, `8`, `9`, `!`) | `{ ok: false, reason: "invalid-char" }` |
| texto cortado ou com símbolo a mais | `{ ok: false, reason: "wrong-length" }` |
| um símbolo trocado | `{ ok: false, reason: "checksum" }` |
| `deriveStrongGroupKeys(s)` duas vezes, em qualquer aparelho | as mesmas chaves |
| `deriveStrongGroupKeys(s)` | `nostrPrivateKey` (32 B), `nostrPublicKey` (hex, 64), `encryptionKey` (32 B), `version: 1`; as duas chaves diferentes entre si |
| os mesmos bytes passados a `deriveKeysFromCode` (como texto) e a `deriveStrongGroupKeys` | chaves diferentes (rótulos diferentes) |

</frozen-after-approval>

## Auditoria (baseline `d9886b7`, 29/10/2026)

**Grupo antigo hoje.**
- `generateGroupCode()` (`src/context/syncStorage.ts:17`): 6 símbolos de `ABCDEFGHJKLMNPQRSTUVWXYZ23456789`, com `Math.random`. Chamado só em `useSyncEngine.ts:334` (criar grupo).
- `deriveKeysFromCode(code)` (`src/modules/nostrSync.ts:240`): `seed = SHA-256("domus-group:" + código maiúsculo)`; chave privada = HKDF(seed, salt `"domus-nostr-identity"`, info `"nostr-private-key"`); chave de cifra = HKDF(seed, salt `"domus-payload-encryption"`, info `"aes-key"`). SHA-256, HMAC e HKDF escritos à mão no arquivo. **Estes quatro rótulos não podem se repetir no Grupo forte.**
- Cifra: `encryptPayload` faz XOR com `SHA-256(chave ‖ nonce)` repetido (keystream de 32 bytes reaproveitado a cada 32 bytes do texto); formato `hex(nonce):hex(cifra)`. O nonce sai de `getRandomBytes` (`nostrSync.ts:51`), que **cai para `Math.random`** sem `crypto` (ver R-5).
- Relay: kind `30333`, tags `d = sync-<deviceId>-<lote>`, `t = domus-sync`, `device`, `batch`; filtro do pull e da assinatura por `authors: [publicKey]`. A identidade do grupo para os relays é a chave pública.
- Armazenamento: `loadGroupCode`/`saveGroupCode` (`syncStorage.ts`) em `SecureStore` (chave `domus_nostr_group_code`), na web em `webSecrets`; no nativo, se o `SecureStore` falha ao gravar, **cai para `AsyncStorage`** com `console.warn` (dívida do AD-6, Story 6.3).
- Pareamento: `app/sync.tsx` tem `maxLength={8}` e já usa `QRScannerModal` (`expo-camera`, devolve o texto lido em `onScanned`).

**Bibliotecas já instaladas** (nenhuma nova é necessária):

| Pacote | Versão | Uso aqui |
|---|---|---|
| `@noble/hashes` | 2.0.1 (direta; o `nostr-tools` usa a mesma) | `hkdf.js` (`hkdf`, `extract`, `expand`), `sha2.js` (`sha256`), `utils.js` (`randomBytes`, `utf8ToBytes`, `bytesToHex`, `concatBytes`) |
| `@noble/ciphers` | 2.1.1 (direta) | `utils.js` (`equalBytes`, tempo constante); `aes.js` (`gcm`) e `chacha.js` (`xchacha20poly1305`) ficam para a 4.2 |
| `nostr-tools` | 2.23.3 | `getPublicKey` de `nostr-tools/pure` (o mesmo de `deriveKeysFromCode`) |
| `@noble/curves` | 2.0.1 (do `nostr-tools`) | por baixo do `getPublicKey` |
| `@scure/base` | 2.0.0 (só do `nostr-tools`) | **não usar** (dependência fantasma) |
| `expo-crypto` | 15.0.9 | `getRandomBytes` alimenta o `cryptoPolyfill`; não importado pelo módulo |
| `expo-secure-store` | 15.0.8 | armazenamento do segredo, na 4.3 |

Conferido no Node 22 da sessão: `hkdf` do `@noble/hashes` 2.0.1 dá o mesmo resultado que `crypto.hkdfSync` do Node para o mesmo segredo, `salt` e `info`. O `hkdf` da v2 **exige `Uint8Array` em `salt` e `info`** (texto lança `"key" expected Uint8Array`): converter os rótulos com `utf8ToBytes`. `randomBytes` lança `crypto.getRandomValues must be defined` sem gerador, que é o comportamento desejado. `equalBytes` compara sem sair cedo.

**Vitest.** `vitest.config.ts` só tem aliases para imports **sem** `.js` (`@noble/ciphers/aes`, `@noble/hashes/sha2`…). Os módulos de produção já usam `@noble/hashes/pbkdf2.js`, `sha2.js` e `@noble/ciphers/aes.js`, que o Vite resolve pelo `exports` dos pacotes (`./hkdf.js` e `./utils.js` estão lá). Os testes do `nostrSync` já carregam `nostr-tools/pure` sem mock. Nada a mudar na configuração.

**Estilo das derivações existentes.** PIN (Story 12.3): PBKDF2-SHA256, 30 mil iterações, salt de 16 bytes de `expo-crypto`, formato com prefixo de versão `pbkdf2-sha256$30000$<hex>`, migração pelo prefixo. Backup (`BackupCryptoService`): PBKDF2-SHA256 100 mil iterações, AES-256-GCM do `@noble/ciphers`, nonce de 96 bits, `getRandomValues`. O Grupo forte segue o mesmo princípio de **versão no formato** (`DOMUS1`, rótulos `v1`), sem a derivação lenta (ver Never).

**Web.** Não há `SecureStore`; o segredo irá a `webSecrets` (AES-GCM com chave não extraível no IndexedDB, cifra no `AsyncStorage`). Sem WebCrypto ou IndexedDB, `webSecrets` guarda só em memória: o segredo some ao recarregar e o navegador precisa parear de novo. Não protege de XSS. Isso é da 4.3; a 4.1 só precisa de `crypto.getRandomValues`, que todo navegador suportado tem.

## Padrão proposto

### Arquivos

- `src/modules/strongGroup/groupSecret.ts` (novo): constantes, gerador, texto, derivação.
- `src/modules/strongGroup/base32.ts` (novo): base32 RFC 4648 sem padding, maiúsculo (~40 linhas, puro).
- `src/modules/__tests__/groupSecret.test.ts` e `src/modules/__tests__/base32.test.ts` (novos).

Fica em `src/modules/`, ao lado de `nostrSync.ts` e `syncPayload.ts` (outro módulo puro do sync), e não em `packages/`: é infraestrutura do sync, não domínio, e depende do `nostr-tools`. Não usa `packages/sync` (AD-9).

### API

```ts
export const STRONG_GROUP_VERSION = 1;
export const GROUP_SECRET_BYTES = 32;          // D-1
export const GROUP_SECRET_PREFIX = "DOMUS1";   // "DOMUS" + versão

/** 32 bytes do gerador criptográfico; lança erro se não houver gerador. */
export function generateGroupSecret(rng?: (n: number) => Uint8Array): Uint8Array;

/** Texto canônico para QR e colagem: "DOMUS1-XXXX-XXXX-…". */
export function encodeGroupSecret(secret: Uint8Array): string;

export type GroupSecretParseError =
  | "empty" | "legacy-code" | "not-domus" | "unsupported-version"
  | "invalid-char" | "wrong-length" | "checksum";
export function parseGroupSecret(text: string):
  | { ok: true; secret: Uint8Array }
  | { ok: false; reason: GroupSecretParseError };

export interface StrongGroupKeys {
  version: 1;
  nostrPrivateKey: Uint8Array;  // assina os eventos do grupo (4.5) e o marcador de reset (FR-10)
  nostrPublicKey: string;       // hex; identidade pública do grupo nos relays (authors)
  encryptionKey: Uint8Array;    // 32 bytes, só para a cifra autenticada da 4.2
}
export function deriveStrongGroupKeys(secret: Uint8Array): StrongGroupKeys;

/** Compara dois segredos em tempo constante (a 4.4 usa para "já é este grupo"). */
export function isSameGroupSecret(a: Uint8Array, b: Uint8Array): boolean;
```

`generateGroupSecret` repete o sorteio se a chave do Nostr derivada cair fora do intervalo válido do secp256k1 (probabilidade ~2⁻¹²⁸; o laço existe para que nenhum segredo gerado falhe em `deriveStrongGroupKeys`). `deriveStrongGroupKeys` lança erro se receber segredo de tamanho errado ou com chave inválida, sem incluir os bytes na mensagem. A forma assíncrona (`deriveKeysFromCode` é `async`) não é necessária: tudo aqui é síncrono e leva poucos milissegundos (o custo é o `getPublicKey`).

### Texto do segredo (D-2)

- Corpo: `segredo (32 B) ‖ verificação (4 B)` = 36 bytes → 58 símbolos base32 (RFC 4648: `A–Z` e `2–7`; sem `0`, `1`, `8`, `9`, que se confundem com `O`, `I`, `B`, `g`).
- Verificação: os 4 primeiros bytes de `SHA-256(utf8("DOMUS1") ‖ segredo)`. Pega erro de digitação, corte e colagem parcial (chance de um texto errado passar: 1 em 4 bilhões). Inclui o prefixo, então o mesmo corpo com outra versão não confere.
- Exibição: `DOMUS1-` e o corpo em blocos de 4 separados por `-` (79 caracteres). Todos os caracteres estão no modo alfanumérico do QR (maiúsculas, dígitos e `-`), o que dá um QR pequeno; a 4.3 decide se embrulha o texto num link.
- Leitura tolerante: tira espaços, quebras de linha e `-`, passa para maiúsculas, e só então valida, nesta ordem: vazio → código antigo (exatamente 6 símbolos do alfabeto antigo) → prefixo `DOMUS` → versão → símbolos → tamanho → verificação. O motivo é um código fixo; a mensagem em pt-BR é da 4.4.

### Derivação

| Chave | IKM | `salt` | `info` | Tamanho |
|---|---|---|---|---|
| `nostrPrivateKey` | bytes do segredo | `"domus/strong-group/v1"` | `"domus/strong-group/v1/nostr-identity"` | 32 B |
| `encryptionKey` | bytes do segredo | `"domus/strong-group/v1"` | `"domus/strong-group/v1/event-encryption"` | 32 B |

- `nostrPublicKey = getPublicKey(nostrPrivateKey)` (`nostr-tools/pure`).
- `salt` fixo é correto aqui: o IKM já é uniforme; o `salt` só marca o domínio "Grupo forte v1".
- Separação de domínio: os rótulos do Grupo antigo (`domus-nostr-identity`, `nostr-private-key`, `domus-payload-encryption`, `aes-key`, `domus-group:`) e os do Grupo forte não se repetem; um teste confere.
- **Identificador do grupo:** a própria `nostrPublicKey`. Ela já é pública nos relays (é o `authors` do filtro) e a 4.6 pode usá-la como chave do registro "publicado em qual grupo" sem guardar segredo no `AsyncStorage`. Não se deriva um terceiro identificador: seria mais um valor público sem uso. Se a 4.5 quiser um `t` próprio, é um texto fixo (por exemplo `domus-sync-v2`), não derivado do segredo.
- **Versão:** uma mudança de formato ou de derivação vira `DOMUS2` com rótulos `v2`, e o `v1` continua sendo lido. A 4.1 só implementa o `v1`.
- **Rótulos reservados:** novos usos (por exemplo uma chave só para o marcador de reset do FR-10, se a assinatura do Nostr não bastar) usam `"domus/strong-group/v1/<uso>"` com `<uso>` novo; nunca reaproveitam uma chave existente.

### O que a 4.1 deixa pronto para as próximas

- **4.2 (cifra autenticada):** `encryptionKey` tem 32 bytes e serve tanto a AES-256-GCM quanto a XChaCha20-Poly1305 (D-3); a 4.2 usa o `@noble/ciphers` (o Hermes não tem `crypto.subtle`; o backup já usa `gcm` puro em JS). Com AES-GCM e nonce aleatório de 96 bits, o limite seguro é da ordem de 2³² cifragens por chave; em lotes de 20 eventos isso é muito além do uso de uma família. O texto cifrado precisa de um marcador de formato que não se confunda com `hex:hex` do XOR, e convém autenticar como dado associado (AAD) o marcador e a `nostrPublicKey`, para um lote não ser movido de um grupo para outro. A `encryptionKey` nunca vai ao NIP-04/NIP-44 nem à assinatura.
- **4.3 (criar e mostrar):** grava o texto de `encodeGroupSecret` (não os bytes) em `SecureStore` com chave própria (sugestão `domus_strong_group_secret_v1`, separada de `domus_nostr_group_code`), ou em `webSecrets` na web. **Sem a queda para `AsyncStorage`** do `saveGroupCode`: segue a Story 6.3 (falhou, fica em memória e avisa). O QR e o texto copiável mostram `encodeGroupSecret`.
- **4.4 (parear):** chama `parseGroupSecret` e traduz cada `reason` em mensagem pt-BR; `"legacy-code"` vira "use o QR"; nada é gravado se `ok` for `false`. O campo deixa de ter `maxLength={8}`.
- **4.5 (relays):** `authors: [nostrPublicKey]`, assinatura com `nostrPrivateKey`. As chaves do Grupo antigo (`NostrSyncKeys`) e do forte (`StrongGroupKeys`) são tipos diferentes, para um não ser passado no lugar do outro.

## Decisões do dono (aprovadas em 29/10: D-1 256 bits, D-2 DOMUS1- base32 em blocos com verificação, D-3 AES-GCM na 4.2)

- **D-1: tamanho do segredo.**
  - (a) 128 bits, o mínimo do FR-13. Texto com 32 símbolos (`DOMUS1-` e 8 blocos de 4).
  - (b) 256 bits. Texto com 58 símbolos (`DOMUS1-` e 15 blocos).

  Em palavras simples: os dois são impossíveis de adivinhar hoje; o de 256 bits tem a mesma força da chave de cifra que sai dele e sobra margem para computadores futuros e para um atacante que tente muitos grupos de uma vez. O único custo é um texto mais longo, que quase ninguém digita, porque o pareamento é por QR ou colagem. **Recomendado: (b).**
- **D-2: como o segredo aparece em texto.**
  - (a) `DOMUS1-` + letras maiúsculas e números 2 a 7 (base32) em blocos de 4, com um "dígito verificador" de 4 bytes que acusa erro de digitação ou cópia incompleta.
  - (b) base64url (letras maiúsculas e minúsculas, números, `-` e `_`), mais curto (~48 símbolos), sem verificação.
  - (c) 24 palavras em inglês (como carteiras de bitcoin), fáceis de anotar em papel, mas longas e em outro idioma.

  A (a) é a única que aceita o texto em maiúsculas ou minúsculas, separa os blocos para conferir a olho, recusa um texto corrompido antes de gravar (pedido da 4.4) e dá um QR menor. **Recomendado: (a).**
- **D-3: cifra da Story 4.2** (a 4.1 já entrega uma chave que serve às duas; decidir agora só fixa o nome no plano).
  - (a) AES-GCM, como o PRD e o Epic 4 dizem, a mesma do backup e do `webSecrets`.
  - (b) XChaCha20-Poly1305, também no `@noble/ciphers`, com "número único" maior (192 bits) e mais tolerante a muitas mensagens.

  Para o volume do DOMUS as duas são seguras; a (a) evita mudar o texto do PRD, do FR-12, da política e da 4.10, que já dizem AES-GCM. **Recomendado: (a).**

## Code Map

- `src/modules/strongGroup/groupSecret.ts` (novo)
- `src/modules/strongGroup/base32.ts` (novo)
- `src/modules/__tests__/groupSecret.test.ts` (novo)
- `src/modules/__tests__/base32.test.ts` (novo)
- `_bmad-output/implementation-artifacts/deferred-work.md`: registrar R-5
- Sem mudança: `src/modules/nostrSync.ts`, `src/context/syncStorage.ts`, `src/context/useSyncEngine.ts`, `app/sync.tsx`, `src/modules/cryptoPolyfill.ts`, `vitest.config.ts`, `package.json`, `package-lock.json`, `packages/*`

## Tasks & Acceptance

**Execution:**
- [ ] 4.1-1 `base32.ts`: `encodeBase32`/`decodeBase32` (RFC 4648, sem padding, maiúsculo; `decode` devolve `null` em símbolo inválido ou em bits finais diferentes de zero). Testes com os vetores da RFC 4648 §10 (`""`, `f`→`MY`, `fo`→`MZXQ`, `foo`→`MZXW6`, `foob`→`MZXW6YQ`, `fooba`→`MZXW6YTB`, `foobar`→`MZXW6YTBOI`) e ida e volta de 1.000 entradas aleatórias de 0 a 64 bytes.
- [ ] 4.1-2 `groupSecret.ts`: constantes, `generateGroupSecret`, `encodeGroupSecret`, `parseGroupSecret`, `deriveStrongGroupKeys`, `isSameGroupSecret`, conforme o padrão e D-1/D-2. Sem `console.*`.
- [ ] 4.1-3 Testes de geração: 10.000 segredos e textos distintos; cada um volta igual por `parseGroupSecret`; `vi.spyOn(Math, "random")` nunca chamado; `rng` injetado recebe `32`; sem `globalThis.crypto` (`vi.stubGlobal`) lança erro.
- [ ] 4.1-4 Testes de texto: todas as linhas da matriz de I/O; a mensagem de cada erro lançado e cada `reason` não contêm o texto recebido.
- [ ] 4.1-5 Vetores de derivação: (a) RFC 5869 caso A.1 pelo `hkdf` do `@noble/hashes` (confere a ligação da biblioteca); (b) para 100 segredos aleatórios, `encryptionKey` e `nostrPrivateKey` iguais às do `hkdfSync` do `node:crypto` com os mesmos `salt` e `info` (implementação independente); (c) vetor de ouro com segredo `00 01 … 1f`: texto, `nostrPublicKey` e `encryptionKey` em hex fixos no teste (calculados na implementação e anotados no Spec Change Log).
- [ ] 4.1-6 Testes de separação: `encryptionKey ≠ nostrPrivateKey`; os `info`/`salt` do Grupo forte não aparecem entre os de `deriveKeysFromCode` (lidos do fonte de `nostrSync.ts`, como texto); para o texto `encodeGroupSecret(s)`, `deriveKeysFromCode(texto)` e `deriveStrongGroupKeys(s)` dão chaves públicas e de cifra diferentes; o fonte de `groupSecret.ts` não importa `react-native`, `expo*` nem `@scure/base`, e não contém `console.` nem `Math.random`.
- [ ] 4.1-7 `deferred-work.md`: registrar R-5.

**Acceptance Criteria:**
- Given o gerador criptográfico disponível, when gero 10.000 Segredos de grupo, then nenhum se repete e cada um tem 256 bits (D-1) vindos de `crypto.getRandomValues`, sem `Math.random`.
- Given um ambiente sem `crypto.getRandomValues`, when peço um segredo, then a função lança erro e nenhum segredo é devolvido.
- Given um segredo, when o escrevo com `encodeGroupSecret` e leio com `parseGroupSecret`, then volto aos mesmos bytes, aceitando maiúsculas/minúsculas, espaços e hífens.
- Given um código antigo de 6 caracteres, um texto truncado, um símbolo trocado ou uma versão desconhecida, when leio, then recebo `ok: false` com o motivo da matriz, sem o texto na resposta.
- Given o mesmo segredo, when derivo em dois aparelhos, then as chaves são idênticas e batem com o `hkdfSync` do Node e com o vetor de ouro.
- Given a chave pública do Nostr do Grupo forte, when ela é publicada, then ela vem por HKDF de um segredo aleatório de 256 bits que não sai de nada público: deduzir o segredo exige quebrar SHA-256 ou testar 2²⁵⁶ valores (FR-13).
- Given `deriveKeysFromCode`, when comparo os rótulos, then nenhum `salt` ou `info` do Grupo forte é igual aos do Grupo antigo, e as chaves derivadas diferem.
- Given `npx vitest run`, when os testes novos rodam, then passam sem `react-native` e sem mock de `expo`; `npx tsc --noEmit` e `npx eslint .` ficam com 0 erros.

## Riscos e notas para a implementação

- **R-1, vazamento por log ou erro.** O segredo é tudo: quem tem o texto lê o grupo inteiro, inclusive o histórico. O módulo não loga; quem chama (4.3 a 4.5) também não pode (nada de `console.log(keys)` ao depurar). Os testes do 4.1-6 vigiam o módulo; o resto é revisão de código nas próximas stories.
- **R-2, `getRandomValues` no Hermes.** O nativo depende do `cryptoPolyfill` (`expo-crypto`) carregado antes de qualquer uso; `app/_layout.tsx` o importa na primeira linha. Se um caminho gerar o segredo antes disso (não deveria: só a tela de sync gera), `randomBytes` lança erro em vez de devolver bytes fracos. Conferir no aparelho na 4.3.
- **R-3, chave do Nostr fora do intervalo.** HKDF devolve 32 bytes; o secp256k1 aceita valores de 1 a n−1. A chance de cair fora é ~2⁻¹²⁸; o laço em `generateGroupSecret` e o erro em `deriveStrongGroupKeys` cobrem, sem caminho alternativo de derivação.
- **R-4, apagar da memória.** JS não garante zerar memória (o texto do segredo vira `string` imutável). Não prometer isso em documentação nem na política; zerar com `fill(0)` só buffers temporários internos, sem mudar o comportamento.
- **R-5, fora do escopo, para `deferred-work.md`.** `getRandomBytes` em `nostrSync.ts:51` cai para `Math.random` sem `crypto` (nonce do XOR do Grupo antigo); `generateGroupCode` usa `Math.random`. Os dois morrem com o Grupo antigo (4.3 deixa de criar código curto; 4.9 corta). Não corrigir na 4.1 (o Never proíbe mexer no Grupo antigo); registrar.
- **R-6, perda do segredo.** O valor do `SecureStore` do Android é cifrado por uma chave do Keystore, que não volta com o backup automático do sistema (conferir na documentação do `expo-secure-store` 15 na 4.3): reinstalar o app ou trocar de celular perde o segredo, e o aparelho precisa parear de novo pelo QR de outro aparelho. Com um só aparelho, os eventos locais continuam, mas o grupo nos relays fica órfão. É assunto da UI da 4.3 (avisar e oferecer "criar novo grupo"); a 4.1 não guarda nada.
- **R-7, ataque a muitos grupos de uma vez.** Quem coleta milhares de chaves públicas dos relays pode testar cada palpite contra todas. Com 256 bits isso continua fora de alcance; com 128 bits (D-1 a) cai para ~2¹¹⁸ para mil grupos, ainda fora de alcance, mas com menos margem.
- **R-8, o histórico em XOR.** Nada na 4.1 protege o que já foi publicado no Grupo antigo (addendum §H); continua risco residual, registrado na 4.9.

## Spec Change Log

## Verification

**Comandos (local)**
- `npx vitest run src/modules/__tests__/groupSecret.test.ts src/modules/__tests__/base32.test.ts`: todos passam.
- `npx vitest run`: 0 falhas (baseline da `dev` sem falhas).
- `npx tsc --noEmit`: 0 erros (sem `expo-env.d.ts`).
- `npx eslint .`: 0 erros.
- `git diff d9886b7 -- src/modules/nostrSync.ts src/context app packages vitest.config.ts package.json package-lock.json replit.md replit.nix .replit`: vazio.
- `grep -n "console\.\|Math.random" src/modules/strongGroup/*.ts`: nada.

**Revisão manual**
- Nenhum valor de segredo real em teste, fixture ou commit; os vetores usam bytes de padrão.
- Os rótulos `salt`/`info` da tabela de Derivação estão no código exatamente como na spec (eles são parte do formato: mudar depois quebra o pareamento entre versões).
