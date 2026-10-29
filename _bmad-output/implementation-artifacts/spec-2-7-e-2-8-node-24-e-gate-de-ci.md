---
title: 'Stories 2.7 e 2.8: Node 24 nos workflows e gate de lint e testes na CI'
type: 'chore'
created: '2026-10-29'
status: 'in-progress'
baseline_commit: 'ec1e0fa'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/planning-artifacts/epics.md'
  - '{project-root}/_bmad-output/implementation-artifacts/spec-2-1-a-2-4-suite-de-testes-sem-falhas.md'
  - '{project-root}/_bmad-output/implementation-artifacts/spec-2-5-e-2-6-lint-sem-erros.md'
  - '{project-root}/_bmad-output/implementation-artifacts/deferred-work.md'
  - '{project-root}/AGENTS.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Os dois workflows do GitHub Actions (`build-android.yml`, com os jobs `Build Release APK` e `Build Web`, e `build-ios.yml`) usam `node-version: 20`. O Node 20 saiu de suporte em abril de 2026, e o próprio runner já avisa ("Node.js 20 is deprecated … forced to run on Node.js 24", anotação do run `40756747038`, 28/10). Não há `.nvmrc`, `engines` em `package.json` nem `node` nos perfis do `eas.json`: cada lugar usa o Node que tiver. E nenhum workflow roda lint ou testes (`deferred-work.md` D4 e D27): a suíte (99 arquivos, 2190 testes), o `tsc` e o lint, zerados hoje pelas Stories 2.1 a 2.6, só são conferidos à mão, e um disparo manual do `build-android.yml` publica uma pré-release mesmo com teste quebrado.

**Approach:** Uma versão do Node declarada num lugar só (`.nvmrc`), lida pelo `actions/setup-node` (`node-version-file`) em todos os jobs e repetida no `eas.json` e no `engines`, com um teste que acusa divergência. Um workflow novo, `.github/workflows/gate.yml`, roda `npm ci`, o lint e o `vitest` (e o `tsc`, conforme D-2) em todo PR e em todo push na `dev` e na `main`, e falha se qualquer passo falhar. O `.gitlab-ci.yml` não muda.

## Boundaries & Constraints

**Always:**
- O Node do CI, do EAS e do desenvolvimento vem de `.nvmrc`; nenhum workflow do GitHub fixa `node-version:` à mão.
- A CI continua com `npm ci` e `package-lock.json` (AGENTS.md). A troca do Node não pode reescrever o `package-lock.json` (conferido: `npm ci` com Node 24.22.2 e npm 11.21.1 não altera nenhum arquivo versionado).
- O gate não usa secrets nem escreve no repositório (`permissions: contents: read`), para rodar igual em PR de fork (o repositório é público). Usa `pull_request`, nunca `pull_request_target`.
- O gate termina verde na `dev` atual antes de entrar como barreira.
- O `patch-package` do `postinstall` continua aplicando os 5 patches (`expo-asset`, `expo-audio`, `react-native-gifted-chat`, `react-native-keyboard-controller`, `rn-tourguide`).
- Mensagens e nomes de passo novos em pt-BR com acentos, como os atuais.

**Never:**
- Alterar `.gitlab-ci.yml` (legado), `packages/sync`, `replit.md`, `replit.nix`, `.replit`, `ios/` ou `android/`.
- Mudar a lógica de assinatura do `build-android.yml` (`HAS_KEYSTORE`, `Check signing secrets`, `Configure signing`, `Verify APK certificate`), os gatilhos dele (push na `main`, tags `v*.*.*`, `workflow_dispatch`) ou a publicação da pré-release no disparo manual.
- Trocar de gerenciador de pacotes, criar `pnpm-lock.yaml` ou `yarn.lock`, ou atualizar dependência junto (nenhuma precisa: ver Auditoria).
- Fazer avisos de lint barrarem (`--max-warnings`): só erro barra.

## I/O & Edge-Case Matrix

