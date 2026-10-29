<!-- bmad:context -->
<!-- Verified 2026-10-29 against d2e688d. Managed by bmad-project-context; edits inside this block are replaced on refresh. Keep anything you want preserved outside the markers. -->

## DOMUS

App Android de finanças pessoais com gamificação (XP, streaks, arquétipos). Expo SDK 54, React Native 0.81, TypeScript strict, Expo Router, pnpm local. Planejamento em `ROADMAP.md`, migrando para `_bmad-output/planning-artifacts/`; histórico em `docs/history/`.

## Policy

- Nunca altere `packages/sync` — WebRTC legado, fora da UI. O sync ativo está em `src/modules/nostrSync.ts`.
- Nunca altere `replit.md`, `replit.nix` nem `.replit` — o Replit pode voltar.
- Nunca edite `ios/` nem `android/` — gerados por `npx expo prebuild --clean`; mudança nativa vai em `plugins/` ou `patches/`.

## Where things are

- Lógica de domínio em `packages/*` (testes em `packages/*/__tests__`); UI em `app/` e `src/`.
- Estado global: `AppStateProvider` / `useAppState()` em `src/context/AppStateProvider.tsx`.
- `server/` só serve build estático e landing page; `server/syncRoutes.ts` não é registrado em `server/routes.ts`.

## Running and verifying

- Não há script `test` nem `typecheck` no `package.json`: use `npx vitest run` e `npx tsc --noEmit`. Os dois passam limpos no `dev` (vitest sem falhas, tsc com 0 erros): qualquer falha nova é da sua mudança. O workflow `Gate` (`.github/workflows/gate.yml`) roda `npx eslint .`, `npx vitest run` e `npx tsc --noEmit` em todo PR e em push na `dev`/`main`, e o `build-android.yml` e o `build-ios.yml` só buildam com ele verde.
- `npm run android` tem `JAVA_HOME` de Windows fixo; no Mac use `npx expo run:android` (não verificado).
- Local usa pnpm, mas a CI do GitHub roda `npm ci` com o Node de `.nvmrc` (repetido nos perfis do `eas.json`) e `package-lock.json` (não há `pnpm-lock.yaml`): dependência nova também precisa atualizar `package-lock.json`. O `.gitlab-ci.yml` (legado) segue no Node 20.

## Conventions that differ from defaults

- Telas despacham eventos; nunca mutam estado. O estado é reconstruído por replay do `EventStore` — nunca persista estado derivado.
- Texto de UI em pt-BR com acentos completos.
- Nunca use o alerta nativo (`Alert.alert`, `window.alert`, `window.confirm`): use `appAlert`/`appConfirm` (`src/services/appAlert.ts`), que mostram o alerta customizado do app.

## Known pitfalls

- `vi.mock("react-native")` não funciona no vitest (o `react-native` real é carregado e quebra no parse). Para testar, use `process.env.EXPO_OS` no lugar de `Platform.OS` ou extraia a lógica para um módulo sem `react-native`.
- Nunca use Views maiores que a tela com animação (ex.: 30000px) — crasha GPU Mali no Android; use `absoluteFillObject`. Detalhes em `docs/tour-crash-fixes.md`.
- O sync Nostr cifra com XOR (`xorEncryptDecrypt` em `src/modules/nostrSync.ts`), não com AES; não trate como criptografia forte.
- `npx expo start` gera `expo-env.d.ts` (ignorado pelo git), e com ele o `tsc --noEmit` passa a acusar 5 erros dentro de `node_modules` (`react-native-gifted-chat`, `react-native-zoom-reanimated`). Não são do código: apague o arquivo antes de rodar o `tsc`.

<!-- /bmad:context -->
