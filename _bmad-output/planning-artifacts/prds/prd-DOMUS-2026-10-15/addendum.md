# Addendum — PRD DOMUS: Segurança e Atualização

Profundidade técnica que não cabe no PRD. Não contém decisões de auditoria (estão em `.memlog.md`).

## A. Mapa dos IDs antigos para os FRs do PRD

| ID da lista inicial | FR no PRD | Observação |
|---|---|---|
| FR13 (target API 36) | FR-1 | movido para primeiro por decisão do dono |
| FR14 (Node) | FR-2 | |
| FR15 (Expo SDK) | FR-3 | |
| FR16 (login Google) | FR-4 | |
| (novo) | FR-5 | textos públicos; descoberta ao ler a política e a listagem |
| (novo, da jornada) | FR-6, FR-7 | propagação imediata, anti-eco |
| (novo, do pedido) | FR-8 (8a, 8b, 8c), FR-11 | sync total em três etapas, Drive com o mesmo escopo |
| FR4 + FR5 | FR-9 | |
| FR6 | FR-10 | |
| FR1 | FR-12 | cifra no Grupo forte |
| FR2 | FR-13 | virou Segredo de grupo forte com pareamento por QR |
| (novo, do pedido) | FR-14 | coexistência com a versão antiga e fim do XOR |
| FR3 | FR-15 | |
| FR7 | FR-16 | |
| FR8 | FR-17 | |
| FR9 | FR-18 | |
| FR10 | FR-19 | sem a parte de troféus |
| NFR6 | FR-20 | virou FR: o gate depende dele |
| (novo, revisão) | FR-23 | segredos atuais (chave do OCR e senha do auto-backup em `AsyncStorage`) |
| (novo, revisão) | FR-24 | nível e streak sem estado absoluto |
| FR12 | FR-21 | |
| FR11 | FR-22 | |

## B. Pesquisa de plataforma (2026-10-15, fontes oficiais)

- **Play, target API:** desde 31/08/2026 apps novos e atualizações precisam de API 36; extensão até 01/11/2026 pelo Policy status do Play Console; quem não cumpre fica indisponível a novos usuários em aparelhos mais novos. Fonte: Play Console Help, "Target API level requirements for Google Play apps".
- **Expo:** SDK 55 (fev/2026), SDK 56 (21/05/2026, RN 0.85, React 19.2, Node >= 20.19.4), SDK 57 estável (30/06/2026), SDK 58 em beta (15/09/2026). O SDK 54 é o último com Legacy Architecture e já mira Android 16/API 36; no 54 a borda a borda fica sempre ligada. O changelog do SDK 56 registra regressão de memória com Hermes v1 e `react-native-worklets`/`reanimated`, com recomendação de ir ao 57.
- **Node:** o 20 está em fim de vida; o 22 e o 24 estão em LTS; o 26 é Current.
- **Login Google:** a API legada `GoogleSignInClient` está deprecada e será removida do Play Services Auth (sem data). Substitutos oficiais: Credential Manager (autenticação) e `AuthorizationClient` (autorização, como o Drive). A API "Original" da biblioteca `@react-native-google-signin` usa o SDK legado e é descrita como "deprecated but remains functional"; há uma API "Universal" com Credential Manager, com custo não confirmado.

## C. Ordem sugerida de salto do SDK (FR-3)

1. 54 → 55: `npx expo install expo@^55 --fix`, `expo-doctor`, build, smoke.
2. 55 → 56: codemod `sdk-56-expo-router-react-navigation-replace`; medir memória (Hermes v1 + reanimated).
3. 56 → 57: versão recomendada pelo changelog do 56.
Reavaliar a cada salto: `patches/` (expo-asset, expo-audio, keyboard-controller, rn-tourguide), `rn-tourguide` (a tela de tour foi trocada por modais por tela, mas o pacote e o patch permanecem), Tamagui `2.0.0-rc.26`, `react-native-google-mobile-ads`, `@react-native-firebase/*` e `react-native-vision-camera`.

## D. Alternativas consideradas e descartadas