| Cenário | Antes (`ec1e0fa`) | Depois |
|---|---|---|
| PR para `dev` ou `main` com teste quebrado | nada roda; o PR pode ser integrado | o check `Gate` fica vermelho no PR |
| Push direto na `dev` com erro de lint | nada roda | o `Gate` do push fica vermelho (aviso por e-mail do GitHub); não desfaz o push (D-3) |
| Disparo manual do `build-android.yml` com teste quebrado | gera APK/AAB e publica a pré-release `pre-<sha>` | depende de D-3: com (b), o build nem começa |
| PR de fork | nada roda | o `Gate` roda sem secrets e passa ou falha igual |
| Dois pushes seguidos na mesma branch | — | o `Gate` do push anterior é cancelado (`concurrency`) |
| Só avisos de lint (hoje: 8 no `expo lint`, 12 no `eslint .`) | — | o `Gate` passa |
| Build EAS (`development`, `preview`, `production`) | Node padrão da imagem `latest` | Node da versão de `.nvmrc` (`"node"` em cada perfil) |
| `.nvmrc`, `eas.json` e `engines` divergentes | não existe a declaração | `npx vitest run` falha no teste de versão do Node |
| `.gitlab-ci.yml` | `NODE_VERSION: "20"` | igual |

</frozen-after-approval>

## Auditoria (baseline `ec1e0fa`, 29/10/2026)

**Workflows.** Só dois arquivos em `.github/workflows/`:
- `build-android.yml` ("Build Android & Web"): gatilhos push na `main`, tags `v*.*.*` e `workflow_dispatch`; `permissions: contents: write`. Job `build-android` (60 min; `HAS_KEYSTORE` no `env` do job; prebuild + Gradle; publica pré-release `pre-<sha>` com `softprops/action-gh-release@v2` no push da `main` **ou em qualquer disparo manual**) e job `build-web` (`expo export --platform web`). Os dois com `actions/setup-node@v4`, `node-version: 20`, `cache: npm`, `npm ci`. Último run: disparo manual na `dev` em 28/10 (`40756747038`, `b4ecf1b`), verde, 21 min; `npm ci` levou ~28 s no Android e ~27 s no Web.
- `build-ios.yml`: gatilhos tags `v*` e `workflow_dispatch`, `macos-latest`, mesmo `setup-node` com Node 20. **Nunca rodou de verdade desde março:** os 5 últimos runs (até v1.6.0, 18/03) falharam em segundos com "The job was not started because recent account payments have failed or your spending limit needs to be increased". Ver R-2.
- Anotação nos runs atuais: `actions/checkout@v4`, `actions/setup-node@v4` e `actions/upload-artifact@v4` são de runtime Node 20 e o runner já os força para Node 24; e `ubuntu-latest` migra para Ubuntu 26 a partir de 19/10/2026.

**Outros lugares com versão de Node.**
- `.gitlab-ci.yml`: `NODE_VERSION: "20"`, imagem `node:20`. Fica como está.
- `eas.json`: perfis `development`, `preview` e `production` com `image: "latest"` e sem `node`. Nenhum workflow chama o EAS (não há `EXPO_TOKEN` nem `eas-cli` nos workflows): build EAS é disparado à mão pelo dono.
- `package.json`: sem `engines`, sem `packageManager`; `postinstall: patch-package`; `lint: npx expo lint`; sem script `test`/`typecheck`.
- Sem `.nvmrc`, `.node-version`, `.npmrc`, `yarn.lock` ou `pnpm-lock.yaml`. **O `yarn.lock` saiu do repositório em `760245d`**: a nota do AGENTS.md "`npm ci` atualiza o `yarn.lock`" está velha (Task 2.8-4).

**Compatibilidade das dependências com Node 24.** `package-lock.json` (v3, 1617 entradas, 850 com `engines.node`): nenhuma faixa exclui 24.11 nem 22.21. Mínimos relevantes: `react-native` 0.81.5, `metro` 0.83.3 e `@react-native/gradle-plugin` pedem `>= 20.19.4`; `vitest` 4.0.18 pede `^20 || ^22 || >=24`; `eslint` 9.39.4 pede `>=21.1.0` na faixa nova.

