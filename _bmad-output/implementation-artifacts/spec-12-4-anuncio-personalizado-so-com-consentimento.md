---
title: 'Story 12.4: Anúncio personalizado só com consentimento no modo de apoio'
type: 'feature'
created: '2026-10-20'
status: 'in-review'
baseline_commit: '8bd67d319095299d87cc0e426421d665c2fbdec2'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-12-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Os modos de apoio com anúncio do Google pedem anúncio personalizado sem consentimento (D9): `requestNonPersonalizedAdsOnly: false` na abertura do app e no intersticial diário, e o banner sem `requestOptions` (personalizado por padrão).

**Approach:** Todo pedido de anúncio passa a ser não personalizado, a menos que a pessoa consinta com anúncios personalizados. O consentimento é explícito, diz o que é enviado e pode ser revogado no mesmo lugar onde os modos de apoio são escolhidos (cartão "Apoio & Anúncios" em Sobre).

## Boundaries & Constraints

**Always:** consentimento como estado do aparelho em AsyncStorage (AD-6), padrão `false`, inclusive para quem já usa o app; um único ponto lê o consentimento e monta as `requestOptions` de todos os anúncios (abertura, intersticial, banner, nativo); texto em pt-BR com acentos dizendo o que vai ao Google com o personalizado (ID de publicidade, informações do aparelho e do uso dos anúncios) e o que muda sem ele (anúncios menos relacionados aos seus interesses; os anúncios continuam aparecendo); revogar vale para o próximo anúncio pedido.

**Never:** mudar os modos de apoio, a frequência ou os IDs dos anúncios; mostrar anúncio a quem não escolheu um modo com anúncio; tocar nos `.web.tsx`; mudar a política e o Data safety (fica para a 12.7).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Sem consentimento | modo com anúncio, consentimento ausente | `requestNonPersonalizedAdsOnly: true` em todo pedido | N/A |
| Com consentimento | consentimento `true` | `requestNonPersonalizedAdsOnly: false` | N/A |
| Revogar | consentimento `true` → `false` | próximo pedido não personalizado | N/A |
| Falha ao ler | AsyncStorage falha | não personalizado | trata como sem consentimento |
| Só links | modo "links" | nenhum anúncio; o controle de consentimento fica oculto ou inativo | N/A |

**Decisão do dono (21/10/2026):** consentimento por interruptor próprio no cartão "Apoio & Anúncios" (Sobre), com o texto do que é enviado; sem o formulário UMP do Google.

</frozen-after-approval>

## Code Map

- `src/modules/monetization/MonetizationSettingsStore.ts` -- `SupportMode`, chave `domus_support_modes_v2`; acrescentar o consentimento (chave própria, ex. `domus_personalized_ads_v1`) e um `getAdRequestOptions()` que devolve `{ requestNonPersonalizedAdsOnly: !consent }`
- `src/components/monetization/AppOpenAdHost.tsx:25-27` -- hoje `requestNonPersonalizedAdsOnly: false`
- `src/components/monetization/DailyAdModal.tsx:51-56` -- idem
- `src/components/monetization/SupportBanner.tsx:57-61` -- `BannerAd` sem `requestOptions`
- `src/components/monetization/NativeAdBanner.tsx:10-11,44` -- desativado hoje (`NativeAdComponent = null`), mas passar `requestOptions` para não voltar personalizado
- `src/components/monetization/SupportModeSelector.tsx:15-21` + `app/about.tsx:128-130` -- onde fica o controle; `src/components/tour/WelcomeCarousel.tsx:400` também mostra o seletor
- `src/hooks/useSupportModes.ts` -- padrão de hook a seguir
- Padrão de consentimento revogável: `app/analytics-settings.tsx` (`SwitchRow`, salvar e aplicar)
- `react-native-google-mobile-ads` 16.2.2 exporta `AdsConsent` (UMP); o app não chama `initialize` nem `setRequestConfiguration`

## Tasks & Acceptance

**Execution:**
- [x] `src/modules/monetization/adConsent.ts` (novo, armazenamento injetável) -- `loadPersonalizedAdsConsent`, `setPersonalizedAdsConsent`, `adRequestOptions(consent)` puro -- fonte única
- [x] `AppOpenAdHost.tsx`, `DailyAdModal.tsx`, `SupportBanner.tsx`, `NativeAdBanner.tsx` -- usar as `requestOptions` do consentimento -- AC 1
- [x] `src/components/monetization/SupportModeSelector.tsx` -- controle de consentimento com o texto do que é enviado, visível quando há modo com anúncio -- AC 2
- [x] `src/modules/monetization/__tests__/adConsent.test.ts` -- matriz (padrão falso, ligar, revogar, falha de leitura)

