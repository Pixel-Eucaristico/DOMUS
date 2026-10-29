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
  evidence: `.github/workflows/build-android.yml` e `build-ios.yml` sem passo de lint/teste; `eslint.config.js` cobre só `X.env.NOME`. Cobrir na Story 2.8 (gate de CI) e na 6.5 (teste de segredo em `AsyncStorage`). **Resolvido em parte (29/10/2026, Story 2.8):** o workflow `Gate` (`.github/workflows/gate.yml`) roda `npx eslint .`, `npx vitest run` e `npx tsc --noEmit` em PR e push na `dev`/`main`, e o `build-android.yml` depende dele; continuam abertos o teste da regra de ESLint e a cobertura de desestruturação e `TOKEN`/`KEY`.
- source_spec: `_bmad-output/implementation-artifacts/spec-1-1-consolidar-correcoes-de-segredo-na-dev.md`
  summary: D5 — Superfícies sem teste: `useSyncEngine` (group code), fiação nativa de `GoogleDriveService`/`GoogleNativeAuth` e cofre IndexedDB real.
  evidence: nenhum teste importa esses módulos; `react-native` quebra o vitest (AGENTS.md). Extrair a escolha de provedor para função pura, como em `driveTokens`; testar o cofre exige `fake-indexeddb` e atualizar `package-lock.json` para a CI.
- source_spec: `_bmad-output/implementation-artifacts/spec-1-2-mirar-a-api-36-no-build-de-release.md`
  summary: D6 — Comportamentos do Android 16 com target 36 sem verificação: predictive back ligado por padrão (e `onBackPressed` legado deixa de ser chamado), edge-to-edge obrigatório e redimensionamento em telas grandes; rever também a armadilha de View grande com animação (Mali, `docs/tour-crash-fixes.md`).
  evidence: efeitos de runtime que o `expo prebuild` e o `tsc` não pegam; a revisão da Story 1.2 só os apontou. Incluir cada item na checklist da Story 1.3 e testar o botão/gesto de voltar nas abas, no modal de introdução e no scanner.
- source_spec: `_bmad-output/implementation-artifacts/spec-1-2-mirar-a-api-36-no-build-de-release.md`
  summary: D7 — O job `Build Web` do `build-android.yml` falha no `Export Web` na `main` (já em 15/10, antes da 1.2): `Unable to resolve module @lottiefiles/dotlottie-react` pedido por `lottie-react-native` (`index.web.js`) via `LottieTrophy.tsx`.
  evidence: log do run 38795050025 (main). Falta a dependência web do Lottie ou um alias/stub só para a web. A CI Android também está vermelha na `main` desde março (último sucesso 15/03, tag v1.2.13); reativar o gate de CI conversa com a Story 2.8. **Atualização 16/10:** resolvido pela Story 11.9 (remover o Lottie), aprovada na Sprint Change Proposal de 16/10/2026 (decisão D1). **Atualização 21/10:** o dono manteve o Lottie; a Story 11.9 passa a instalar `@lottiefiles/dotlottie-react` (`sprint-change-proposal-2026-10-21-lottie.md`). **Resolvido (21/10/2026):** `@lottiefiles/dotlottie-react` 0.13.5 instalado e o `.wasm` servido pelo próprio build; ver `spec-11-9-lottie-na-web.md`.
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
  summary: D11 — O auto-backup diário ignora o interruptor de auto-backup: grava a cópia local e envia ao Drive (se conectado) mesmo com a opção desligada. **Virou Story 12.2** (Sprint Change "Privacidade por escolha", 16/10/2026). **Resultado (16/10):** o interruptor só existia no `AutoBackupService` morto, removido; o envio ao Drive depende de conectar o Drive.
  evidence: `src/hooks/useAutoBackup.ts:63-110` não lê `isAutoBackupEnabled` de `src/modules/backup/application/AutoBackupService.ts:16,46`. A chave do aparelho fica em `AsyncStorage` em texto puro (`useAutoBackup.ts:31-48`), não no armazenamento seguro. A política descreve o comportamento atual (cópia diária sempre).
- source_spec: `_bmad-output/implementation-artifacts/spec-1-4-corrigir-loja-e-politica-de-privacidade.md`
  summary: D12 — Existe exportação de backup sem criptografia, com todos os Eventos legíveis. **Virou Story 12.5** (Sprint Change "Privacidade por escolha", 16/10/2026).
  evidence: `src/hooks/useBackupRestore.ts:99` (`handleExportPlain` → `BackupExportService.exportPlain`). A política avisa; decidir se a opção fica (com aviso forte na tela) ou sai.