**Ensaio local com Node 24** (cópia do `HEAD` por `git archive` no scratchpad; Node 24.22.2 por `npx node@24`, npm 11.21.1 por `npx npm@11`; o Node da sessão é 22.22.0 com npm 10.9.4):

| Comando | Resultado | Tempo |
|---|---|---|
| `npm ci` | exit 0; 1454 pacotes; 5 patches aplicados ✔; **nenhum arquivo versionado alterado** | 85 s (sem cache) |
| `npx expo lint` | 0 erros, 8 avisos | 26 s |
| `npx eslint .` | 0 erros, 12 avisos | 30 s |
| `npx vitest run` | 99 arquivos, 2190 testes, 0 falhas | 85 s (4 CPUs) |
| `npx tsc --noEmit` | 0 erros (sem `expo-env.d.ts`: nem `expo lint` nem `vitest` o geram) | 40 s |
| `npx expo export --platform web` | exit 0 | 16 s |
| `npx expo prebuild --platform android --clean --no-install` | exit 0 | 12 s |

O npm 11 avisa "8 packages have install scripts not yet covered by allowScripts" (`esbuild`, `@firebase/util`, `protobufjs`, `tesseract.js`, `unrs-resolver`), mas roda os scripts; é aviso, não erro (R-3). O Gradle e o Xcode não rodam aqui (sem Android SDK nem macOS): só a CI confirma.

**Gate estimado no `ubuntu-latest` (4 vCPU):** setup + `npm ci` com cache ~1 min, lint ~30 s, `vitest` ~1,5–3 min, `tsc` ~40 s. Total ~4–6 min; `timeout-minutes: 20`.

## Padrão proposto

### Story 2.7

1. **`.nvmrc`** (novo): uma linha com a versão (D-1). Formato de versão exata (`24.x.y`), porque o `eas.json` pede versão exata e o teste compara as duas.
2. **Workflows:** em todos os `actions/setup-node` de `build-android.yml` (2 jobs) e `build-ios.yml` (1 job ativo; o bloco comentado `build-ios-signed` também passa a `node-version-file`, para não voltar Node 20 se for descomentado), trocar `node-version: 20` por `node-version-file: .nvmrc`, mantendo `cache: npm`.
3. **Ações com runtime Node 24** (some com a anotação de depreciação): `actions/checkout`, `actions/setup-node`, `actions/upload-artifact`, `actions/cache` e `actions/setup-java` para a primeira versão maior que roda em Node 24 (conferir a tag no Marketplace no dia; não usar `@main`). `android-actions/setup-android@v4` e `softprops/action-gh-release@v2` ficam, salvo se o run apontar aviso. Sem mudar nenhum parâmetro.
4. **`eas.json`:** `"node": "<versão do .nvmrc>"` em `build.development`, `build.preview` e `build.production` (no nível do perfil, vale para Android e iOS).
5. **`package.json`:** `"engines": { "node": "<faixa de D-1>" }`. O npm só avisa (`EBADENGINE`) quando a versão local está fora; conferido também com o pnpm 10.28 local, que não falha. Sem `engine-strict`.
6. **Teste de versão** `scripts/__tests__/nodeVersion.test.ts` (novo, sem `react-native`): lê `.nvmrc`, `eas.json`, `package.json` e os YAMLs de `.github/workflows/` como texto e falha se (a) algum perfil de `eas.json` não tiver `node` igual ao `.nvmrc`, (b) a versão do `.nvmrc` não satisfizer `engines.node` (com o `semver` já instalado), (c) algum workflow do GitHub tiver `node-version:` fixo (linha não comentada) em vez de `node-version-file: .nvmrc`. Não lê `.gitlab-ci.yml`.

### Story 2.8

`.github/workflows/gate.yml` (novo):

