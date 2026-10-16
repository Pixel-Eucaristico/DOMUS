---
title: 'Sprint Change Proposal — Privacidade por escolha'
status: approved
approved: '2026-10-16'
created: '2026-10-16'
mode: batch
trigger: pedido do dono após a Story 1.4
scope: moderate
---

# Sprint Change Proposal — Privacidade por escolha

## 1. Resumo do problema

**Gatilho.** A Story 1.4 deixou a política verdadeira, e por isso ela agora expõe fraquezas reais do código (adiados D8 a D12) e envios de dados que acontecem sem o usuário ativar nada. O dono pediu: **corrigir as fraquezas** e fazer com que **todo envio de dados só aconteça se o usuário ativar**, com aviso do que será transmitido e de **quais benefícios ele perde** se não ativar. Os textos continuam obrigados a dizer só a verdade (FR-5, NFR-6).

**Tipo.** Requisito novo do dono.

**Evidências.** `deferred-work.md` D8 a D12; `docs/politica-de-privacidade.md` §3, §4 e §7 (envios sem opt-in: resumo para a IA, consultas de código de barras, tabela NCM, ícones de lojas, páginas de preço, cotação do dólar).

## 2. Análise de impacto

| Item | Status | Achado |
|---|---|---|
| Épicos existentes | [x] | Já cobertos e mantidos: chave do OCR (6.1), chave do backup automático (6.2), cifra fraca do sync (Epic 4). |
| Épico novo | [!] | Epic 12 "Privacidade por escolha" para D8 a D12 e para o consentimento por envio. |
| PRD | [!] | Novo FR-28 e NFR-8 ("nenhum dado sai do aparelho sem ativação explícita, exceto a ação que o próprio usuário pede"). |
| Arquitetura | [x] | Preferências de consentimento são estado do aparelho (AD-6), sem evento; ficam fora do sync até o Epic 9 classificá-las. |
| Story 1.5 / 1.6 | [!] | Data safety e política dependem do que for entregue antes do AAB de 25/10 (ver decisão D-A). |
| Prazo da Play | [!] | Mudar comportamento antes de 25/10 aumenta o risco do envio; ver D-A. |

## 3. Caminho recomendado

**Revisão do dono (16/10):** o app já tem uma flag de ativação para quase todo envio (chave e permissões da IA, chave do Cloud Vision, sync, Google Drive, Firebase, modo de apoio dos anúncios). Não se cria central de privacidade nem aviso novo: **as flags existentes são o mecanismo**. Quem ativa aceita a transmissão; quem não ativa perde os benefícios daquele recurso, e o texto diz isso.

Envios **sem flag** encontrados no código, que passam a ter uma, no mesmo padrão das existentes: consulta de código de barras (Open Food Facts, Cosmos; `packages/parsers/src/classifier/eanLookup.ts`), download da tabela NCM (Siscomex; `src/services/siscomexCacheService.ts`), atualização automática de preços a cada 24 h (`src/hooks/usePriceRefresh.ts`) e ícones de lojas (Google; `src/components/wishlist/StoreGridModal.tsx:29`). A cotação do dólar só roda no painel da IA, então já depende da flag da IA.

Ajuste direto: Epic 12 novo e enxuto, logo depois do Epic 1; as correções pequenas entram antes do AAB (D-A).

## 4. Propostas de mudança

### 4.1 PRD — novo FR-28

```
#### FR-28: Privacidade por escolha
O usuário decide cada envio de dados para fora do aparelho pela flag do recurso e sabe o
que perde se não ativar.

Consequências (testáveis):
- Todo fluxo que envia dados para fora do aparelho tem uma flag de ativação; os que não têm
  (consulta de código de barras, tabela NCM, atualização de preços, ícones de lojas) ganham
  uma, no padrão das existentes, desligada em instalação nova.
- Para quem já usa, o que já funcionava continua ligado e o app avisa uma vez (decisão D-B).
- A política, a tela do app e a loja dizem, para cada flag, o que é transmitido se ativada e
  quais benefícios se perdem se desligada.
- As fraquezas D8 a D12 são corrigidas.
```

### 4.2 Épicos — novo Epic 12

```
### Epic 12: Privacidade por escolha
A pessoa ativa cada envio pela flag do recurso, sabe o que perde ao não ativar, e as
fraquezas encontradas na Story 1.4 deixam de existir.
**FRs covered:** FR-28
**Ordem:** 12.1 a 12.3 antes do AAB de 25/10 (D-A); o resto logo depois do Epic 1.
```

| Story | Título | Origem |
|---|---|---|
| 12.1 | Nunca enviar o código do grupo à IA | D10 |
| 12.2 | Fazer o backup automático obedecer ao interruptor | D11 |
| 12.3 | Proteger o PIN com salt criptográfico e derivação lenta | D8 |
| 12.4 | Anúncio personalizado só com consentimento no modo de apoio | D9 |
| 12.5 | Avisar antes da exportação sem criptografia | D12 |
| 12.6 | Criar a flag das consultas de itens, preços e ícones | FR-28 |
| 12.7 | Dizer em cada flag o que transmite e o que se perde | FR-5, FR-28 |

Resumo dos critérios:

- **12.1** O contexto de sincronização enviado à IA não inclui o código do grupo, em nenhuma permissão; um teste garante.
- **12.2** Com o interruptor desligado, nem a cópia local nem o envio ao Drive acontecem.
- **12.3** Salt com fonte criptográfica e derivação lenta; o PIN atual é migrado no próximo desbloqueio, sem pedir de novo.
- **12.4** Modo de apoio com anúncio usa anúncio não personalizado; o personalizado só com consentimento explícito, revogável.
- **12.5** A exportação sem cifra pede confirmação com o aviso de que qualquer pessoa com o arquivo lê os dados.
- **12.6** Uma flag nas configurações liga as consultas de código de barras, tabela NCM, preços e ícones; desligada, o app classifica por palavras-chave, mostra ícone genérico e o preço salvo. Instalação nova: desligada; quem já usa: ligada, com aviso único.
- **12.7** Política, tela e loja: para cada flag, o que é transmitido se ativada e o que se perde se desligada; as telas das flags mostram a mesma frase.

### 4.3 Sprint status

Acrescentar `epic-12: backlog`, as stories 12.1 a 12.7 em `backlog` e `epic-12-retrospective: optional`. Os adiados D8 a D12 recebem a nota "virou Story 12.x".

## 5. Entrega

- **Escopo:** moderado; épico novo e uma emenda pequena ao PRD.
- **Dev (`bmad-build`):** uma story por vez, com spec, revisão e commit direto na `dev`.

## 6. Decisões do dono

- **D-A = (b):** 12.1, 12.2 e 12.3 antes do AAB de 25/10; o resto logo depois do Epic 1.
- **D-B = (b) Manter e avisar:** quem já usa mantém ligado o que já funcionava e recebe um aviso único.
- **Revisão:** usar as flags existentes; sem central de privacidade nova.