- source_spec: `_bmad-output/implementation-artifacts/spec-1-4-corrigir-loja-e-politica-de-privacidade.md`
  summary: D13 — Tabela de permissões do `PLAY_STORE_LISTING.md` incompleta (faltam `RECORD_AUDIO`, `MODIFY_AUDIO_SETTINGS`, `POST_NOTIFICATIONS`; a linha INTERNET ainda diz "Sincronização P2P" e omite Drive, Firebase, AdMob, SEFAZ e consultas).
  evidence: `app.json` declara essas permissões; a revisão da Story 1.4 apontou. Resolver na Story 1.5, junto do Data safety, mantendo igual à `docs/politica-de-privacidade.md`. **Resolvido (16/10):** Story 1.5 completou a tabela em `PLAY_STORE_LISTING.md`, igual à seção 4 de `docs/data-safety.md`.
- source_spec: `_bmad-output/implementation-artifacts/spec-1-4-corrigir-loja-e-politica-de-privacidade.md`
  summary: D14 — A política não tem o conteúdo esperado pela LGPD: controlador e encarregado, base legal por tratamento, transferência internacional (provedores de IA, Firebase, AdMob, relays), retenção, menores e aviso de mudanças.
  evidence: ausente na política anterior e na nova; a Story 1.4 só tratou da veracidade. Exige decisão do dono (texto jurídico) antes da publicação da Story 1.6.
- source_spec: `_bmad-output/implementation-artifacts/spec-12-3-pin-com-salt-criptografico-e-derivacao-lenta.md`
  summary: D15 — Medir em Android real o tempo do PBKDF2 do PIN (30 mil iterações, JS puro no Hermes) e, se passar de ~300 ms, mostrar indicador de espera no teclado do PIN (`LockScreen`, `useSecuritySetup`).
  evidence: não verificado (maybe-false); o teclado não mostra estado de espera enquanto `verifyPin` roda. Medir junto da checklist da Story 1.3.