```yaml
name: Gate

on:
  pull_request:
  push:
    branches: [dev, main]
  workflow_dispatch:
  workflow_call:        # só com D-3 (b)

permissions:
  contents: read

jobs:
  gate:
    name: Lint e testes
    runs-on: ubuntu-latest
    timeout-minutes: 20
    concurrency:
      group: gate-${{ github.workflow }}-${{ github.ref }}
      cancel-in-progress: true
    steps:
      - uses: actions/checkout@<versão da 2.7>
      - uses: actions/setup-node@<versão da 2.7>
        with:
          node-version-file: .nvmrc
          cache: npm
      - name: Instalar dependências
        run: npm ci
      - name: Lint
        run: <comando de D-2>
      - name: Testes
        run: npx vitest run
      - name: Tipos            # só com D-2 (b) ou (c)
        run: npx tsc --noEmit
```

- **Gatilhos:** `pull_request` sem filtro de branch (todo PR, inclusive de `claude/*` para `dev`); `push` só em `dev` e `main` (push em branch de trabalho já é coberto pelo PR, e evita rodar em dobro); `workflow_dispatch` para rodar à mão em qualquer branch.
- **Cache:** só o do `setup-node` (`~/.npm`, chave pelo `package-lock.json`). Sem cache de `node_modules` (o `npm ci` apaga a pasta) nem do Vitest.
- **Passos em sequência no mesmo job:** o primeiro que falha para o job e o nome do passo diz o que quebrou. Sem matriz de Node.
- **`CI=true`** já vem do runner: o Vitest roda sem watch e o Expo sem prompt.
- **`concurrency` no job** (não no topo) com `github.workflow` na chave: chamado pelo `build-android.yml` (D-3 b), o grupo fica com o nome do workflow que chama e não cancela o `Gate` de um PR da mesma ref.
- **Barreira de integração:** exigir o check `Gate / Lint e testes` antes do merge é configuração do repositório (Settings → Branches → regra para `dev` e `main`), feita pelo dono; a sessão não tem acesso (`branches/dev/protection` devolve 403). Sem a regra, o check só avisa.

## Decisões do dono (aprovadas em 29/10: D-1 b, D-2 b, D-3 b)

- **D-1: versão do Node e faixa do `engines`.**
  - (a) Node 24 em tudo e `engines.node` `">=24 <25"`. Quem rodar `npm ci` com Node 22 (inclusive esta sessão, 22.22.0) vê `EBADENGINE`, sem falhar.
  - (b) `.nvmrc` e `eas.json` com Node 24 exato; `engines.node` `"^22.12.0 || ^24.0.0"` (as duas LTS com correções; o 20 fica de fora). CI e EAS sempre no 24; o desenvolvimento local em 22 segue sem aviso até abril de 2027.
  - (c) Node 22 em tudo (permitido pela story, "24 (ou 22)"). Fim do suporte em abril de 2027: a troca volta em seis meses.

  O ensaio com Node 24 e npm 11 passou em tudo que roda sem Android SDK, sem mudar o lockfile; a (c) não ganha nada. A (b) cumpre o AC (versão declarada nos dois arquivos) sem avisos no dia a dia. **Recomendado: (b).**
- **D-2: o que o gate roda além de `npx vitest run`.**
  - (a) Literal do AC: `npx expo lint`; `tsc` fora.
  - (b) `npx eslint .` (inclui `scripts/` e o resto que a 2.5 configurou; o `expo lint` só olha as pastas do app) e `npx tsc --noEmit`.
  - (c) `npx expo lint` e `npx tsc --noEmit`.

  O AC deixava o `tsc` de fora "até o baseline de tipos ser zerado": está zerado (0 erros no `ec1e0fa`, em Node 22 e 24), e cada mudança que deixar o `tsc` vermelho seria achada só à mão. O custo é ~40 s. O `eslint .` é o superconjunto do `expo lint` (12 contra 8 avisos, os mesmos 0 erros) e protege os scripts de geração dos troféus, que têm testes no gate. **Recomendado: (b).** Em qualquer opção, o `package.json` não ganha scripts `test`/`typecheck`: o gate chama os comandos direto, como o AGENTS.md já ensina.
