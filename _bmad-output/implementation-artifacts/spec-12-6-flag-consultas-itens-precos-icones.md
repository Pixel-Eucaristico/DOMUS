---
title: 'Story 12.6: Criar a flag das consultas de itens, preços e ícones'
type: 'feature'
created: '2026-10-20'
status: 'in-progress'
baseline_commit: 'f94f67dd94662401ac4587ce53a61db29fe0a585'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-12-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Quatro envios saem do aparelho sem nenhuma flag (FR-28): consulta de código de barras (Open Food Facts, Cosmos), download da tabela NCM (Siscomex), atualização automática de preços a cada 24 h (páginas de produto) e ícones de lojas (serviço de favicon do Google).

**Approach:** Uma flag única de aparelho, "Consultas de itens, preços e ícones", no padrão das flags existentes (AsyncStorage, AD-6), com interruptor na tela Sobre/configurações. Desligada, nenhum dos quatro envios acontece e o app usa as alternativas locais. Instalação nova começa desligada; quem já usa começa ligado e recebe um aviso único (decisão D-B).

## Boundaries & Constraints

**Always:** `packages/parsers` recebe a flag por opção (`ClassifyItemOptions`), sem importar AsyncStorage; o mapa NCM estático (`classifyByNcm`) continua valendo com a flag desligada, por não usar rede; o aviso único e o texto do interruptor dizem o que é enviado (código de barras e NCM dos itens, endereço das páginas de produto, domínio das lojas) e o que se perde (classificação mais precisa, preço atualizado, ícone da loja); pt-BR com acentos; enquanto a flag carrega, tratar como desligada (nenhum envio antes de ler a escolha).

**Never:** criar central de privacidade ou tela nova; tocar na busca por link e no compartilhamento para a lista de desejos (`useAddWishlistItem`, `ShareToWishlistModal`) e na busca em Amazon/Mercado Livre pelo WebView — são ações que o próprio usuário pede (exceção do NFR-8); mudar os envios já cobertos pela flag da IA; ressuscitar `src/services/siscomexCacheService.ts` (código morto, fica como está); `packages/sync`.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Flag desligada, importar nota | itens com EAN e NCM | nenhuma chamada a EAN nem Siscomex; classifica por NCM estático, depois palavras-chave | N/A |
| Flag ligada, importar nota | itens com EAN e NCM | comportamento atual | falha de rede cai no fallback atual |
| Flag desligada, abrir lista de desejos | itens com preço salvo | nenhum scraping automático; mostra o último preço salvo | N/A |
| Flag desligada, escolher loja | grade de lojas | ícone genérico (Feather), nenhuma URL de favicon | N/A |
| Flag ligada, favicon falha | imagem não carrega | ícone genérico | `onError` |
| Instalação nova | sem `domus_welcome_done_v1` e sem a chave da flag | flag desligada, sem aviso | N/A |
| Quem já usa | `domus_welcome_done_v1` presente e sem a chave da flag | flag ligada e gravada; aviso único | N/A |
| Aviso já visto | chave da flag gravada | nada | N/A |

</frozen-after-approval>

## Code Map