- source_spec: `_bmad-output/implementation-artifacts/spec-1-5-data-safety.md`
  summary: D16 — **Antes do AAB da Story 1.6:** remover `expo-location` (em `package.json` desde a v1.4.0, sem uso no código) ou bloquear `ACCESS_FINE_LOCATION`/`ACCESS_COARSE_LOCATION` em `app.json`; conferir também `SYSTEM_ALERT_WINDOW` no manifesto do AAB de release.
  evidence: APK de release da CI (run #71) pede as duas permissões de localização; `docs/data-safety.md` §4 e achado A6. Sem isso, o Play cobra declaração e justificativa de localização. Dependência nova/removida exige atualizar `package-lock.json` (AGENTS.md). **Resolvido (16/10/2026):** dependência removida e permissões bloqueadas em `app.json`; ver `spec-d16-remover-expo-location.md`. Confirmar no manifesto do AAB (Story 1.6).
- source_spec: `_bmad-output/implementation-artifacts/spec-1-5-data-safety.md`
  summary: D17 — Atualizar a política (três textos): busca de produto na Amazon/Mercado Livre com código de afiliado ao adicionar item à lista de desejos; ID da instalação do Firebase; IP visto pelo Firebase e pelo AdMob; localização aproximada do AdMob; ID de publicidade no Analytics.
  evidence: achados 1 e 4 de `docs/data-safety.md` §5 e revisão da Story 1.5. Encaixa na Story 12.7 ou antes da publicação da política na Story 1.6. **Resolvido (21/10/2026, Story 12.7):** Política §6 (ID da instalação, IP, ID de publicidade no Analytics, localização aproximada do AdMob) e §7 (busca com código de afiliado) nos três textos.
- source_spec: `_bmad-output/implementation-artifacts/spec-1-5-data-safety.md`
  summary: D18 — Páginas `http://` da SEFAZ (QR Code) e da lista de desejos falham no release com target 36, porque o HTTP sem cifra é bloqueado.
  evidence: achado 3 de `docs/data-safety.md`; APK sem `usesCleartextTraffic`. Não reproduzido em aparelho. Incluir na checklist da Story 1.3 (ler QR de NFC-e de estados que ainda usam `http://`); correção possível: reescrever para `https://` quando o host aceitar.
- source_spec: `_bmad-output/implementation-artifacts/spec-1-5-data-safety.md`
  summary: D19 — Rever a resposta "Não" à exclusão de dados: o desenvolvedor consegue pedir a exclusão dos dados do Analytics (Firebase) e do AdMob vinculados ao app. **Decidido (16/10/2026):** o dono mantém "Não", sem story para mostrar o ID da instalação; os dados do Firebase são opcionais (desligados por padrão) e anônimos.
  evidence: a decisão do dono partiu da premissa "nada em servidor"; Firebase e AdMob guardam dados na conta Google do desenvolvedor. Decisão do dono antes de preencher o formulário (Story 1.6).

- source_spec: `_bmad-output/implementation-artifacts/spec-12-6-flag-consultas-itens-precos-icones.md`
  summary: D20 — "Apagar tudo" (`resetApp`) não volta a flag "Consultas de itens, preços e ícones" (`domus_external_lookups_v1`) ao padrão de instalação nova; a escolha anterior sobrevive ao reset.
  evidence: `resetApp` em `src/hooks/useEventStore.ts` limpa Eventos e segurança, não a chave da flag. Decidir com o dono se o reset deve desligar a flag (Story 12.7 ou próxima revisão das flags).
- source_spec: `_bmad-output/implementation-artifacts/spec-12-6-flag-consultas-itens-precos-icones.md`
  summary: D21 — Sem testes do corte da flag nos pontos de React: `usePriceRefresh` (não raspar com a flag desligada, retomar ao ligar), repasse de `externalLookups` em `import-invoice.tsx`/`useEditableItems` e o aviso único em `app/_layout.tsx`.
  evidence: o repositório não tem infraestrutura de teste de hook/componente (sem `@testing-library`, `renderHook` nem jsdom). Cobrir na checklist de aparelho (Story 13.7/1.3) ou extrair a lógica da fila para módulo puro.
- source_spec: `_bmad-output/implementation-artifacts/spec-12-4-anuncio-personalizado-so-com-consentimento.md`
  summary: D22 — Na Story 12.7, atualizar `app/privacy-policy.tsx` (§6, linhas ~259-263), `docs/politica-de-privacidade.md` e `docs/data-safety.md`: os anúncios agora são não personalizados por padrão, com o interruptor "Anúncios personalizados" em Sobre → Apoio & Anúncios; mesmo desligado, o Google recebe dados do aparelho para entregar e medir os anúncios.
  evidence: a política ainda diz que o AdMob "pode mostrar anúncios personalizados"; a spec da 12.4 deixou a política para a 12.7. **Resolvido (21/10/2026, Story 12.7):** Política §6 nos três textos e F10 de `docs/data-safety.md`.
- source_spec: `_bmad-output/implementation-artifacts/spec-12-4-anuncio-personalizado-so-com-consentimento.md`
  summary: D23 — Sem testes de que `AppOpenAdHost`, `DailyAdModal`, `SupportBanner` e o hook `usePersonalizedAdsConsent` usam as opções do consentimento (só o módulo puro `adConsent.ts` é testado).
  evidence: mesma falta de infraestrutura de teste de hook/componente do D21. Conferir no aparelho que o anúncio recarrega ao mudar o interruptor; ou extrair o mapeamento do hook para função pura e testar.
- source_spec: `_bmad-output/implementation-artifacts/spec-corrigir-modos-de-apoio-com-anuncio.md`
  summary: D24 — O anúncio nativo novo tem ~137 dp de altura (mídia mínima de 120×120 do Google) e fica fixo acima da navegação em todas as telas, podendo cobrir o fim de listas e botões flutuantes.
  evidence: `NativeAdBanner.tsx` posicionado em `bottom: tabBarHeight`, montado na raiz. Conferir no aparelho; se cobrir, dar espaço inferior às telas ou usar o ícone no lugar da mídia.
- source_spec: `_bmad-output/implementation-artifacts/spec-corrigir-modos-de-apoio-com-anuncio.md`
  summary: D25 — Sem testes do fluxo do intersticial diário em `MonetizationHosts` (gravar o dia ao fechar, não reabrir no mesmo dia, ligar com o app aberto), do `useSupportModes` e do `ensureMobileAdsInitialized`.
  evidence: mesma falta de infraestrutura de teste de hook/componente (D21, D23); extrair a decisão do diário para módulo puro e testar.
- source_spec: `_bmad-output/implementation-artifacts/spec-11-7-gerar-lottie-dos-trofeus-sem-animacao.md`
  summary: D26 — Os Lottie novos usam ícones do Twemoji (CC-BY 4.0), que exige atribuição onde a arte é distribuída: antes de a Story 11.8 registrar esses troféus no app, incluir o crédito ao Twemoji (ex.: tela Sobre ou arquivo de licenças).
  evidence: a licença está citada só nos comentários de `scripts/trophy-lot-1.js`; os JSONs ainda não entram no app (não estão em `APPROVED_LOTTIE`). **Resolvido (22/10/2026, Story 11.8):** crédito na tela Sobre (`app/about.tsx`): "Ilustrações dos troféus com elementos do Twemoji (CC-BY 4.0) e do Bootstrap Icons (MIT)."; ver `spec-11-8-registrar-lottie-aprovados.md`.
- source_spec: `_bmad-output/implementation-artifacts/spec-11-7-lote-2.md`
  summary: D27 — Nenhum workflow da CI roda `vitest` (só `build-android.yml` e `build-ios.yml`): os testes dos lotes de troféus e os demais só rodam à mão.
  evidence: grep por vitest/npm test/tsc em `.github/workflows/` não acha nada; já era assim antes. Ligar um job de testes conversa com a Story 2.8. **Resolvido (29/10/2026, Story 2.8):** `.github/workflows/gate.yml` roda `npx vitest run` (além de lint e `tsc`) em todo PR e push na `dev`/`main`; ver `spec-2-7-e-2-8-node-24-e-gate-de-ci.md`.
- source_spec: `_bmad-output/implementation-artifacts/spec-11-7-ajustes-do-dono-1.md`
  summary: D28 — Gravar a lista (com hash) dos Lottie aprovados pelo dono na página de aprovação e testar que eles não mudam sem nova aprovação.
  evidence: hoje só o `git diff --stat` manual protege os aprovados; o teste "disco = gerador" passa de novo depois de regerar. Fazer junto da Story 11.8, que registra os aprovados no app. **Resolvido (22/10/2026, Story 11.8):** `assets/lottie/trophies/aprovados.sha256.json` (sha256 dos 637 arquivos de `APPROVED_LOTTIE`), regerado por `node scripts/lottie-approved-hashes.js` (`--check` só confere); `scripts/__tests__/lottieApprovedHashes.test.ts` falha se um arquivo aprovado mudar ou se a lista não cobrir o registro.
- source_spec: `_bmad-output/implementation-artifacts/spec-11-8-registrar-lottie-aprovados.md`
  summary: D29 — Os geradores antigos (`scripts/gen_seasonal_tiers.js`, `scripts/gen_trophy_*.js`) gravam direto com `fs.writeFileSync` e sobrescrevem Lottie já aprovados, sem a recusa do `writeTrophy`.
  evidence: só os lotes (`trophy-kit.main` → `writeTrophy`) recusam ids aprovados; o teste de hash do D28 acusa a mudança depois, mas não impede.
- source_spec: `_bmad-output/implementation-artifacts/spec-3-2-quarentena-no-replay.md`
  summary: D30 — Em release, o usuário não vê a Quarentena: um evento descartado no replay some do app sem aviso (só o DebugTools, que é de desenvolvimento, mostra).
  evidence: `DebugTools` só aparece com `__DEV__`. Avisar com contagem e opção de reportar, numa story própria.
- source_spec: `_bmad-output/implementation-artifacts/spec-3-5-timestamp-no-futuro.md`
  summary: D31 — `ACHIEVEMENT_UNLOCKED` não é deduplicado no reducer: se a conquista de outro aparelho está em Quarentena (horário no futuro) ou atrasada no sync, este aparelho desbloqueia de novo e, quando as duas valem, o XP soma duas vezes.
  evidence: `packages/gamification/src/reducer.ts` soma `xpReward` sempre; decidir se conquista pode repetir (`completionCounts`) antes de deduplicar por id.
- source_spec: `_bmad-output/implementation-artifacts/spec-revisao-23-10-correcoes.md`
  summary: D32 — Logs antigos com dois eventos do mesmo milissegundo e ids sem o contador da 3.4 (ou com prefixo, como `xp-recovery-…`/`debug-…`) podem trocar de ordem na atualização: o desempate por `deviceId`/`id` não segue a ordem de gravação.
  evidence: `compareEvents` (`packages/storage/src/eventOrder.ts`) desempata por texto; ids antigos não carregam ordem de criação. Medir em logs reais antes de mexer; se aparecer, desempatar ids antigos pela ordem de gravação (`rowid`).
- source_spec: `_bmad-output/implementation-artifacts/spec-revisao-23-10-correcoes.md`
  summary: D33 — `dispatch` (e `appendDispatched`/`appendGenerated`) refaz o log inteiro a cada evento: normaliza, deduplica e reordena tudo (O(n log n) por evento).
  evidence: `src/context/localEventLog.ts` chama `prepareLocalLog([...prev, evt])`. Trocar por inserção ordenada (busca binária com `compareEvents`) quando virar gargalo em logs grandes.
- source_spec: `_bmad-output/implementation-artifacts/spec-3-6-cursor-dos-relays.md`
  summary: D34 — O pull lê no máximo 500 eventos por relay e cada aparelho republica todos os lotes (`d=sync-<aparelho>-<i>`, 20 eventos por lote). Passando de ~500 lotes no total, o relay devolve os mais novos e os lotes do aparelho com relógio atrasado são cortados primeiro. Relays também recusam evento com `created_at` muito no futuro (strfry: 15 min), e cada entrega ao vivo limpa o push pendente.
  evidence: revisão da Story 3.6; repensar o formato dos lotes junto do Epic 4 (Grupo forte).
- source_spec: `_bmad-output/implementation-artifacts/spec-3-7-edicao-e-exclusao-antes-do-alvo.md`
  summary: D35 — `AccountFormModal` envia `balance` (valor derivado) em toda edição de conta, mesmo quando só o nome muda; com eventos concorrentes de outro aparelho o saldo gravado fica velho.
  evidence: `src/components/shared/AccountFormModal.tsx` preenche `balance` com `editingAccount.balance`; enviar só quando o usuário alterar o saldo.
- source_spec: `_bmad-output/implementation-artifacts/spec-3-7-edicao-e-exclusao-antes-do-alvo.md`
  summary: D36 — Transação com `timestamp` menor que o `ACCOUNT_CREATED` da conta (relógio do criador da conta adiantado) é criada sem efeito no saldo; uma exclusão ou edição depois reverte um valor que nunca entrou (1000 → 1030).
  evidence: revisão da Story 3.7 (sonda p1); aplicar o efeito no saldo quando a conta aparecer, em story própria.
- source_spec: `_bmad-output/implementation-artifacts/spec-3-7-edicao-e-exclusao-antes-do-alvo.md`
  summary: D37 — `INVOICE_CONFIRMED` antes de `INVOICE_IMPORTED` e os eventos da lista de desejos (item atualizado, removido, preço, convertido, meta, lista apagada) antes do alvo ainda são ignorados.
  evidence: `packages/domain/src/reducer.ts` (`if (!invoice) return state`) e `packages/wishlist/src/reducer.ts`.
- source_spec: `_bmad-output/implementation-artifacts/spec-11-4-holerite-como-evento-local.md`
  summary: D38 — `PAYSLIP_*` que um build de dev já tenha importado do Grupo antigo antes da 11.4 (publicado por um build do commit `850aa1b`) continua no log e é aplicado no replay.
  evidence: revisão da Story 11.4 (R5); ignorar `PAYSLIP_*` de outro `deviceId` até a Story 4.5 ou limpar na migração para o Grupo forte.
- source_spec: `_bmad-output/implementation-artifacts/spec-13-2-padronizar-a-rolagem-das-telas-com-campos.md`
  summary: D39 — O teste-guarda da rolagem só descobre campos um nível abaixo das rotas de `app/`; campo novo em componente aninhado ou em sub-tela de `src/` renderizada por rota isenta (ex.: IdleScreen do `import-invoice`) passa despercebido.
  evidence: revisão da Story 13.2 (R6); resolver imports recursivamente com memo, cuidando do barril do tamagui que exporta `TInput`.
- source_spec: `_bmad-output/implementation-artifacts/spec-13-4-fazer-as-buscas-e-dialogos-em-modal-subirem.md`
  summary: D40 — Em "Mais lojas..." o tamanho do cartão vem do `Dimensions` estático (~145dp em paisagem): com o teclado aberto nenhuma linha cabe inteira, e girar com o modal aberto mantém a largura antiga.
  evidence: revisão da Story 13.4 (R9); usar `useWindowDimensions` e limitar o tamanho do cartão pela altura disponível.
- source_spec: `_bmad-output/implementation-artifacts/spec-13-6-corrigir-a-digitacao-manual-da-chave-da-nf-sobre-a-camera.md`
  summary: D41 — A chave de acesso digitada à mão aceita só dígitos; quando o CNPJ alfanumérico (jul/2026) aparecer na chave, o campo e o `normalizeChaveInput` precisam aceitar letras na posição do CNPJ (o dígito verificador já usa ASCII − 48).
  evidence: revisão da Story 13.6 (R6); `packages/parsers/src/chaveAcesso.ts` e `src/components/invoice/qrKeyBarLayout.ts`.
- source_spec: `_bmad-output/implementation-artifacts/spec-13-6-corrigir-a-digitacao-manual-da-chave-da-nf-sobre-a-camera.md`
  summary: D42 — Colar a chave com o campo já preenchido passa de 44 dígitos e o campo mantém o valor antigo; o usuário precisa limpar antes. Avaliar substituir o conteúdo quando a colagem trouxer uma sequência completa de 44 dígitos.
  evidence: decisão da implementação no R6 da Story 13.6.