- **D-3: o build depende do gate?**
  - (a) Não: o `gate.yml` roda sozinho; o disparo manual do `build-android.yml` continua publicando pré-release mesmo com o gate vermelho.
  - (b) O `build-android.yml` ganha um job `gate` (`uses: ./.github/workflows/gate.yml`) e os jobs `build-android` e `build-web` passam a ter `needs: gate`. O build só começa (e a pré-release só sai) com lint e testes verdes; custa ~5 min a mais por build.
  - (c) A (b) e também no `build-ios.yml`.

  O dono integra na `dev` por push direto e dispara o build de lá; sem regra de branch, a única barreira real é o build não publicar código quebrado. O iOS não roda hoje (R-2), então a (c) não protege nada por enquanto. **Recomendado: (b).**

## Code Map

- `.nvmrc` (novo)
- `package.json`: `engines` (só isso; `package-lock.json` muda só no campo `engines` da raiz, por `npm install --package-lock-only`, e entra no mesmo commit)
- `eas.json`: `node` nos três perfis
- `.github/workflows/build-android.yml`: `node-version-file` nos 2 jobs; versões das ações; com D-3 (b), job `gate` e `needs`
- `.github/workflows/build-ios.yml`: `node-version-file` (job ativo e bloco comentado); versões das ações
- `.github/workflows/gate.yml` (novo)
- `scripts/__tests__/nodeVersion.test.ts` (novo)
- `AGENTS.md`: seção "Running and verifying" (Task 2.8-4)
- Sem mudança: `.gitlab-ci.yml`, `patches/`, `eslint.config.js`, `vitest.config.ts`, `tsconfig.json`, código do app

## Tasks & Acceptance

**Execution (2.7):**
- [x] 2.7-1 `.nvmrc`, `engines` e `eas.json` conforme D-1; `package-lock.json` sincronizado só no `engines` da raiz (conferir com `git diff --stat`).
- [x] 2.7-2 `node-version-file: .nvmrc` em todos os `setup-node` do GitHub; versões das ações atualizadas.
- [x] 2.7-3 `scripts/__tests__/nodeVersion.test.ts` com as três regras e sondas (revertidas): perfil do `eas.json` sem `node`; `.nvmrc` fora do `engines`; `node-version: 20` de volta num workflow. Cada sonda falha; `.gitlab-ci.yml` com `NODE_VERSION: "20"` não acusa.
- [x] 2.7-4 Ensaio local com o Node do `.nvmrc` (`npx node@<versão>` + `npx npm@<npm dele>`), numa cópia do `HEAD` como na Auditoria: `npm ci` sem mudar arquivo versionado, lint, `vitest`, `tsc`, `expo export --platform web`, `expo prebuild --platform android --clean --no-install`.

**Execution (2.8):**
- [x] 2.8-1 `gate.yml` conforme o padrão e D-2.
- [x] 2.8-2 Com D-3 (b): job `gate` e `needs: gate` em `build-android.yml`.
- [x] 2.8-3 Rodar localmente, em sequência e com Node do `.nvmrc`, exatamente os passos do gate; todos com exit 0.
- [x] 2.8-4 `AGENTS.md`: tirar "A CI ainda não barra nenhum dos dois (Epic 2)" e a nota do `yarn.lock` (o arquivo não existe desde `760245d`); dizer que o workflow `Gate` roda lint, `vitest` (e `tsc`, se D-2) em PR e push na `dev`/`main`, e que a versão do Node está em `.nvmrc`.
- [x] 2.8-5 `deferred-work.md`: marcar D4 (só a parte "o CI de build não roda lint nem vitest") e D27 como resolvidos pela 2.8.
- [ ] 2.8-6 Depois do push (dono): ver o `Gate` verde no push da `dev` e num PR de teste; disparar o `build-android.yml` na `dev` e ver os dois jobs verdes, sem a anotação de Node 20 (sabendo que o disparo publica uma pré-release `pre-<sha>`, como em 28/10); disparar o `build-ios.yml` (R-2); rodar um build EAS `preview` e conferir no log a versão do Node.
- [ ] 2.8-7 Prova de que o gate barra (dono, num PR descartável a partir da `dev`): um `expect(1).toBe(2)` num teste → `Gate` vermelho no passo "Testes"; um erro de lint (ex.: `no-undef`) → vermelho no passo "Lint". Fechar o PR sem merge.

