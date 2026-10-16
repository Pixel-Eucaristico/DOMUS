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
- source_spec: `_bmad-output/implementation-artifacts/spec-1-2-mirar-a-api-36-no-build-de-release.md`
  summary: D6 — Comportamentos do Android 16 com target 36 sem verificação: predictive back ligado por padrão (e `onBackPressed` legado deixa de ser chamado), edge-to-edge obrigatório e redimensionamento em telas grandes; rever também a armadilha de View grande com animação (Mali, `docs/tour-crash-fixes.md`).
  evidence: efeitos de runtime que o `expo prebuild` e o `tsc` não pegam; a revisão da Story 1.2 só os apontou. Incluir cada item na checklist da Story 1.3 e testar o botão/gesto de voltar nas abas, no modal de introdução e no scanner.
- source_spec: `_bmad-output/implementation-artifacts/spec-1-2-mirar-a-api-36-no-build-de-release.md`
  summary: D7 — O job `Build Web` do `build-android.yml` falha no `Export Web` na `main` (já em 15/10, antes da 1.2): `Unable to resolve module @lottiefiles/dotlottie-react` pedido por `lottie-react-native` (`index.web.js`) via `LottieTrophy.tsx`.
  evidence: log do run 38795050025 (main). Falta a dependência web do Lottie ou um alias/stub só para a web. A CI Android também está vermelha na `main` desde março (último sucesso 15/03, tag v1.2.13); reativar o gate de CI conversa com a Story 2.8. **Atualização 16/10:** resolvido pela Story 11.9 (remover o Lottie), aprovada na Sprint Change Proposal de 16/10/2026 (decisão D1).
- source_spec: `_bmad-output/implementation-artifacts/spec-1-4-corrigir-loja-e-politica-de-privacidade.md`
  summary: D8 — O salt do PIN usa `Math.random` (não criptográfico), embora o comentário diga "cryptographically random". **Virou Story 12.3** (Sprint Change "Privacidade por escolha", 16/10/2026).
  evidence: `src/modules/security/application/PinAuthService.ts:19-27` (`generateSalt`). A política só afirma "hash SHA-256 com salt". Trocar por `crypto.getRandomValues`/`expo-crypto` e manter compatibilidade com hashes antigos (o salt fica salvo junto).
- source_spec: `_bmad-output/implementation-artifacts/spec-1-4-corrigir-loja-e-politica-de-privacidade.md`
  summary: D9 — Anúncios personalizados sem consentimento: os modos de apoio com anúncio pedem `requestNonPersonalizedAdsOnly: false` sem fluxo de consentimento (UMP/GDPR) nem opção de anúncio não personalizado. **Virou Story 12.4** (Sprint Change "Privacidade por escolha", 16/10/2026).
  evidence: `src/components/monetization/AppOpenAdHost.tsx:26`, `src/components/monetization/DailyAdModal.tsx:55`; nenhum uso de `AdsConsent`. A política descreve o comportamento atual; alinhar com o Data safety na Story 1.5.
- source_spec: `_bmad-output/implementation-artifacts/spec-1-4-corrigir-loja-e-politica-de-privacidade.md`
  summary: D10 — O código do grupo de sincronização vai à IA quando a permissão "sync" está ligada, o que dá ao provedor a chave para ler os Eventos publicados nos relays. **Virou Story 12.1** (Sprint Change "Privacidade por escolha", 16/10/2026).
  evidence: `src/modules/ai/application/AIContextBuilder.ts` (seção Sync, `Grupo: ${s.groupId}`). Enviar só o status (ligado, contagem, última sync), nunca o código.
- source_spec: `_bmad-output/implementation-artifacts/spec-1-4-corrigir-loja-e-politica-de-privacidade.md`
  summary: D11 — O auto-backup diário ignora o interruptor de auto-backup: grava a cópia local e envia ao Drive (se conectado) mesmo com a opção desligada. **Virou Story 12.2** (Sprint Change "Privacidade por escolha", 16/10/2026).
  evidence: `src/hooks/useAutoBackup.ts:63-110` não lê `isAutoBackupEnabled` de `src/modules/backup/application/AutoBackupService.ts:16,46`. A chave do aparelho fica em `AsyncStorage` em texto puro (`useAutoBackup.ts:31-48`), não no armazenamento seguro. A política descreve o comportamento atual (cópia diária sempre).
- source_spec: `_bmad-output/implementation-artifacts/spec-1-4-corrigir-loja-e-politica-de-privacidade.md`
  summary: D12 — Existe exportação de backup sem criptografia, com todos os Eventos legíveis. **Virou Story 12.5** (Sprint Change "Privacidade por escolha", 16/10/2026).
  evidence: `src/hooks/useBackupRestore.ts:99` (`handleExportPlain` → `BackupExportService.exportPlain`). A política avisa; decidir se a opção fica (com aviso forte na tela) ou sai.
- source_spec: `_bmad-output/implementation-artifacts/spec-1-4-corrigir-loja-e-politica-de-privacidade.md`
  summary: D13 — Tabela de permissões do `PLAY_STORE_LISTING.md` incompleta (faltam `RECORD_AUDIO`, `MODIFY_AUDIO_SETTINGS`, `POST_NOTIFICATIONS`; a linha INTERNET ainda diz "Sincronização P2P" e omite Drive, Firebase, AdMob, SEFAZ e consultas).
  evidence: `app.json` declara essas permissões; a revisão da Story 1.4 apontou. Resolver na Story 1.5, junto do Data safety, mantendo igual à `docs/politica-de-privacidade.md`.
- source_spec: `_bmad-output/implementation-artifacts/spec-1-4-corrigir-loja-e-politica-de-privacidade.md`
  summary: D14 — A política não tem o conteúdo esperado pela LGPD: controlador e encarregado, base legal por tratamento, transferência internacional (provedores de IA, Firebase, AdMob, relays), retenção, menores e aviso de mudanças.
  evidence: ausente na política anterior e na nova; a Story 1.4 só tratou da veracidade. Exige decisão do dono (texto jurídico) antes da publicação da Story 1.6.

