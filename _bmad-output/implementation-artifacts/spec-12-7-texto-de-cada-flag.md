---
title: 'Story 12.7: Dizer em cada flag o que transmite e o que se perde'
type: 'chore'
created: '2026-10-21'
status: 'done'
baseline_commit: '53c52a50d1154dbf7b7ecaf2fb3f0658c8eab701'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-12-context.md'
  - '{project-root}/docs/politica-de-privacidade.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Só duas flags (consultas de itens e anúncios personalizados) dizem o que enviam e o que se perde. As outras não dizem o que se perde, e algumas telas contradizem a política: Sobre diz "Nenhum dado é enviado para servidores" e "SQLite criptografado"; o sync diz "criptografia ponta-a-ponta"; o Firebase diz "anônimos"; a IA diz "Nenhum dado pessoal (CPF, nome, conta)"; o backup pede "Ative o auto-backup", que não existe. A política ainda não traz as Stories 12.4 a 12.6, nem os adiados D17 e D22.

**Approach:** Uma frase "Envia: … / Sem isso: …" por flag, num só arquivo de textos, usada ao lado de cada flag no app; a política (`docs/politica-de-privacidade.md`), a tela da política e o `PLAY_STORE_LISTING.md` repetem as mesmas frases; um teste garante que as três cópias contêm cada frase. As frases que contradizem a política são corrigidas.

## Boundaries & Constraints

**Always:** só afirmar o que o código faz hoje na `dev` (12.1 a 12.6 e a correção dos modos de apoio entregues); pt-BR com acentos; `docs/politica-de-privacidade.md` é a fonte, e a tela e o listing mudam junto; flags cobertas: IA (ligar e permissões de dados), voz, OCR por visão da IA, Cloud Vision, sync, Google Drive (é a flag do envio do backup automático; a cópia local cifrada não sai do aparelho), Firebase (os três interruptores), modos de apoio com anúncio, anúncios personalizados, consultas de itens; incluir na política o D17 (busca com código de afiliado, ID da instalação do Firebase, IP visto por Firebase e AdMob, localização aproximada do AdMob, ID de publicidade no Analytics) e o D22 (anúncio não personalizado por padrão, interruptor em Sobre → Apoio & Anúncios); atualizar a data da política.

**Never:** mudar comportamento ou criar flag nova; criar central de privacidade; mudar `docs/data-safety.md` além de alinhar o que a 12.4 e a 12.6 mudaram; inventar categoria jurídica (D14 continua com o dono).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Cada flag no app | tela da flag aberta | mostra "Envia: …" e "Sem isso: …" | N/A |
| Cópias sincronizadas | frase de uma flag | aparece igual na política `.md`, na tela da política e no listing | teste falha se faltar |
| Texto contraditório | Sobre, sync, Firebase, IA, backup | frase corrigida para o que o código faz | N/A |

</frozen-after-approval>

## Code Map

- `src/constants/privacyFlagTexts.ts` (novo, sem `react-native`) -- `PRIVACY_FLAG_TEXTS: Record<FlagId, { sends: string; loses: string }>`
- `app/ai-settings.tsx:198-205` (Ativar IA), `:464-530` + `src/modules/ai/domain/AISettings.ts:32-60` (permissões; corrigir "Nenhum dado pessoal (CPF, nome, conta)"), `:294-299` (Modo Voz: nomear OpenAI, Gemini, ElevenLabs e dizer que a gravação sai do aparelho), `:431-443` (OCR por visão)
- `app/ocr-settings.tsx:155-185,238-247` -- Cloud Vision: a foto vai ao Google; usada se o OCR do aparelho falhar
- `app/sync.tsx:207,220,278,344` -- tirar "criptografia ponta-a-ponta"; seguir §2 da política (chave derivada do código do grupo, metadados em claro, registros ficam nos relays)
- `app/backup.tsx:345,359,369` -- Drive envia a cópia cifrada; trocar "Ative o auto-backup" por texto verdadeiro (a cópia local é automática)
- `app/analytics-settings.tsx:89-93,109-130,198-201` + `src/components/tour/WelcomeCarousel.tsx:343-382` -- tirar "anônimos"/"não identifica você"; dizer ID da instalação e IP
- `src/components/monetization/SupportModeSelector.tsx:18-22,85-88` -- modos com anúncio: ID de publicidade e dados do aparelho ao Google
- `app/about.tsx:116-118,143` -- corrigir "Nenhum dado é enviado para servidores" e "SQLite criptografado" (ver §1)
- `docs/politica-de-privacidade.md` (§1 a §8), `app/privacy-policy.tsx` (cópia JSX: §1 :91 … §8 :291, `LAST_UPDATED`), `PLAY_STORE_LISTING.md` (:31, :55-61 e a cópia da política :111-241)
- `docs/data-safety.md` -- alinhar F7/F10 (anúncios) e F12-F16 (consultas) às flags novas

## Tasks & Acceptance