**Acceptance Criteria:**
- Given os workflows do GitHub Actions, when leio os `setup-node`, then todos usam `node-version-file: .nvmrc` com Node 24, e `.nvmrc`, `engines` e os três perfis do `eas.json` declaram versões coerentes (o teste de versão passa).
- Given o `build-android.yml` disparado na `dev`, when termina, then `Build Release APK` e `Build Web` ficam verdes com `npm ci` em Node 24 e sem anotação de Node 20.
- Given um build EAS `preview` ou `production`, when roda, then o log mostra a versão do `.nvmrc` e o build termina verde.
- Given o `.gitlab-ci.yml`, when comparo com `ec1e0fa`, then não mudou.
- Given um PR ou push na `dev`/`main`, when o `Gate` roda, then ele falha se o lint tiver erro, se algum teste falhar (ou, com D-2 b/c, se o `tsc` acusar erro), e passa com só avisos.
- Given a `dev` atual, when o `Gate` roda, then termina verde.
- Given D-3 (b) e um teste quebrado, when disparo o `build-android.yml`, then o job `gate` falha e nenhum APK, AAB ou pré-release é gerado.

## Riscos e notas para a implementação

- **R-1, verificação só depois do push.** A sessão lê os runs (`gh run list`/`gh run view` funcionam), mas não dispara workflow (o `workflow_dispatch` pelo MCP devolve 403) nem configura regra de branch (403). O que dá para provar antes do push é o ensaio local (2.7-4 e 2.8-3). O verde do Gradle, do Xcode e do EAS é do dono (2.8-6), e a story só fecha com esses runs.
- **R-2, `build-ios.yml` sem execução desde março.** Os runs falham antes de começar por cobrança da conta (minutos de macOS), não por código. O AC da 2.7 pede o iOS verde: se o disparo de 2.8-6 ainda cair na cobrança, registrar como bloqueado por conta (fora do código) e fechar a 2.7 com Android, Web e EAS, com a decisão anotada aqui. O repositório hoje é público; conferir se o bloqueio continua.
- **R-3, npm 11 e `allowScripts`.** O Node 24 traz npm 11; o 11.21.1 só avisa sobre install scripts fora do `allowScripts` e os executa (o `esbuild` e o `patch-package` rodaram). Se uma versão futura do npm bloquear por padrão, o `npm ci` da CI quebra no `esbuild`/`unrs-resolver`. Não configurar `allowScripts` agora; se acontecer, aprovar os 8 pacotes listados no aviso.
- **R-4, `npm ci` muda o lockfile?** Não no ensaio (npm 11.21.1). Se o `npm ci` local com Node 24 mostrar diferença no `package-lock.json`, é o npm local regravando: não commitar, e reabrir.
- **R-5, `expo-env.d.ts`.** Gerado pelo `npx expo start`, faz o `tsc` acusar 5 erros em `node_modules` (AGENTS.md). Na CI ninguém roda `expo start` e o ensaio confirmou que `expo lint`, `vitest`, `expo export` e `prebuild` não o criam. Se o `tsc` do gate ficar vermelho com esses 5 erros, procurar quem gerou o arquivo antes de mexer no gate.
- **R-6, tempo do `vitest` no runner.** 85 s com 4 CPUs locais; os testes de troféus/Lottie leem centenas de JSON. Se o passo passar de ~5 min, olhar o relatório antes de paralelizar ou dividir.
- **R-7, Ubuntu 26.** O `ubuntu-latest` migra a partir de 19/10/2026. Não fixar `ubuntu-24.04` nesta story; se o run quebrar por imagem (ex.: pacote do `Free disk space` ausente), tratar à parte.
- **R-8, `pull_request` em push de branch com PR aberto.** Push na `dev` com PR da `dev` para a `main` aberto roda o `Gate` duas vezes (push e PR). Aceito: são ~5 min e o repositório é público.

