---
title: 'Story 1.1: Consolidar as correções de segredo na dev'
type: 'chore'
created: '2026-10-15'
status: 'done'
baseline_commit: 'cc645149b4cf0fa5d5fbe15b2058a8f56b8b9614'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-1-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** As correções de segredo (group code no SecureStore, Drive sem `client_secret`, `webSecrets`, regra de ESLint, workflows sem o segredo) estão num único commit (`12a3223`) na branch `chore/seguranca-e-bmad`. A `dev` ainda embute `EXPO_PUBLIC_GOOGLE_CLIENT_SECRET` no código e nos workflows, e o epic 1 (Play até 25/10/2026) depende dessas correções.

**Approach:** Levar só essas correções para a `dev`, em commits separados por tema, e abrir PR. O trabalho é de controle de versão: nenhuma linha de código de produto muda.

**Decisões do dono:** (1) branch nova com o diff dos 14 arquivos de `12a3223` dividido em commits por tema; a `chore/seguranca-e-bmad` e o histórico publicado não são alterados. (2) A branch nova parte de `origin/dev`; o bump 1.8.0 (`b2a2c4c`) fica fora da PR. (3) Eu publico a branch nova (`git push`) e abro a PR para a `dev` com `gh pr create`; o merge é do dono.

## Boundaries & Constraints

**Always:** manter o diff de código idêntico ao de `12a3223` (14 arquivos); não tocar `packages/sync`, `replit.*`, `ios/`, `android/`; mensagens de commit seguem Conventional Commits.

**Never:** reescrever histórico já publicado (`origin/chore/seguranca-e-bmad`); mesclar a PR; revogar o segredo (Story 1.8); incluir arquivos do BMAD, `.agent/` ou `.agents/` na PR.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Integrado | PR de segurança aplicada sobre a base da `dev` | `git grep CLIENT_SECRET` vazio; `npx vitest run` com só as 25 falhas pré-existentes; `npx expo lint` sem erro de `EXPO_PUBLIC_*` | N/A |
| Regressão | Qualquer teste novo falhando ou `CLIENT_SECRET` ainda presente | PR não é aberta | Parar e reportar o arquivo |

</frozen-after-approval>

## Code Map

- `.github/workflows/build-android.yml`, `build-ios.yml` -- remover `EXPO_PUBLIC_GOOGLE_CLIENT_SECRET` (6 ocorrências na `dev`)
- `src/hooks/useGoogleDriveBackup.ts`, `src/modules/backup/infrastructure/GoogleDriveService.ts` -- tiram o `client_secret`; usam `GoogleNativeAuth`
- `src/modules/backup/infrastructure/{GoogleNativeAuth,driveTokens}.ts` + `__tests__/driveTokens.test.ts` -- novo caminho de token no nativo
- `src/context/{syncStorage,useSyncEngine}.ts` + `__tests__/syncStorage.test.ts` -- group code no `SecureStore` com migração
- `src/modules/security/infrastructure/{webSecrets,webSecretStore}.ts` + `__tests__/webSecretStore.test.ts` -- segredos cifrados na web
- `eslint.config.js` -- regra contra `EXPO_PUBLIC_*(SECRET|PRIVATE|PASSWORD)`

## Tasks & Acceptance

**Execution:**
- [x] criar branch a partir da base escolhida (Q1/Q2) -- isola o diff de segurança
- [x] restaurar os 14 arquivos de `12a3223` e commitar por tema -- AC: commits separados
- [x] `npx vitest run`, `npx expo lint`, `git grep CLIENT_SECRET` -- provar as três ACs na branch nova
- [ ] publicar conforme Q3 -- push e PR só com confirmação

**Acceptance Criteria:**
- Given as mudanças em commits separados por tema, when a PR é integrada na `dev`, then `npx vitest run` mostra só as 25 falhas pré-existentes (6 arquivos), nenhuma nova.
- Given a PR integrada, when rodo `git grep CLIENT_SECRET`, then nada é retornado.
- Given a PR integrada, when rodo `npx expo lint`, then não há erro da regra de `EXPO_PUBLIC_*`.

