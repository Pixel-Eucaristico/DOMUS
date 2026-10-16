# Epic 12 Context: Privacidade por escolha

<!-- Compiled from planning artifacts. Edit freely. Regenerate with compile-epic-context if planning docs change. -->

## Goal

Fazer com que nenhum dado saia do aparelho sem que o usuário ative a flag do recurso correspondente, que cada flag diga claramente o que transmite e quais benefícios se perdem ao não ativá-la, e corrigir as fraquezas reais de privacidade e segurança expostas quando a política de privacidade passou a descrever o comportamento verdadeiro do app (salt do PIN, anúncio personalizado sem consentimento, código do grupo enviado à IA, backup automático que ignora o interruptor, exportação sem cifra sem aviso). Importa porque a loja e a política só podem afirmar o que o código cumpre, e o dono decidiu que privacidade é escolha do usuário, não padrão imposto.

## Stories

- Story 12.1: Nunca enviar o código do grupo à IA
- Story 12.2: Fazer o backup automático obedecer ao interruptor
- Story 12.3: Proteger o PIN com salt criptográfico e derivação lenta
- Story 12.4: Anúncio personalizado só com consentimento no modo de apoio
- Story 12.5: Avisar antes da exportação sem criptografia
- Story 12.6: Criar a flag das consultas de itens, preços e ícones
- Story 12.7: Dizer em cada flag o que transmite e o que se perde

## Requirements & Constraints

- Todo fluxo que envia dados para fora do aparelho precisa de uma flag de ativação. Exceção: a ação que o próprio usuário pede explicitamente.
- **As flags existentes são o mecanismo** (IA e suas permissões, Cloud Vision, sync, Google Drive, Firebase, modo de apoio com anúncios, backup automático). Não criar central de privacidade nem tela de consentimento genérica nova.
- Envios ainda sem flag ganham uma única flag nova, no mesmo padrão das existentes: consulta de código de barras (Open Food Facts, Cosmos), download da tabela NCM (Siscomex), atualização automática de preços a cada 24 h (páginas de produto) e ícones de lojas (serviço de ícones do Google). A cotação do dólar já depende da flag da IA.
- Flag nova: **desligada em instalação nova**; para quem já usa, **ligada** (mantém o que já funcionava), com **aviso único** do que envia e do que se perde ao desligar.
- Com a flag de consultas desligada, o app continua funcionando: classifica por palavras-chave, mostra ícone genérico e usa o último preço salvo.
- O contexto enviado à IA nunca pode conter o código do grupo nem nada derivado dele, em nenhuma combinação de permissões; só o status (ligado, contagem, última sync).
- Backup automático desligado: nem cópia local nem envio ao Drive.
- PIN: salt de fonte criptográfica e hash por derivação lenta (PBKDF2 ou similar); PIN no formato antigo é migrado no próximo desbloqueio correto, sem pedir de novo; PIN errado continua rejeitado.
- Anúncios: não personalizados por padrão; personalizado só com consentimento explícito que diga o que é enviado, revogável no mesmo lugar.
- Exportação sem cifra: confirmação obrigatória com aviso de que qualquer pessoa com o arquivo lê os dados; sem confirmação, nada é exportado.
- Textos (12.7): cada flag diz o que transmite e o que se perde; `docs/politica-de-privacidade.md`, a tela da política no app e o `PLAY_STORE_LISTING.md` dizem o mesmo e refletem só o que já foi entregue em 12.1 a 12.6. Toda afirmação pública de privacidade precisa ser verificável no código.
- Todo texto de interface em pt-BR com acentuação completa.
- Cada correção tem teste (construtor de contexto da IA, os dois estados do backup, formato novo, migração e PIN errado do PIN).

## Technical Decisions

- Preferências de consentimento e flags são **estado do aparelho** em `AsyncStorage`, sem Evento no log; ficam fora do sync até o inventário do Epic 9 classificá-las.
- PIN, chaves de API e segredos ficam só em `expo-secure-store` (na web, `webSecrets`); nenhum segredo novo em `AsyncStorage`, em Evento ou em `EXPO_PUBLIC_*`.
- `packages/*` não importam `react`, `react-native` nem `expo`; `packages/sync` é intocável.
- Testes com `npx vitest run`; `vi.mock("react-native")` não funciona (usar `process.env.EXPO_OS` ou lógica sem `react-native`).
- Pontos de partida apontados na triagem das fraquezas: geração do salt em `PinAuthService` (usa `Math.random`); `requestNonPersonalizedAdsOnly: false` em `AppOpenAdHost` e `DailyAdModal`, sem uso de `AdsConsent`; seção Sync do `AIContextBuilder` (envia `groupId`); `useAutoBackup` não lê `isAutoBackupEnabled` do `AutoBackupService`; `handleExportPlain` em `useBackupRestore`; envios sem flag em `eanLookup.ts`, `siscomexCacheService.ts`, `usePriceRefresh.ts` e `StoreGridModal.tsx`. *(Revisto em 16/10: o `AutoBackupService` era código morto e foi removido na Story 12.2; a flag do envio é conectar o Drive.)*

## UX & Interaction Patterns

- Nada de tela nova de privacidade: o texto "o que transmite / o que se perde" fica junto de cada flag existente.
- Aviso único (uma vez) para quem atualiza e recebe a flag nova ligada.
- Consentimento de anúncio personalizado explícito, no mesmo lugar onde pode ser revogado.
- Exportação sem cifra exige confirmação com aviso forte.

## Cross-Story Dependencies

- **Ordem (decisão do dono):** 12.1, 12.2 e 12.3 entram antes do envio do AAB de 25/10/2026 (Epic 1); 12.4 a 12.7 logo depois do Epic 1.
- 12.7 vem por último: os textos refletem as Stories 12.1 a 12.6 já entregues e precisam ficar alinhados ao Data safety e à política (Stories 1.4 a 1.6).
- O que for entregue antes do AAB muda o que a política e o Data safety podem afirmar nas Stories 1.5 e 1.6.
- A chave do backup automático em texto puro e a chave do OCR são tratadas no Epic 6; a cifra fraca do sync, no Epic 4; não duplicar aqui.
- O Epic 9 decidirá se as flags e consentimentos passam a sincronizar.
