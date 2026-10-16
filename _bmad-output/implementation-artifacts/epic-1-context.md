# Epic 1 Context: Publicável e verdadeiro

<!-- Compiled from planning artifacts. Edit freely. Regenerate with compile-epic-context if planning docs change. -->

## Goal

Manter o DOMUS publicável na Play e honesto sobre privacidade. O app passa a mirar a API 36 (exigida pela Play desde 31/08/2026, com prazo estendido até 01/11/2026) e é validado no Android 16. A descrição da loja, a política de privacidade dentro do app e o formulário *Data safety* passam a dizer só o que o código faz de verdade. O `client_secret` do Google, publicado em builds antigos, sai do app e só é revogado depois que a versão sem ele for adotada, para não derrubar o backup no Drive de ninguém. Este é o épico prioritário: a data interna de envio do AAB é **25/10/2026**.

## Stories

- Story 1.1: Consolidar as correções de segredo na `dev`
- Story 1.2: Mirar a API 36 no build de release
- Story 1.3: Validar no Android 16 e corrigir o que quebrar
- Story 1.4: Corrigir a descrição da loja e a política de privacidade
- Story 1.5: Alinhar o formulário Data safety ao comportamento
- Story 1.6: Enviar o AAB com target 36 à Play até 25/10/2026
- Story 1.7: Verificar que o build publicado não tem o `client_secret`
- Story 1.8: Revogar o segredo antigo do Google depois da adoção

## Requirements & Constraints

- **Target API:** `targetSdkVersion` 36 e `compileSdkVersion` >= 36 via `expo-build-properties` (o `app.json` hoje sobrescreve com 35; o Expo SDK 54 já mira 36 por padrão). O Play Console deve aceitar o AAB sem aviso de *target API*. Não mexer no `minSdkVersion`.
- **Android 16:** abas principais, introdução por tela, câmera/OCR, backup e sync abrem sem falha; nenhum conteúdo sob as barras do sistema (borda a borda sempre ligada). O resultado vira checklist em `docs/`.
- **Prazos e saídas:** envio até 25/10/2026; se reprovar ou atrasar, o dono decide (até 29/10) entre corrigir até 01/11 ou aceitar a perda de disponibilidade para novos usuários em aparelhos mais novos. Registrar a decisão.
- **Textos públicos verdadeiros** (loja e `app/privacy-policy.tsx`):
  - remover "SQLite criptografado" (o banco local não é cifrado; cifrar o SQLite é não-objetivo);
  - remover "criptografia ponta-a-ponta" ou trocar por "cifrado com a chave do grupo" enquanto o Grupo antigo (cifra XOR com código de 6 caracteres) existir;
  - descrever o sync por relays Nostr públicos, não WebRTC;
  - dizer que Eventos já publicados continuam nos relays depois de excluir o app;
  - o backup AES-256-GCM com senha já confere e pode ficar.
  - Supõe-se que `PLAY_STORE_LISTING.md` é igual ao texto publicado: comparar e corrigir diferenças.
- **Data safety:** listar em `docs/data-safety.md` cada fluxo que sai do aparelho (relays Nostr, Google Drive, provedores de IA, OCR de terceiros, Firebase Analytics/Crashlytics/Performance, anúncios), com o dado enviado e o consentimento. Citar que fotos de documentos financeiros (nota fiscal e holerite) vão ao provedor de IA/OCR escolhido. Play Console, lista e política devem dizer o mesmo. Em aberto: se o `server/` entra (hoje não recebe dado do app).
- **Segredo do Google:** nenhum `client_secret` no app (`git grep CLIENT_SECRET` e busca por `GOCSPX-`/`CLIENT_SECRET` no bundle extraído do AAB vazias). Publicar sem o segredo **antes** de revogar; revogar só após adoção pelos aparelhos do dono e dos usuários ativos, comunicando que versões antigas deixam de renovar o token do Drive. Validar conexão do Drive e backup completo num Android real (antes e depois da rotação).
- **Testes na integração da `dev`:** `npx vitest run` só pode mostrar as 25 falhas pré-existentes, nenhuma nova; `npx expo lint` sem erro na regra de `EXPO_PUBLIC_*`.
- **Métricas de sucesso:** Play aceita a atualização com target 36 até 25/10; 100% das afirmações públicas de privacidade têm verificação no código.
- Texto de interface em pt-BR com acentuação completa.

## Technical Decisions

- **Segredos:** só em `expo-secure-store` (nativo) ou `webSecrets` (web: AES-GCM com chave não extraível no IndexedDB). Nunca em `AsyncStorage` em texto puro, em Evento ou em `EXPO_PUBLIC_*`. O ESLint (`no-restricted-syntax` em `eslint.config.js`) barra `process.env.EXPO_PUBLIC_*` com `SECRET`, `PRIVATE` ou `PASSWORD` no nome.
- **Correções de segredo já feitas a consolidar (1.1):** group code do sync no SecureStore (`loadGroupCode`/`saveGroupCode` em `src/context/syncStorage.ts`, com migração do legado), Drive nativo via `GoogleSignin.getTokens()` sem `client_secret` (`src/modules/backup/infrastructure/GoogleNativeAuth.ts`), `webSecrets`, regra de ESLint e workflows sem o segredo. Integrar em commits separados por tema.
- **Login do Google:** `getTokens()` usa a API legada e exige uma reconexão do Drive; a troca por Credential Manager/`AuthorizationClient` fica para outro épico. Proxy no `server/` para o segredo foi descartado.
- **Build e release:** pipelines canônicos são EAS e GitHub Actions; o GitLab CI é legado e não deve ser alterado. O workflow Android do GitHub Actions deve ficar verde. `patch-package` precisa aplicar os 4 patches de `patches/` sem erro. `ios/` e `android/` são gerados por `expo prebuild --clean` e não vão ao git. Aumentar `version` e `versionCode` antes do envio.
- **Stack atual:** Expo SDK 54 (~54.0.33), React Native 0.81.5 com Nova Arquitetura, Node 20 na CI (a troca de Node e de SDK é de outros épicos).
- **Intocáveis:** `packages/sync`, `replit.md`, `replit.nix`, `.replit`. `packages/*` não importam `react`, `react-native` nem `expo`.
- **Testes:** `vi.mock("react-native")` não funciona no vitest; usar `process.env.EXPO_OS` ou lógica sem `react-native`.
- **Risco residual a não contradizer nos textos:** Eventos já publicados em XOR seguem legíveis por força bruta do código de 6 caracteres, mesmo após o corte futuro do Grupo antigo.

## Cross-Story Dependencies

- 1.1 a 1.5 precisam estar concluídas antes do envio (1.6); FR-5 é publicado junto com FR-1.
- 1.4 e 1.5 precisam ser consistentes entre si (política, lista e Play Console).
- 1.7 depende do AAB da 1.6; 1.8 depende de 1.7 e da adoção da versão publicada.
- Outros épicos: o termo "ponta-a-ponta" só volta depois do corte do Grupo antigo (Epic 4, Story 4.10). O gate de lint e testes na CI e o baseline verde vêm no Epic 2. As stories 11.1 e 11.2 (tooltips) vêm logo depois deste épico; o holerite (Epic 11) já precisa estar refletido no Data safety.