**Acceptance Criteria:**
- Given um modo de apoio com anúncio e sem consentimento, when qualquer anúncio é pedido, then o pedido é não personalizado
- Given o cartão "Apoio & Anúncios", when ligo e depois desligo o personalizado, then o texto diz o que é enviado e o próximo anúncio segue a escolha atual

## Implementation Notes

- Fonte única em `src/modules/monetization/adConsent.ts` (chave `domus_personalized_ads_v1`, valor `"true"`/`"false"`; ausente, inválido ou falha de leitura = `false`), com cache em memória e assinantes como em `externalLookups.ts`; hook `src/hooks/usePersonalizedAdsConsent.ts`. `MonetizationSettingsStore.ts` ficou intocado: `getAdRequestOptions()` mora em `adConsent.ts`.
- Revogar vale na sessão mesmo se a gravação falhar; conceder só vale se gravar (o interruptor mostra alerta de erro).
- Abertura do app: o efeito espera ler o consentimento e é refeito quando ele muda, descartando o anúncio pré-carregado (e removendo os ouvintes do anterior). Banner e nativo esperam a leitura e remontam por `key` ao mudar o consentimento. Intersticial lê `getAdRequestOptions()` na hora do pedido.
- O interruptor aparece no `SupportModeSelector` só quando há algum modo além de "links"; por isso aparece também no `WelcomeCarousel`, que reutiliza o seletor.
- `grep "requestNonPersonalizedAdsOnly: false" src` só encontra expectativas no teste, nenhuma ocorrência fixa nos anúncios.
- Componentes sem teste automatizado (não há infraestrutura de teste de hook/componente, D21); conferir no aparelho.

## Spec Change Log

## Review Triage Log

| Achado | Veredito | Evidência |
|---|---|---|
| `DailyAdModal` cria e mostra o intersticial depois de desmontado (await sem checagem) | medium | O bloco assíncrono não checa desmontagem após os `await`. **patch**: flag `cancelled`. |
| Revogação com falha de gravação volta a ser consentimento no próximo início | medium | `setItem` falho deixa `"true"` gravado. **patch**: `removeItem` como reserva. |
| Toques rápidos no interruptor: a última gravação a terminar decide, não o último toque | medium | Interruptor só desabilitado sem `loaded`. **patch**: estado `saving`. |
| Texto "Desligado" sugere que nada vai ao Google | medium | Pedido não personalizado ainda envia dados para entrega e medição; FR-5 exige texto verdadeiro. **patch**. |
| Emoji repetido com "Anúncio Nativo" | low | Correção direta. **patch**. |
| Hook fora do barrel `src/hooks/index.ts` | low | Correção direta. **patch**. |
| Política no app ainda diz que o AdMob personaliza | medium | Fora do escopo congelado (política fica para a 12.7). **defer** D22. |
| Componentes e hook sem teste | medium (gap) | Sem infraestrutura de teste de hook. **defer** D23. |
| Linha de consentimento some com só "links", mantendo `true` | low | Ao voltar a um modo com anúncio a linha reaparece ligada, visível. rejeitado |
| `NativeAdBanner` alterado mas inativo | low | Já há comentário dizendo que está desligado. rejeitado |
| Sem UMP para a Europa | false | Decisão do dono (21/10): interruptor próprio, sem UMP. |
| AsyncStorage que nunca responde deixa `loaded` falso | low | Cenário sem evidência; correção acrescenta timeout. rejeitado |
| Corrida no reset de cache dos testes | low | Só afeta testes, sem falha observada. rejeitado |

**Rota:** 6 `patch`, 2 `defer` (D22, D23), 4 rejeitados, 1 falso. Sem loopback.

## Verification

**Commands:**
- `npx vitest run src/modules/monetization` -- expected: passa
- `npx vitest run` e `npx tsc --noEmit` -- expected: sem falhas novas; tsc exit 0
- `grep -rn "requestNonPersonalizedAdsOnly: false" src` -- expected: nenhuma ocorrência fixa
