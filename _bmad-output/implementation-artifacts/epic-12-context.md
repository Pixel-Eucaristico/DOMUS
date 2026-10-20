# Epic 12 Context: Privacidade por escolha

<!-- Compiled from planning artifacts. Edit freely. Regenerate with compile-epic-context if planning docs change. -->

## Goal

Garantir que nenhum dado saia do aparelho sem que o usuário ative a flag do recurso, que cada flag diga o que transmite e quais benefícios se perdem ao desligá-la, e corrigir as fraquezas reais (D8 a D12) que ficaram visíveis quando a política de privacidade passou a descrever o comportamento verdadeiro do app: salt do PIN, anúncio personalizado sem consentimento, código do grupo enviado à IA, backup que vai ao Drive sem escolha e exportação sem cifra sem aviso. Importa porque a loja e a política só podem afirmar o que o código cumpre, e o dono decidiu que privacidade é escolha do usuário.

## Stories

- Story 12.1: Nunca enviar o código do grupo à IA
- Story 12.2: Fazer o backup automático obedecer ao interruptor
- Story 12.3: Proteger o PIN com salt criptográfico e derivação lenta
- Story 12.4: Anúncio personalizado só com consentimento no modo de apoio
- Story 12.5: Avisar antes da exportação sem criptografia
- Story 12.6: Criar a flag das consultas de itens, preços e ícones
- Story 12.7: Dizer em cada flag o que transmite e o que se perde

## Requirements & Constraints

- Todo fluxo que envia dados para fora do aparelho tem uma flag de ativação. Quem ativa aceita a transmissão; quem não ativa perde os benefícios daquele recurso.
- **As flags existentes são o mecanismo** (chave e permissões da IA, Cloud Vision, sync, Google Drive, Firebase, modo de apoio com anúncios). Não criar central de privacidade nem aviso genérico novo.
- Envios sem flag ganham uma única flag nova, no padrão das existentes: consulta de código de barras (Open Food Facts, Cosmos), download da tabela NCM (Siscomex), atualização automática de preços a cada 24 h (páginas de produto) e ícones de lojas (serviço do Google). A cotação do dólar só roda no painel da IA e já depende da flag da IA.
- Flag nova: desligada em instalação nova; ligada para quem já usa o app, com aviso único do que envia e do que se perde ao desligar. Desligada, o app segue funcionando: classifica por palavras-chave, mostra ícone genérico e usa o último preço salvo.
- O contexto montado para o provedor de IA nunca contém o código do grupo nem nada derivado dele, em nenhuma combinação de permissões; um teste do construtor de contexto garante isso.
- Backup: o interruptor antigo só existia em código morto e é removido (nenhuma ocorrência de `AutoBackupService` nem das chaves `domus_auto_backup_(enabled|password|interval_h)` em `src` e `app`). A flag do envio é conectar o Google Drive: desconectado, a cópia cifrada fica só no aparelho; conectado, é enviada ao Drive como hoje.
- PIN: salt de fonte criptográfica e hash por derivação lenta (PBKDF2 ou similar); PIN no formato antigo é regravado no formato novo no próximo desbloqueio correto, sem pedir de novo; testes cobrem formato novo, migração e PIN errado.
- Anúncios: não personalizados por padrão; personalizado só com consentimento explícito que diga o que é enviado, revogável no mesmo lugar.
- Exportação sem cifra: confirmação obrigatória com aviso de que qualquer pessoa com o arquivo lê os dados; sem confirmação, nada é exportado.
- Textos: cada flag (IA e permissões, voz, Cloud Vision, sync, Drive, backup automático, Firebase, anúncios, consultas de itens) diz o que transmite e o que se perde; a política em `docs/politica-de-privacidade.md`, a tela da política no app e o `PLAY_STORE_LISTING.md` dizem o mesmo. Toda afirmação pública de privacidade precisa ser verificável no código.
- Todo texto de interface em pt-BR com acentuação completa.

## Technical Decisions

- Flags e consentimentos são estado do aparelho em `AsyncStorage`, sem Evento no log; ficam fora do sync até o inventário do Epic 9 classificá-los.
- PIN, chaves de API e segredos ficam só em `expo-secure-store` (na web, `webSecrets`); nenhum segredo novo em `AsyncStorage`, em Evento ou em `EXPO_PUBLIC_*`.
- `packages/*` não importam `react`, `react-native` nem `expo`; `packages/sync` é intocável.
- Pontos de envio sem flag localizados no planejamento: `packages/parsers/src/classifier/eanLookup.ts`, `src/services/siscomexCacheService.ts`, `src/hooks/usePriceRefresh.ts` e `src/components/wishlist/StoreGridModal.tsx`.
- Testes com `npx vitest run`; `vi.mock("react-native")` não funciona (usar `process.env.EXPO_OS` ou lógica sem `react-native`).

## UX & Interaction Patterns

- Sem tela nova de privacidade: a frase "o que transmite / o que se perde" fica junto de cada flag existente, igual nas telas, na política e na loja.
- Aviso único para quem atualiza e recebe a flag nova ligada.
- Consentimento de anúncio personalizado explícito e revogável no mesmo lugar.
- Exportação sem cifra exige confirmação com aviso claro.

## Cross-Story Dependencies

- Ordem decidida pelo dono: 12.1, 12.2 e 12.3 antes do envio do AAB de 25/10/2026 (Epic 1); 12.4 a 12.7 logo depois do Epic 1.
- 12.7 vem por último: os textos refletem só o que 12.1 a 12.6 já entregaram.
- O que entrar antes do AAB muda o que a política e o Data safety podem afirmar (Stories 1.5 e 1.6).
- Chave do OCR e senha do auto-backup em armazenamento seguro ficam no Epic 6; a cifra fraca do sync, no Epic 4; não duplicar aqui.
- O Epic 9 decide se flags e consentimentos passam a sincronizar.
