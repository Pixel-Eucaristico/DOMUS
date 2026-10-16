# Epic 1 Context: Publicável e verdadeiro

<!-- Compiled from planning artifacts. Edit freely. Regenerate with compile-epic-context if planning docs change. -->

## Goal

Manter o DOMUS publicável na Play e tornar verdadeira a sua promessa pública de privacidade. A Play exige *target API* 36 para atualizações (prazo estendido até 01/11/2026, sem nova prorrogação conhecida; quem não cumpre fica indisponível a novos usuários em aparelhos mais novos). Hoje o app declara 35, e a loja e a política dentro do app afirmam coisas que o código não faz. O épico entrega um AAB com target 36 e textos públicos fiéis até a data interna de 25/10/2026. Depois disso, desativa o `client_secret` antigo do Google, que foi publicado em builds anteriores, sem derrubar o Drive de quem ainda usa versão antiga.

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

- **Target API:** `targetSdkVersion` 36 e `compileSdkVersion` igual ou maior que 36, via `expo-build-properties` no `app.json`. O Play Console aceita o AAB sem aviso de *target API*. O Expo SDK 54 já mira a API 36 por padrão; o `app.json` é que sobrescreve com 35.
- **Android 16:** borda a borda sempre ligada, então o conteúdo não pode ficar sob as barras do sistema. Num aparelho Android 16 do dono, estes fluxos abrem sem falha: abas principais, introdução por tela, câmera/OCR, backup e sync.
- **Prazo:** AAB enviado até 25/10/2026, com uma semana de folga até 01/11. Se a validação no Android 16 reprovar ou o envio atrasar, quem decide é o dono: corrigir a tempo ou aceitar a perda de disponibilidade. A decisão fica registrada.
- **Textos públicos (loja e `app/privacy-policy.tsx`) só com afirmações verificáveis no código:**
  - remover "SQLite criptografado": o banco local não é cifrado, e cifrá-lo foi descartado;
  - remover ou trocar "criptografia ponta-a-ponta" por "cifrado com a chave do grupo" enquanto o Grupo antigo existir;
  - descrever o sync por relays Nostr públicos, não por WebRTC;
  - dizer que os Eventos já publicados continuam nos relays depois de excluir o app;
  - o backup AES-256-GCM com senha confere com o código e pode continuar.
- **Data safety:** precisa listar todos os fluxos que enviam dados para fora do aparelho: relays Nostr, Google Drive, provedores de IA, OCR de terceiros, Firebase (Analytics, Crashlytics, Performance) e anúncios. Cada fluxo informa o dado enviado e o consentimento. O fluxo de IA e OCR cita que fotos de documentos financeiros (nota fiscal e holerite) vão ao provedor escolhido pelo usuário. Política, lista e formulário dizem o mesmo.
- **Premissa a conferir:** supõe-se que `PLAY_STORE_LISTING.md` seja igual ao texto publicado. Compare com a loja e corrija as diferenças.
- **Segredo do Google:**
  - nenhum `client_secret` no app; `git grep CLIENT_SECRET` e a busca por `GOCSPX-` no bundle extraído não retornam nada;
  - a versão sem o segredo é publicada antes de qualquer revogação;
  - a revogação só acontece depois da adoção nos aparelhos do dono e dos usuários ativos, com aviso a eles; havendo usuário ativo na versão antiga, adiar ou avisar antes;
  - o Drive (conectar e fazer um backup completo) é validado num Android real.
- **Testes e lint:** o baseline de `npx vitest run` tem 25 falhas pré-existentes. Nenhuma falha nova é aceita.
- **Texto de interface:** pt-BR com acentuação completa.

## Technical Decisions

- **Segredos (regra de arquitetura):** ficam só em `expo-secure-store` no nativo e em `webSecrets` na web; nunca em `AsyncStorage`, em Evento ou em `EXPO_PUBLIC_*`, porque essas variáveis vão embutidas no bundle. O ESLint (`no-restricted-syntax`) barra `process.env.EXPO_PUBLIC_*` com `SECRET`, `PRIVATE` ou `PASSWORD` no nome. O código do grupo vai para o SecureStore com migração do valor legado.
- **Drive no nativo:** usa `GoogleSignin.getTokens()`, sem `client_secret`. O usuário reconecta o Drive uma vez. Esse fluxo ainda não foi testado em aparelho. A migração para Credential Manager fica no Epic 8 (FR-4), fora deste épico.
- **Pipelines:** os canônicos são EAS e GitHub Actions; mudanças de build, assinatura e versão vão neles. O GitLab CI é legado e não deve ser evoluído. O workflow Android do GitHub Actions precisa terminar verde.
- **Nativo:** `android/` é gerado pelo prebuild; mudança nativa vai em `plugins/` ou `patches/`. Os 4 patches de `patches/` (aplicados no `postinstall`) precisam continuar aplicando sem erro com o target 36.
- **Sync atual:** XOR com chave derivada de um código de 6 caracteres (cerca de 30 bits), com a chave pública Nostr derivada do mesmo código e exposta em claro. Isso não é criptografia forte, e nenhum texto pode sugerir que seja.

## Cross-Story Dependencies

- 1.1 → 1.2 → 1.3: o build de target 36 sai da `dev` já consolidada, e a validação no Android 16 depende dele.
- 1.4 ↔ 1.5: a política e a lista do Data safety precisam bater.
- 1.6 exige 1.1 a 1.5 concluídas. Por decisão do dono, as stories 12.1 (não enviar o código do grupo à IA), 12.2 (backup automático obedece ao interruptor) e 12.3 (PIN com salt e derivação lenta) também entram antes do AAB de 25/10.
- 1.7 depende do AAB da 1.6. A 1.8 depende da 1.7 e da adoção pelos usuários, sem data comprometida.
- Fora do épico: "ponta-a-ponta" só volta depois do corte do Grupo antigo (Epic 4, story 4.10). As flags de envio e o texto "o que transmite / o que se perde" ficam no Epic 12 e também tocam a política. As stories 11.1 e 11.2 (tooltips) vêm logo depois deste épico.
