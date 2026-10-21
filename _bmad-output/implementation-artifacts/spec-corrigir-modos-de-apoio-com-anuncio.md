---
title: 'Corrigir os modos de apoio com anúncio'
type: 'bugfix'
created: '2026-10-21'
status: 'in-review'
baseline_commit: '2bb059cf3fa5538bf5a4898306acfd4ca9ab1ed3'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/spec-12-4-anuncio-personalizado-so-com-consentimento.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** O dono relata que nem todas as opções de apoio funcionam. No código: os anúncios só leem os modos na abertura do app (escolher um modo em Sobre não faz nada até reiniciar); o "Anúncio Nativo" está desligado no código (`NativeAdComponent = null`); o intersticial diário grava a data antes de mostrar (se falhar, perde o dia) e recria o anúncio a cada render do pai (`onClose` novo); o SDK nunca é inicializado.

**Approach:** Cada modo escolhido passa a valer na hora, sem reiniciar: banner, intersticial diário, anúncio nativo (com a API `NativeAd` + `NativeAdView` da `react-native-google-mobile-ads` 16.2.2, compatível com a nova arquitetura) e abertura do app. Todos continuam obedecendo ao consentimento da Story 12.4.

## Boundaries & Constraints

**Always:** todo pedido usa `adRequestOptions`/`getAdRequestOptions` de `src/modules/monetization/adConsent.ts`; modos lidos de uma fonte única com assinantes (padrão de `externalLookups.ts`/`adConsent.ts`), para o seletor e os anúncios verem a mesma escolha; `mobileAds().initialize()` uma vez antes do primeiro pedido; IDs de teste do Google em `__DEV__` (já em `AdMobConfig.ts`); falha de anúncio cai no fallback de afiliados que já existe; textos em pt-BR com acentos.

**Never:** mudar IDs de produção, a frequência (intersticial 1× por dia; abertura só ao voltar ao app), o consentimento da 12.4 ou os `.web.tsx`; usar UMP; mostrar anúncio sem modo escolhido ou no modo demonstração; tocar em `android/`/`ios/`.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Ligar modo em Sobre | "banners" ligado com o app aberto | banner aparece sem reiniciar | N/A |
| Desligar modo | "banners" desligado | banner some na hora | N/A |
| Intersticial diário | modo ligado, ainda não visto hoje | mostra uma vez; data gravada só depois de mostrar (anúncio ou fallback) | falha → fallback de afiliados, data gravada ao fechá-lo |
| Intersticial já visto hoje | data de hoje gravada | não mostra | N/A |
| Ligar o diário com o app aberto | modo ligado agora, não visto hoje | mostra uma vez | N/A |
| Anúncio nativo | modo ligado | anúncio nativo do Google com título, anunciante, mídia e botão, e "Anúncio" visível | falha → nada (ou afiliados) |
| Abertura do app | modo ligado | anúncio ao voltar ao app | N/A |
| Só links | nenhum modo de anúncio | nenhum anúncio | N/A |

**Decisão do dono (21/10/2026):** o "Banner" continua sendo banner do Google, com a barra de afiliados Amazon/Mercado Livre como reserva se ele falhar; o texto da opção passa a dizer isso.

</frozen-after-approval>

## Code Map

- `app/_layout.tsx:526-565` -- `MonetizationHosts`: lê `loadSupportModes()` uma vez; passa a assinar a fonte única; `onClose` estável (`useCallback`); lógica da data diária
- `src/modules/monetization/MonetizationSettingsStore.ts` -- `loadSupportModes`/`saveSupportModes`, `loadLastDailyAdDate`/`saveLastDailyAdDate`; acrescentar cache + `subscribeSupportModes` e publicar no `save`
- `src/hooks/useSupportModes.ts` -- seletor; assina a mesma fonte
- `src/components/monetization/DailyAdModal.tsx:40-110` -- efeito com dependência `[onClose]`; ao carregar, hoje retorna o `AffiliateFallbackModal` também quando `adReady` (linha ~108) — mostrar só o anúncio
- `src/components/monetization/NativeAdBanner.tsx` -- reescrever com `NativeAd.createForAdRequest(ADMOB_IDS.nativeAdvanced, adRequestOptions(consent))`, `NativeAdView`, `NativeAsset` (headline, advertiser, callToAction), `NativeMediaView`, e `destroy()` ao desmontar; exemplos em `node_modules/react-native-google-mobile-ads/src/ads/native-ad/`
- `src/components/monetization/SupportBanner.tsx`, `AppOpenAdHost.tsx` -- já usam o consentimento; manter
- `src/components/monetization/SupportModeSelector.tsx:17-23` -- textos das opções
- Inicialização: `MobileAds().initialize()` (export `MobileAds`) num ponto único, ex. no `MonetizationHosts` antes de montar os anúncios

## Tasks & Acceptance

**Execution:**
- [x] `src/modules/monetization/MonetizationSettingsStore.ts` -- cache + assinantes dos modos; função pura `shouldShowDailyAd(lastDate, today)` -- fonte única
- [x] `src/hooks/useSupportModes.ts`, `app/_layout.tsx` -- assinar a fonte; `MonetizationHosts` reage na hora; inicializar o SDK; gravar a data diária só ao fechar -- AC 1
- [x] `src/components/monetization/DailyAdModal.tsx` -- não recriar por `onClose`; não mostrar o fallback junto do anúncio carregado; avisar o pai ao fechar -- matriz
- [x] `src/components/monetization/NativeAdBanner.tsx` -- anúncio nativo real com a API nova -- matriz
- [x] `src/components/monetization/SupportModeSelector.tsx` -- textos conforme a decisão do banner
- [x] `src/modules/monetization/__tests__/supportModes.test.ts` -- assinantes recebem a mudança; `shouldShowDailyAd`