## Implementation Notes

- Trabalhar no git worktree `/Users/epj/Documents/Code/outros/DOMUS-fix-segredos` (branch `fix/seguranca-segredos-dev`, base `origin/dev`, sem upstream; `node_modules` é symlink excluído do git). Não trocar a branch do checkout principal.
- Sem push e sem PR nesta etapa: só commits locais. Publicação é feita depois, pelo fluxo principal.
- Fonte do diff: `git diff cc64514 12a3223` (14 arquivos). Um commit por tema, com `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>` e `Claude-Session: https://claude.ai/code/session_01Uh4mHTXHGNTysswjGRf5QF` ao final da mensagem.

## Spec Change Log

## Review Triage Log

| Achado | Veredito | Evidência |
|---|---|---|
| B1 web perde refresh | false | Em `cc64514` a web já era fluxo implícito com `refreshToken: ""` (`useGoogleDriveBackup.ts:117`); comportamento igual, sem regressão. |
| B2/E18 usuário legado (refreshToken, sem `native`) | medium | `isDriveConnected` é true, mas a renovação agora depende de sessão Google (`getNativeAccessToken`); sem sessão devolve null e o backup falha sem pedir reconexão. Conhecido no spine (Deferred) e na Story 8.9. |
| B3 rotação do segredo / refs em `.env.example` | false | Rotação é Story 1.8 (e `Never` deste spec); `git grep CLIENT_SECRET` vazio no worktree, sem referência obsoleta. |
| B4/E17 ESLint contorna por desestruturação, sem teste | low | Real (seletor só cobre `X.env.NOME`), mas é guarda-corpo e o uso é improvável; correção exige seletores e teste. Coberto pelas Stories 2.8 e 6.5. |
| B5/E1 `require` em `getGoogleSignIn` pode lançar dentro do `catch` do `connect` | low | Real só se o módulo nativo faltar (Expo Go); `finally` ainda roda. Fora da intenção (código congelado). |
| B6 `response.type` exige API v13+ | false | `package.json` pina `@react-native-google-signin/google-signin ^16.1.2`. |
| B7/E2 TTL de 30 min e sem retry em 401 | low | Só falha se o Play Services devolver token com <30 min de vida; `clearCachedAccessToken(stale)` já força token novo na expiração. Correção adiciona lógica de retry. |
| B7 token web marcado `native` | false | `provider` é null na web (`GoogleDriveService`); só o nativo chega a `native: true`. |
| B8 `refreshAccessToken` referenciado em outro lugar | false | `grep` em `src`, `app`, `packages`: nenhuma referência de código; só `docs/roadmap/06-fix-google-drive.md`. |
| B9/E11 `keyPromise` guarda `null` para sempre após falha transitória | medium | Confirmado em `webSecretStore.ts` (`keyPromise ??=` cacheia o null): a sessão inteira fica só em memória. |
| B9/E12 `set()` sem chave apaga o texto cifrado já gravado | medium | Confirmado: ramo `!cryptoKey` chama `storage.removeItem(key)`; falha transitória de IndexedDB seguida de `set` perde o group code ou os tokens ao recarregar. |
| B9/E13 duas abas geram chaves diferentes | low | Real em teoria (`load`/`save` sem checagem após salvar); exige duas abas abrindo juntas sem cofre. |
| B10 IndexedDB abre conexão a cada `load`/`save` | false | `keyPromise` roda `load`/`save` uma vez por sessão: no máximo 2 aberturas. |
| B10 despejo do IndexedDB (Safari) deixa segredo ilegível | maybe-false | Precisaria confirmar se o navegador despeja IndexedDB sem despejar o storage dos segredos; hoje retorna null sem aviso. |
| B11/E8 `removeItem` lança após `setItemAsync` ok e cai no `AsyncStorage` em texto puro | low | Real (`saveGroupCode`), mas exige `AsyncStorage.removeItem` falhar. Queda para `AsyncStorage` é dívida documentada no AD-6; Story 6.3 a remove. |
| B11/E9/E16/V7 `webSecrets.set` devolve false e o resultado é ignorado | medium | Confirmado em `saveGroupCode` (web) e em `secureSet` do Drive: sem WebCrypto/IndexedDB o segredo some ao recarregar, sem aviso. |
| B11 `console.warn(err)` pode vazar detalhes | false | `err` é o erro do SecureStore; o código não está nele. |
| B11 `loadGroupCode` nativo nunca migra formato web | false | O formato web só existe na web. |
| B12 testes só com mocks; `EXPO_OS` não restaurado; teste não isola a migração | low | Higiene de teste; vitest isola por arquivo. Correção maior que correção direta. |
| E3 conectado com token nulo (web) | false | Igual a B1: `isDriveConnected` já exclui token web sem refresh por projeto (comentário em `driveTokens.ts`). |
| E4 sessão nativa expirada não sinaliza reconexão | medium | `getValidAccessToken` devolve null e não marca reconexão; mesma raiz de B2. |
| E5 `getGoogleSignIn()` null: botão não faz nada | low | `connectNative` retorna sem mensagem; só ocorre sem o módulo nativo. Mesma raiz de B5. |
| E6 `accessToken` vazio / `response.type` indefinido | low | `getTokens()` lança sem token e a v16 sempre devolve `type`; improvável. |
| E7 `AsyncStorage.getItem` sem try em `loadGroupCode` | low | Pré-existente: o código antigo chamava `AsyncStorage.getItem` direto; rejeição rara. |
| E10 `deleteItemAsync` falha e o código volta no boot | low | Real, rara: `clearGroupCode` engole o erro, e o aparelho continuaria no grupo após sair. |
| E14 cache em memória não vê limpeza de outra aba | low | Segredo segue servido até recarregar; correção exige validar contra o storage. |
| E15 texto cifrado ilegível permanece | low | Fica retornando null; sem dano além de não reconectar sozinho. |
| E19 doc `06-fix-google-drive.md` cita `refreshAccessToken` | false | É diagnóstico histórico do fluxo antigo; a referência descreve o que acontecia e não induz erro. |
| E20/claims 'nenhuma linha de código de produto muda' | false | A correção seria editar o spec desta build, o que a triagem rejeita; a frase significa 'sem código novo além de `12a3223`'. |
| E21 `git grep CLIENT_SECRET` pega `.claude/skills` | false | No worktree (base `origin/dev`) `git grep` devolve 0 linhas; esses arquivos não existem lá. |
| V1 `useSyncEngine` sem teste das funções de group code | medium | Nenhum teste importa o hook; só `syncStorage.test.ts` cobre os helpers. `react-native` quebra o vitest. |
| V2 CI não roda lint nem vitest; regra sem teste | medium | `build-android.yml` e `build-ios.yml` não têm passo de lint/teste; já planejado na Story 2.8 (FR-21). |
| V3 fiação nativa de `GoogleDriveService` sem teste | medium | Nenhum teste importa `GoogleDriveService`/`GoogleNativeAuth`; só `driveTokens` (puro) é coberto. Validação real é a Story 1.7. |
| V4 cofre IndexedDB real sem teste | low | `webSecrets.ts` não é importado por nenhum teste; exigiria `fake-indexeddb` e atualização do `package-lock.json`. |

**Rota:** nenhum `intent_gap`, `bad_spec` nem `patch`. Os reais (`medium`/`low` com dano) foram adiados (`defer`) porque a intenção congela o código em `12a3223`; ver `deferred-work.md` (D1 a D5). Os demais foram rejeitados como `false` ou `low` improvável. Sem loopback (`review_loop_iteration` = 0).

## Verification

**Commands:**
- `git grep -n "CLIENT_SECRET\|GOCSPX" -- . ':(exclude)_bmad-output'` -- expected: sem saída
- `npx vitest run` -- expected: 25 failed | 598+ passed, 6 arquivos falhando (baseline)
- `npx expo lint 2>&1 | grep -c EXPO_PUBLIC` -- expected: 0
