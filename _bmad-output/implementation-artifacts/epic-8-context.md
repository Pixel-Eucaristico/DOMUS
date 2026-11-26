# Epic 8 Context: Plataforma moderna

<!-- Compiled from planning artifacts. Edit freely. Regenerate with compile-epic-context if planning docs change. -->

## Goal

Atualizar a plataforma do aplicativo do Expo SDK 54 até o Expo SDK 57, em três saltos incrementais e validados (54 → 55 → 56 → 57), e substituir o login legado do Google Drive pelas APIs modernas (Credential Manager e `AuthorizationClient`). Esse trabalho elimina dependências deprecadas com remoção anunciada, mantém o app sustentável nas versões estáveis atuais, controla regressões de memória no Android 16 e preserva os backups dos usuários sem embutir segredos no aplicativo.

## Stories

- Story 8.1: Medir a linha de base e atualizar para o Expo SDK 55
- Story 8.2: Reavaliar patches e Tamagui no SDK 55 e validar os fluxos
- Story 8.3: Atualizar para o Expo SDK 56 e aplicar o codemod do `expo-router`
- Story 8.4: Medir a memória e validar o SDK 56
- Story 8.5: Atualizar para o Expo SDK 57
- Story 8.6: Reavaliar patches e Tamagui no SDK 57 e validar os fluxos
- Story 8.7: Decidir a biblioteca do novo login do Google
- Story 8.8: Migrar o login e a autorização do Drive
- Story 8.9: Explicar a reconexão do Drive ao usuário

## Requirements & Constraints

- **Upgrade incremental do Expo SDK (54 → 55 → 56 → 57):** Cada salto de SDK deve ser concluído e validado de forma independente antes do próximo; o SDK 58 (beta) está fora do escopo.
- **Critérios de aprovação por salto:** Após cada atualização, `npx expo-doctor`, `npx vitest run`, `npx expo lint` e o build Android de release devem concluir verdes, acompanhados de validação manual em aparelho Android 16 dos fluxos essenciais (abas principais, introdução por tela, câmera/OCR, backup e sync).
- **Limite rígido de memória:** Medir e registrar em `docs/` o pico de memória das telas principais no SDK 54 como linha de base e repetir a medição em cada salto, com atenção especial ao SDK 56 (regressão conhecida envolvendo Hermes v1 e `react-native-worklets`/`reanimated`). Qualquer aumento acima de 20% sobre a linha de base bloqueia o salto até análise.
- **Adaptações obrigatórias no salto para o SDK 56:** Aplicar o codemod oficial de substituição de `react-navigation` no `expo-router` para não restar nenhum import direto de `@react-navigation/*`, validar o novo `fetch` global do Expo nas comunicações com relays Nostr e provedores de IA, e adaptar eventuais chamadas `copy()`/`move()` do `expo-sqlite` ao retorno assíncrono.
- **Reavaliação contínua de patches e dependências sensíveis:** Em cada salto, reavaliar todos os patches em `patches/` (registrando falhas e decisões em `docs/`), a Tamagui (hoje em pré-release RC — manter ou migrar para versão estável com motivo registrado), o `react-native-keyboard-controller` e dependências nativas críticas (`rn-tourguide`, `react-native-google-mobile-ads`, `@react-native-firebase/*`, `react-native-vision-camera`).
- **Decisão aprovada antes da migração do login Google:** Comparar em `docs/` a API "Universal" do `@react-native-google-signin` com ao menos uma alternativa sobre Credential Manager, registrando custo, licença, suporte ao `AuthorizationClient` para o escopo `drive.appdata` e compatibilidade com o SDK 57. Nenhuma mudança de código do login ocorre antes da aprovação escrita do dono.
- **Login e autorização modernos do Google Drive:** Substituir completamente a API legada (`GoogleSignInClient` / `getTokens()`) por Credential Manager (autenticação) e `AuthorizationClient` (autorização do Drive), sem `client_secret` do Google no app ou em variáveis `EXPO_PUBLIC_*`, validando conexão e backup completo em Android real e mantendo os testes de tokens do Drive verdes.
- **Invariantes transversais:** Todo texto de interface deve estar em português do Brasil com acentuação completa; nenhum segredo pode ser gravado em `AsyncStorage` em texto puro ou em `EXPO_PUBLIC_*`; eventos já publicados continuam válidos sem perda de dados; operações de plataforma e rede nunca bloqueiam a interface (offline-first).

## Technical Decisions

- **Núcleo puro e áreas congeladas:** Módulos sob `packages/*` não podem importar `react`, `react-native` nem `expo`. Não alterar `packages/sync` (WebRTC legado), `replit.md`, `replit.nix` ou `.replit`. Mudanças nativas pertencem a `plugins/` ou `patches/`, nunca a edições manuais em `ios/` ou `android/`.
- **Pipelines canônicos e lockfile:** Os pipelines oficiais são GitHub Actions e EAS; o GitLab CI é legado e não deve ser atualizado. Como o ambiente local usa pnpm e a CI executa `npm ci`, qualquer mudança de pacotes exige manter o `package-lock.json` atualizado.
- **Sistema único de teclado:** O app adota exclusivamente `react-native-keyboard-controller` com `KeyboardProvider` na raiz (sem `KeyboardAvoidingView` do RN nem `react-native-avoid-softinput`); compatibilidade e patches dessa biblioteca precisam ser verificados em cada salto de SDK.
- **Credenciais do Drive por aparelho e sem proxy:** Foi descartada a criação de proxy no `server/` para `client_secret` e a sincronização de tokens OAuth entre aparelhos; cada aparelho autentica individualmente e guarda segredos apenas em `expo-secure-store` (nativo) ou `webSecrets` (web).
- **Restrições de teste e alertas:** No Vitest, `vi.mock("react-native")` não funciona (testar lógica isolada sem `react-native` ou usar `process.env.EXPO_OS`). Diálogos e avisos de UI devem usar `appAlert`/`appConfirm`, nunca alertas nativos do sistema ou do navegador.

## UX & Interaction Patterns

- **Reconexão única do Google Drive explicada ao usuário:** Quando o app detectar uma conexão proveniente da API legada, exibir aviso claro em pt-BR (com acentuação completa) explicando a necessidade de reconectar uma vez e garantindo explicitamente que o backup já salvo não foi apagado. Após a reconexão, o backup anterior deve continuar listado normalmente.
- **Conformidade visual edge-to-edge no Android 16:** Em todos os saltos de SDK, verificar que telas principais, modais e câmera/OCR permanecem livres de sobreposição com as barras do sistema.

## Cross-Story Dependencies

- **Dependência de épicos anteriores:** O início dos saltos de SDK requer a base de qualidade verde (suíte de testes sem falhas conhecidas, gate de lint/testes ativo e Node LTS configurado na CI e no EAS) e o baseline funcional no Android 16 (target API 36).
- **Encadeamento interno da trilha de SDK:** Execução estritamente sequencial em pares de upgrade e validação — linha de base de memória e SDK 55 (8.1 → 8.2), SDK 56 com codemod e medição de memória (8.3 → 8.4), e SDK 57 com reavaliação final (8.5 → 8.6).
- **Encadeamento interno da trilha de login Google:** A decisão documentada e aprovada da biblioteca (8.7) depende de compatibilidade com o SDK 57 e precede a migração técnica do login/autorização (8.8), que precede o fluxo de reconexão explicada ao usuário (8.9).
- **Interface com o tratamento unificado de teclado:** As reavaliações de `react-native-keyboard-controller` durante os saltos de SDK (8.2, 8.4 e 8.6) devem preservar o comportamento de teclado em telas, modais e chat.
