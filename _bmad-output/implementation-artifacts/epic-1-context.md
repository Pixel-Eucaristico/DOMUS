# Epic 1 Context: Publicável e verdadeiro

<!-- Compiled from planning artifacts. Edit freely. Regenerate with compile-epic-context if planning docs change. -->

## Goal

Manter o DOMUS distribuível pela Play Store (target API 36) e garantir que o que a loja e a política de privacidade afirmam sobre dados é verdade. Também desativa o `client_secret` antigo do Google, que já foi publicado em builds anteriores, sem derrubar o Drive de quem usa o app. Prazo interno: AAB enviado até 25/10/2026; a Play estendeu o prazo final até 01/11/2026.

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

- O app deve compilar com `targetSdkVersion` 36 e `compileSdkVersion` igual ou maior, via `expo-build-properties`. Deve ser validado em Android 16 e enviado como AAB assinado, com `version` e `versionCode` incrementados.
- Os 4 patches de `patches/` devem continuar aplicando via `patch-package`, e o workflow Android do GitHub Actions deve terminar verde.
- Textos públicos (descrição da loja e `app/privacy-policy.tsx`) devem bater com o código:
  - não afirmar "SQLite criptografado";
  - não afirmar "ponta-a-ponta" no sync (usar algo como "cifrado com a chave do grupo");
  - descrever o sync por relays Nostr, não WebRTC;
  - avisar que Eventos já publicados continuam nos relays após excluir o app.
- O *Data safety* deve listar todos os fluxos que enviam dados para fora do aparelho, cada um com o dado enviado e o consentimento: relays Nostr, Google Drive, provedores de IA, OCR de terceiros, Firebase (Analytics, Crashlytics, Performance) e anúncios. Texto da política, lista e formulário do Play Console devem dizer o mesmo.
- Ordem de segurança do segredo: publicar a versão sem `client_secret` antes de revogar o antigo; revogar só depois da adoção. O Drive deve ser validado num Android real (conectar e fazer backup completo).
- Verificação do build publicado: extrair o bundle do AAB e buscar `GOCSPX-` e `CLIENT_SECRET` (nada pode aparecer); `git grep CLIENT_SECRET` também deve vir vazio.
- Baseline de testes: `npx vitest run` tem 25 falhas pré-existentes, que são tratadas no Epic 2; este épico não pode introduzir falhas novas.
- Texto de interface em pt-BR com acentuação completa.
- Versões antigas deixam de renovar o token do Drive após a revogação; isso deve ser comunicado aos usuários ativos, e o dono adia ou avisa se alguém ainda estiver na versão antiga.
- Se um item da validação no Android 16 não puder ser corrigido até 01/11/2026, ou se o envio não sair até 25/10 (decisão em 29/10), o dono decide e registra se aceita a perda de disponibilidade.
- Resultados de validação e checklists ficam registrados em `docs/` (por exemplo `docs/data-safety.md`).

## Technical Decisions

- Segredos só em `expo-secure-store` (na web, `webSecrets`); nenhum segredo em `AsyncStorage` em texto puro, em evento ou em `EXPO_PUBLIC_*`. O ESLint (`no-restricted-syntax` em `eslint.config.js`) barra `process.env.EXPO_PUBLIC_*` com `SECRET`, `PRIVATE` ou `PASSWORD` no nome.
- O group code do sync fica em `SecureStore`. O Drive no nativo usa `GoogleSignin.getTokens()` (`GoogleNativeAuth.ts`), sem `client_secret` no app. O usuário precisa reconectar o Drive uma vez, e esse fluxo ainda não foi testado em aparelho real.
- O sync troca o log pelos relays Nostr públicos, sem servidor próprio. A cifra atual é XOR, que não é criptografia forte, então os textos públicos não podem chamá-la de ponta-a-ponta.
- Pipelines canônicos de build e release: EAS e GitHub Actions. O GitLab CI é legado e não deve ser alterado.
- Nunca editar `ios/` nem `android/` (gerados por `expo prebuild`); mudança nativa vai em `plugins/` ou `patches/`. Não alterar `packages/sync`, `replit.md`, `replit.nix` nem `.replit`.
- Dependência nova também exige atualizar `package-lock.json`, porque a CI roda `npm ci`.

## Cross-Story Dependencies

- Story 1.6 depende das Stories 1.1 a 1.5 concluídas.
- Story 1.7 depende do AAB da Story 1.6.
- Story 1.8 depende da 1.7 e da adoção da versão sem segredo nos aparelhos do dono e dos usuários ativos.
- Story 1.5 deve ser consistente com a política corrigida na Story 1.4.
- Story 1.3 valida a build com target 36 produzida na Story 1.2.
- O Epic 2 (testes verdes) resolve as 25 falhas pré-existentes; o Epic 8 refaz o login do Google com Credential Manager e `AuthorizationClient`, e depende do baseline do Epic 2.