- **Proxy no `server/` para o `client_secret` do Drive:** exigiria publicar o `server/` (infra hoje em aberto) e um endpoint novo. Descartado em favor de `getTokens()` nativo, depois de Credential Manager (FR-4).
- **Cifrar o SQLite (SQLCipher):** descartado; corrige-se o texto (FR-5). Reabrir se a promessa for reposta.
- **Sincronizar tokens do Google entre aparelhos:** inseguro e tecnicamente inviável; os tokens são por aparelho. Sincroniza-se só a preferência.
- **Sincronizar chaves de API já, sobre XOR:** descartado; só depois do FR-12 e com opt-in.

## E. Insumos técnicos (revisões do spine)

Para FR-7, FR-9, FR-15, FR-16, FR-17, FR-19, ver `architecture/architecture-DOMUS-2026-10-15/reviews/review-adversary.md`. Pontos que o PRD adota:
- Ordem total `(timestamp, deviceId, id)` (itens 3).
- Ids determinísticos para eventos de efeito (item 2), sem a parte de troféus.
- Push por lote confirmado, pull paginado, fila na assinatura (item 4). A proposta de enviar "todo evento não confirmado de qualquer `deviceId`" precisa respeitar o FR-7 (anti-eco).
- `schemaVersion` com conversão no reducer (item 9).
- Itens do revisor que **não** entraram (candidatos a PRD futuro): identidade de categoria por slug, conversão atômica de wishlist em despesa, arredondamento do saldo no reducer.

## F. Regra do troféu colecionável (insumo para a reformulação, fora do escopo)

Decisão do dono: o sorteio de troféu é aleatório de propósito, como pacote de figurinhas, e vale **por pessoa**, não por aparelho. O resultado é gravado como evento de seleção; um aparelho só sorteia se não houver seleção daquele período no log. Receber o mesmo troféu em outro ano sobe o nível (tier) dele, sem duplicar. Hoje a semente do sorteio é o `deviceId` (`pickSeasonalTrophy`), o que contraria a regra. Está registrada como AD-10 no spine.

## G. Promessa pública contra o comportamento (base do FR-5)

| Afirmação | Onde | Realidade |
|---|---|---|
| Sync com "criptografia ponta-a-ponta" | `PLAY_STORE_LISTING.md`, política | XOR com chave derivada do código de grupo |
| "SQLite criptografado" | `PLAY_STORE_LISTING.md` | banco sem cifra |
| Sync "via WebRTC, sem servidores" | `app/privacy-policy.tsx` | relays Nostr públicos |
| "Excluir dados: desinstale o app" | `app/privacy-policy.tsx` | eventos permanecem nos relays |
| Backup AES-256-GCM com senha | listagem e política | confere (`BackupCryptoService`, PBKDF2 com 100 mil iterações) |

## H. Risco residual: o histórico publicado em XOR

A chave pública do Nostr do Grupo antigo é derivada do mesmo código de 6 caracteres (cerca de 30 bits) que gera a chave de cifra, e vai **em claro** nos relays. Quem a vê testa os códigos possíveis até a chave pública bater e obtém a chave de cifra (`deriveKeysFromCode` em `src/modules/nostrSync.ts`). Consequência: (1) trocar XOR por AES-GCM no Grupo antigo não protege; (2) todo Evento já publicado em XOR continua legível por esse ataque, mesmo depois do corte. O Grupo forte (FR-13) corrige daqui para a frente, não retroativamente. Os relays não garantem apagar o histórico antigo.

## I. Decisões tomadas na revisão final

- **Código do grupo:** janela curta de convivência com Grupo antigo e Grupo forte em paralelo; corte por versão mínima e data (FR-14). Alternativas descartadas: repareamento único sem convivência; convivência sem repareamento (não protege).
- **Prazo:** AAB com target API 36 enviado até 25/10/2026 (FR-1).
- **Chaves de IA e OCR:** sincronizam só entre Aparelhos nativos, com opt-in, depois do Grupo forte (FR-8c).
- **Revogação do segredo do Google:** só depois da adoção da versão sem `client_secret`, porque as versões antigas renovam o token do Drive com ele (FR-22).
- **Ordem de entrega:** por dependência (§6.3 do PRD).