## Spec Change Log

## Verification

**Comandos (local, Node do `.nvmrc`, numa cópia limpa do `HEAD`)**
- `npm ci`: exit 0, 5 patches ✔, `git status` limpo.
- `npx expo lint` / `npx eslint .` (conforme D-2): 0 erros.
- `npx vitest run`: 100 arquivos (99 + `nodeVersion.test.ts`), 0 falhas.
- `npx tsc --noEmit`: 0 erros.
- `npx expo export --platform web` e `npx expo prebuild --platform android --clean --no-install`: exit 0.
- Sondas do teste de versão (2.7-3), revertidas.
- `git diff ec1e0fa -- .gitlab-ci.yml packages/sync ios android replit.md replit.nix .replit`: vazio.

**GitHub (dono, depois do push)**
1. `Gate` verde no push da `dev`; o check aparece num PR.
2. PR descartável com teste quebrado e com erro de lint: `Gate` vermelho no passo certo (2.8-7).
3. `Build Android & Web` disparado na `dev`: os dois jobs (e o `gate`, com D-3 b) verdes; log do `setup-node` mostra a versão do `.nvmrc`; sem anotação "Node.js 20 is deprecated".
4. `Build iOS` disparado: verde, ou bloqueado por cobrança (R-2), anotado.
5. Build EAS `preview`: o log mostra a versão do `.nvmrc`; termina verde.
6. Regra de branch exigindo `Gate / Lint e testes` em `dev` e `main` (opcional, do dono).

## Implementation Notes

**Arquivos (sem commit):**
- `.nvmrc` (novo): `24.22.2` (LTS "Krypton", 27/10/2026, conferido em `nodejs.org/dist/index.json`; traz npm 11.19.1).
- `package.json`: `"engines": { "node": "^22.12.0 || ^24.0.0" }` (D-1 b). `package-lock.json`: só o `engines` da raiz (`npm install --package-lock-only --ignore-scripts`, 3 linhas).
- `eas.json`: `"node": "24.22.2"` em `development`, `preview` e `production`.
- `.github/workflows/gate.yml` (novo): conforme o padrão, com D-2 (b): passos `Instalar dependências` → `Lint` (`npx eslint .`) → `Testes` (`npx vitest run`) → `Tipos` (`npx tsc --noEmit`).
- `.github/workflows/build-android.yml`: job `gate` (`uses: ./.github/workflows/gate.yml`, nome `Gate`) e `needs: gate` em `build-android` e `build-web` (D-3 b); `node-version-file: .nvmrc` nos 2 jobs; versões das ações. Assinatura, gatilhos e publicação da pré-release sem mudança.
- `.github/workflows/build-ios.yml`: `node-version-file: .nvmrc` (job ativo e bloco comentado) e versões das ações; sem gate (D-3 b).
- `scripts/__tests__/nodeVersion.test.ts` (novo; já entra no `vitest run`, que não tem `include` restrito): 6 testes; as três regras e casos do próprio verificador de workflow (linha comentada e formato do `.gitlab-ci.yml` não acusam).
- `AGENTS.md` (Task 2.8-4) e `deferred-work.md` (D4 resolvido em parte, D27 resolvido).

**Versões das ações** (primeira maior com `runs.using: node24`, lida no `action.yml` de cada tag maior em 29/10): `actions/checkout@v5`, `actions/setup-node@v5`, `actions/upload-artifact@v6` (a v5 ainda é node20), `actions/cache@v5`, `actions/setup-java@v5`. `android-actions/setup-android@v4` já é node24 e fica.