**Execution:**
- [x] `src/constants/privacyFlagTexts.ts` -- frases por flag, a partir da política
- [x] telas do Code Map -- mostrar as duas frases junto de cada flag e corrigir os textos contraditórios -- AC 1
- [x] `docs/politica-de-privacidade.md`, `app/privacy-policy.tsx`, `PLAY_STORE_LISTING.md` -- mesmas frases por seção; D17 e D22; data -- AC 2
- [x] `docs/data-safety.md` -- alinhar anúncios e consultas
- [x] `src/constants/__tests__/privacyFlagTexts.test.ts` -- cada flag tem `sends` e `loses`; cada frase aparece nos três arquivos (lidos com `fs`) -- matriz
- [x] `_bmad-output/implementation-artifacts/deferred-work.md` -- marcar D17 e D22 como resolvidos

**Acceptance Criteria:**
- Given cada flag da lista, when a abro no app, then vejo o que é enviado e o que perco
- Given a política, a tela da política e o listing, when os comparo, then dizem o mesmo de cada flag e refletem 12.1 a 12.6

## Implementation Notes

- 13 flags em `PRIVACY_FLAG_TEXTS` (o Firebase tem uma por interruptor); `PrivacyFlagNote` (`src/components/privacy/`) mostra "Envia:" e "Sem isso:" junto de cada flag; o Sobre e o aviso único das consultas usam `formatPrivacyFlagText`.
- Na política e no listing, cada flag é um item `- **Título.** Envia: … Sem isso: …` na seção do recurso; na tela da política, `<FlagItem sends="…" loses="…" />` com as frases em atributo (por isso as frases não têm aspas duplas nem chaves; o teste confere).
- Textos corrigidos além do Code Map, por afirmarem o contrário da política: `AnalyticsConsentModal` (sem uso, mas dizia "100% anônimo"), `notification-settings.tsx` ("Nenhum dado é enviado para servidores"), intro do sync em `screenIntroContent.ts` ("ponta-a-ponta"), descrições das permissões da IA (alinhadas ao `AIContextBuilder`), descrição da chave de API ("AES-256" → armazenamento seguro) e o aviso único das consultas (dizia que o NCM era enviado; só a tabela é baixada).
- A política passou a dizer que o Cloud Vision, quando escolhido como provedor principal, recebe a foto primeiro (`useInvoiceScanner.ts`), e que o OCR por visão da IA só roda no chat com "OCR por Visão (IA)" ligado.
- O Analytics não registra telas nem eventos próprios (nenhuma chamada a `logEvent`/`logScreenView`); o texto fala em eventos coletados automaticamente pelo Firebase.

## Spec Change Log

## Review Triage Log

| Achado | Veredito | Evidência |
|---|---|---|
| "Sem isso" das consultas diz que só NCM e palavras classificam, mas a IA também classifica | medium | `classifyItemFull` usa a IA com `aiEnabled`. **patch**. |
| Texto do acesso aos dados omite campos enviados e diverge dos rótulos | medium | `buildFinancialContext` envia tipo, itens, grupo, XP da temporada, maior sequência, troféus. **patch**. |
| "Cada recurso que envia dados tem uma opção" exagera | medium | SEFAZ, link colado e busca com afiliado não têm interruptor. **patch**. |
| Título da §7 diz que nada pessoal é enviado | medium | Contradiz os itens da própria seção. **patch**. |
| `adModes` promete que nenhum anúncio aparece | low | Reescrito para o que o código garante (nenhum pedido ao Google). **patch**. |
| Crashlytics recebe mensagens de erro não citadas; tela do Firebase diverge das notas | medium | `crashlytics().log(...)` em `AnalyticsService.ts`. **patch**. |
| Legenda da chave diz armazenamento seguro também na web | medium | Política §1: na web a chave é cifrada com chave do navegador. **patch**. |
| Carrossel escreve texto próprio do Firebase | medium | Fora da fonte única e do teste. **patch**. |
| `data-safety.md` F3, F5, F6 desatualizados | medium | Contradizem a política nova. **patch**. |
| Regex do teste sem `&`, `<`, `>`; nada garante a nota na tela | medium (gap) | **patch**: regex e teste de presença por flag. |
| Tela da política copia as frases em vez de importar | low | O teste compara o código-fonte; funciona. rejeitado |
| `AnalyticsConsentModal` sem nota | false | Componente sem uso no app. |
| Leitura de arquivos na coleta do teste | low | Só piora a mensagem de erro. rejeitado |
| `.replace("\n")` no aviso das consultas | low | O formatador gera uma quebra só. rejeitado |
| Interruptor das consultas em formato diferente | low | Cosmético. rejeitado |
| Frase no item da flag errada passaria no teste | low | Revisado à mão; correção pede parser. rejeitado |
| Notas enviadas à IA não são as "recentes" | low | O rótulo novo não diz "recentes". rejeitado |

**Rota:** 10 `patch`, 6 rejeitados, 1 falso. Sem loopback.

## Verification

**Commands:**
- `npx vitest run src/constants` -- expected: passa
- `npx vitest run` e `npx tsc --noEmit` -- expected: sem falhas; tsc exit 0
- `grep -rn "ponta-a-ponta\|Nenhum dado é enviado\|SQLite criptografado" app src` -- expected: nada
