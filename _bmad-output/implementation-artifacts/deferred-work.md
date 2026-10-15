- source_spec: `_bmad-output/implementation-artifacts/spec-1-1-consolidar-correcoes-de-segredo-na-dev.md`
  summary: D1 — Robustez do `webSecretStore` e dos chamadores: `keyPromise` guarda null para sempre; `set()` sem chave apaga o texto cifrado já gravado; `webSecrets.set` devolve false e `saveGroupCode`/`secureSet` ignoram.
  evidence: confirmado em `src/modules/security/infrastructure/webSecretStore.ts` (`keyPromise ??=` e ramo `!cryptoKey` com `removeItem`). Falha transitória de IndexedDB pode perder o group code ou os tokens do Drive na web sem aviso. Resolver junto da Story 6.3 (aviso de queda) ou 6.4 (log da web).
- source_spec: `_bmad-output/implementation-artifacts/spec-1-1-consolidar-correcoes-de-segredo-na-dev.md`
  summary: D2 — Usuário legado do Drive (refreshToken, sem `native`) e falhas silenciosas na conexão: sem sessão Google o token vem null, o backup falha sem pedir reconexão; `connectNative` retorna mudo sem módulo; `require` pode lançar dentro do `catch` do `connect`.
  evidence: `driveTokens.ts` (`isDriveConnected`), `GoogleNativeAuth.ts` (`getGoogleSignIn` sem try), `useGoogleDriveBackup.ts` (`connectNative`/`connect`). Já listado no Deferred do spine ("reconectar o Drive uma vez"). Validar em Android real na Story 1.7; mensagem de reconexão na Story 8.9.
- source_spec: `_bmad-output/implementation-artifacts/spec-1-1-consolidar-correcoes-de-segredo-na-dev.md`
  summary: D3 — Bordas de `syncStorage`: queda para `AsyncStorage` em texto puro quando `removeItem` lança depois de `setItemAsync` ok; `loadGroupCode` sem try no `AsyncStorage.getItem`; `clearGroupCode` engole falha do `deleteItemAsync`.
  evidence: `src/context/syncStorage.ts` (`saveGroupCode`, `loadGroupCode`, `clearGroupCode`). Raras, mas deixam o group code em texto puro ou o aparelho no grupo. Resolver na Story 6.3.
- source_spec: `_bmad-output/implementation-artifacts/spec-1-1-consolidar-correcoes-de-segredo-na-dev.md`
  summary: D4 — Guarda-corpos sem verificação automática: o CI de build não roda lint nem vitest, e a regra de ESLint contra `EXPO_PUBLIC_*` não tem teste nem cobre desestruturação e nomes `TOKEN`/`KEY`.
  evidence: `.github/workflows/build-android.yml` e `build-ios.yml` sem passo de lint/teste; `eslint.config.js` cobre só `X.env.NOME`. Cobrir na Story 2.8 (gate de CI) e na 6.5 (teste de segredo em `AsyncStorage`).
- source_spec: `_bmad-output/implementation-artifacts/spec-1-1-consolidar-correcoes-de-segredo-na-dev.md`
  summary: D5 — Superfícies sem teste: `useSyncEngine` (group code), fiação nativa de `GoogleDriveService`/`GoogleNativeAuth` e cofre IndexedDB real.
  evidence: nenhum teste importa esses módulos; `react-native` quebra o vitest (AGENTS.md). Extrair a escolha de provedor para função pura, como em `driveTokens`; testar o cofre exige `fake-indexeddb` e atualizar `package-lock.json` para a CI.