**Decisões além da spec:**
- `softprops/action-gh-release@v2` → `@v3`. A v2 está congelada na 2.6.2 com `runs.using: node20` (daria a anotação de Node 20 no passo de publicação); a 3.0.0 só troca o runtime para Node 24 (CHANGELOG), sem mudar entradas. A spec mandava manter "salvo se o run apontar aviso": o aviso é certo pelo `action.yml`, então foi trocado já.
- O teste lê o `semver` 6.3.1 (dependência transitiva, já no topo de `node_modules`) por `require`, com tipo mínimo declarado no teste: não há `@types/semver` e a spec proíbe dependência nova.
- O teste também confere que o `.nvmrc` é versão exata da linha 24 e que o número de `actions/setup-node` ativos é igual ao de `node-version-file: .nvmrc` (pega um `setup-node` sem versão nenhuma, que cairia no Node do runner).
- O ensaio com Node 24 usou o tarball oficial `node-v24.22.2-linux-x64.tar.xz` (sha256 conferido com `SHASUMS256.txt`) e o npm 11.19.1 que vem com ele, não `npx node@24`/`npx npm@11`.

**Verificação local (29/10):**
- Node 22.22.0 da sessão, no repositório: `npx vitest run` 100 arquivos / 2196 testes, 0 falhas (95 s); `npx tsc --noEmit` exit 0; `npx eslint .` 0 erros, 12 avisos.
- Node 24.22.2 + npm 11.19.1, cópia limpa da árvore de trabalho (`git archive` de uma `write-tree` com índice temporário) no scratchpad, `CI=true`, passos do gate em sequência: `npm ci` exit 0 (1454 pacotes, 5 patches ✔, aviso `allowScripts` do R-3, `git status` limpo); `npx eslint .` 0 erros, 12 avisos (38 s); `npx vitest run` 100/2196, 0 falhas (86 s); `npx tsc --noEmit` exit 0 (32 s). Também `npx expo export --platform web` e `npx expo prebuild --platform android --clean --no-install`: exit 0; nenhum gerou `expo-env.d.ts`.
- Sondas do teste de versão (todas revertidas): `preview` sem `node` → falha a regra do `eas.json`; `engines` `^22.12.0` → falha só a regra do `engines`; `.nvmrc` 20.19.0 e 26.0.0 → falham `.nvmrc`/`eas.json`/`engines`; `node-version: 20` de volta no `build-web` → falha a regra dos workflows. O `.gitlab-ci.yml` (`NODE_VERSION: "20"`) não é lido nem acusado.
- YAML: os 3 workflows abrem no PyYAML; `actionlint` 1.7.12 (instalado por `go install` no scratchpad, sem shellcheck) sem achados.
- `git diff ec1e0fa -- .gitlab-ci.yml packages/sync ios android replit.md replit.nix .replit`: vazio.

**Checklist do dono depois do push (2.8-6, 2.8-7 e Verification):**
1. `Gate` verde no push da `dev` (Actions → Gate); abrir um PR e ver o check `Gate / Lint e testes`.
2. Disparar `Build Android & Web` na `dev`: `Gate`, `Build Release APK` e `Build Web` verdes; log do `Setup Node.js` com `v24.22.2`; sem anotação "Node.js 20 is deprecated". Lembrar que o disparo publica a pré-release `pre-<sha>`.
3. Disparar `Build iOS` (R-2): verde ou bloqueado por cobrança, anotar.
4. Build EAS `preview`: log com Node 24.22.2 e build verde.
5. PR descartável a partir da `dev`: `expect(1).toBe(2)` num teste → vermelho em "Testes"; um `no-undef` → vermelho em "Lint". Fechar sem merge.
6. (Opcional) Regra de branch exigindo `Gate / Lint e testes` em `dev` e `main`.