**Acceptance Criteria:**
- Given o app aberto, when ligo ou desligo qualquer modo em Sobre, then o anúncio correspondente aparece ou some sem reiniciar
- Given cada modo com anúncio ligado num build de desenvolvimento, when uso o app, then o anúncio de teste do Google aparece (verificação no aparelho)

## Implementation Notes

- Fonte única em `MonetizationSettingsStore.ts`: cache em memória + `subscribeSupportModes`/`getCachedSupportModes` (padrão de `adConsent.ts`); `saveSupportModes` publica antes de gravar (vale na sessão mesmo se a gravação falhar); gravação durante a leitura vence. `shouldShowDailyAd(last, today)` puro e `dailyAdDay()` (mesmo dia UTC de antes, frequência inalterada).
- `useSupportModes` assina a fonte; `toggleMode` calcula a partir de um ref (sem efeito colateral dentro do `setState`). `MonetizationHosts` usa o mesmo hook, então o seletor em Sobre e os anúncios veem a mesma escolha na hora. Desligar um modo esquece o "fechar" do banner/nativo, para religar mostrar de novo.
- SDK: `ensureMobileAdsInitialized()` em `src/components/monetization/mobileAdsInit.ts` (promessa única; `.web.ts` vazio para o bundle web). Só é chamado com algum modo de anúncio ligado, fora do demo; os anúncios só montam depois dele. Falha não bloqueia: cada anúncio cai no próprio fallback.
- Diário: o efeito reage a ligar o modo com o app aberto; a data é gravada em `handleDailyClose` (fechar o intersticial ou o fallback), com o dia da checagem; um ref de sessão impede repetir no mesmo dia se a gravação falhar. `DailyAdModal` guarda `onClose` em ref (efeito com `[]`), não mostra mais o fallback junto do anúncio carregado e cai no fallback se `show()` falhar.
- Nativo: `NativeAd.createForAdRequest(ADMOB_IDS.nativeAdvanced, { ...adRequestOptions(consent), adChoicesPlacement: TOP_LEFT })`, `NativeAdView` com `NativeMediaView` 120×120, `NativeAsset` de título, anunciante (se houver) e botão, selo "Anúncio"; `destroy()` ao desmontar ou ao mudar o consentimento; falha → nada.
- Textos: "Banner" diz que é do Google com a barra de afiliados como reserva; diário e nativo dizem que são do Google; abertura diz "ao voltar ao app" (era "ao abrir ou retornar", que não batia com a frequência).
- Sem teste de componente/hook (D23); conferir no aparelho.

## Spec Change Log

## Review Triage Log

| Achado | Veredito | Evidência |
|---|---|---|
| Init do SDK que nunca termina esconde todos os modos, inclusive o fallback; falha fica em cache sem aviso | medium | `MonetizationHosts` só monta com `sdkReady`. **patch**: timeout, nova tentativa, aviso em dev. |
| Dia do intersticial em UTC (vira às 21h no Brasil) | medium | `toISOString()`; já era assim, mas a intenção é 1× por dia local. **patch**. |
| Intersticial aparece quando carregar, mesmo minutos depois | medium | Sem prazo de carga; política do Google. **patch**: desiste em ~10 s. |
| `show()` síncrono que lança não vai ao fallback | low | Correção direta (try/catch). **patch**. |
| Abertura do app logo depois de fechar o intersticial | medium | `AppOpenAdHost` mostra ao voltar ao primeiro plano. **patch**: trava compartilhada. |
| Nativo sem mídia deixa caixa vazia | low | `NativeMediaView` sempre 120×120. **patch** (ícone como alternativa). |
| Nativo de ~137 dp cobre conteúdo | medium | Só confirmável no aparelho. **defer** D24. |
| Fluxo do diário, hook e init sem teste | medium (gap) | Sem infraestrutura de teste de hook. **defer** D25. |
| Sem UMP | false | Decisão do dono (21/10): sem UMP. |
| Desligar o diário com o anúncio na tela não grava o dia | low | Anúncio cobre a tela; caso raro. rejeitado |
| App aberto na virada do dia não mostra o novo diário | low | Mostra na próxima abertura. rejeitado |
| `destroy()` do nativo durante a troca de consentimento | maybe-false | Seria low; checar no aparelho se há erro nativo. rejeitado |
| Nativo que falhou não tenta de novo | low | Volta na próxima abertura. rejeitado |
| Gravações rápidas dos modos fora de ordem | low | Raro; correção pede fila de escrita. rejeitado |
| App fechado no meio do anúncio mostra de novo na próxima abertura | low | Troca deliberada: só grava ao fechar. rejeitado |
| Pequenos ajustes do `NativeAdBanner` (`require` por render, número mágico) | low | Sem dano. rejeitado |

**Rota:** 6 `patch`, 2 `defer` (D24, D25), 7 rejeitados, 1 falso. Sem loopback.

## Verification

**Commands:**
- `npx vitest run src/modules/monetization` -- expected: passa
- `npx vitest run` e `npx tsc --noEmit` -- expected: sem falhas; tsc exit 0

**Manual checks (if no CLI):**
- Em build de desenvolvimento no aparelho, ligar cada modo e ver o anúncio de teste (banner, intersticial, nativo, abertura ao voltar ao app)