- `src/modules/analytics/domain/AnalyticsSettings.ts` + `application/AnalyticsSettingsStore.ts` -- padrão a copiar (chave versionada, defaults, load/save com merge)
- `src/context/DemoModeProvider.tsx:12` -- `WELCOME_KEY = "domus_welcome_done_v1"`: presente = quem já usa
- `packages/parsers/src/classifier/classifyItem.ts` -- `ClassifyItemOptions` (:458) ganha `externalLookups?: boolean` (padrão `false`); `classifyItemFull` (:474) pula `classifyByNcmWithSiscomex` (:480) e `classifyByEan` (:486-490) quando falso; `classifyByNcm` (:27) e `classifyByKeyword` (:83) seguem
- `src/hooks/useEditableItems.ts:69` -- repassa a flag a `classifyItemFull`; `app/import-invoice.tsx:92-93` -- lê a flag e passa ao hook (junto do `aiEnabled` já existente)
- `src/hooks/usePriceRefresh.ts:61` -- recebe `enabled`; falso = não enfileira nem chama `wishlistScraperService.scrape` (:134, :159); `app/wishlist/[listId].tsx:110` passa a flag
- `src/components/wishlist/StoreGridModal.tsx:27-30,67,77` -- sem flag ou com `onError`: Feather `shopping-bag` no lugar do `<Image>`
- `app/about.tsx:132-141,360` -- `SwitchRow` novo na seção de configurações, com a frase do que envia/perde
- `src/hooks/useScreenIntro.ts` -- NÃO usar para o aviso (o "rever introduções" do about o re-armaria)
- `packages/parsers/__tests__/classifier.test.ts` -- hoje sem cobertura de `classifyItemFull`

## Tasks & Acceptance

**Execution:**
- [ ] `src/modules/privacy/externalLookups.ts` (novo, sem `react-native`) -- chave `domus_external_lookups_v1` `{ enabled, noticeShown }`; `loadExternalLookups()` que, na primeira leitura sem chave, decide pelo `WELCOME_KEY` (presente → `enabled: true, noticeShown: false`; ausente → `enabled: false, noticeShown: true`) e grava; `setExternalLookupsEnabled()`, `markExternalLookupsNoticeShown()`; o AsyncStorage injetável para teste -- fonte única da flag
- [ ] `src/hooks/useExternalLookups.ts` (novo) -- hook `{ enabled, loaded, setEnabled }` sobre o módulo -- uso nas telas
- [ ] `packages/parsers/src/classifier/classifyItem.ts` -- opção `externalLookups` -- corte do EAN e Siscomex
- [ ] `src/hooks/useEditableItems.ts`, `app/import-invoice.tsx` -- repassar a flag -- AC 1
- [ ] `src/hooks/usePriceRefresh.ts`, `app/wishlist/[listId].tsx` -- opção `enabled` -- AC 1
- [ ] `src/components/wishlist/StoreGridModal.tsx` -- ícone genérico sem flag e no `onError` -- AC 1
- [ ] `app/about.tsx` -- `SwitchRow` "Consultas de itens, preços e ícones" com subtítulo "Envia código de barras, NCM, links de produto e lojas a serviços externos. Desligado: classificação por palavras, sem atualização de preço e sem ícone das lojas." -- AC 2
- [ ] `app/_layout.tsx` (ou componente montado nele) -- aviso único via `Alert` para quem já usa, com "Manter ligado" e "Desligar"; grava `noticeShown` -- AC 3
- [ ] `packages/parsers/__tests__/classifier.test.ts` e `src/modules/privacy/__tests__/externalLookups.test.ts` -- testar: `classifyItemFull` com flag falsa não chama `fetch` (EAN e NCM); migração nova/existente; aviso marcado só uma vez -- matriz

**Acceptance Criteria:**
- Given a flag desligada, when importo uma nota, abro a lista de desejos ou escolho uma loja, then não há requisição a Open Food Facts, Cosmos, Siscomex, páginas de produto nem `google.com/s2/favicons`, e o app mostra classificação local, último preço salvo e ícone genérico
- Given uma instalação nova, when abro a tela Sobre, then o interruptor está desligado e nenhum aviso aparece
- Given quem já usa o app, when abre a versão nova, then o interruptor está ligado e o aviso aparece uma única vez, mesmo após "rever introduções"

## Implementation Notes

## Spec Change Log

## Review Triage Log

## Verification

**Commands:**
- `npx vitest run packages/parsers/__tests__/classifier.test.ts src/modules/privacy` -- expected: passa
- `npx vitest run` -- expected: mesmas falhas do baseline (6 arquivos), nenhuma nova
- `npx tsc --noEmit` -- expected: exit 0
- `grep -rn "s2/favicons" src app` -- expected: só dentro do caminho condicionado à flag
