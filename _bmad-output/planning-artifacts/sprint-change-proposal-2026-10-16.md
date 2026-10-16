---
title: 'Sprint Change Proposal — Recursos do ROADMAP legado'
status: approved
approved: '2026-10-16'
created: '2026-10-16'
mode: batch
trigger: pedido do dono (requisito novo de stakeholder)
scope: moderate
---

# Sprint Change Proposal — Recursos do ROADMAP legado

## 1. Resumo do problema

**Gatilho.** O dono pediu para trazer ao plano BMAD da `dev` quatro itens que vinham do `ROADMAP.md` antigo e do Taskmaster e que não estão em nenhum épico:

1. **Leitor de holerite por OCR** (ROADMAP tarefa 09): parser do texto do holerite, captura por câmera ou galeria (Vision IA com fallback para o OCR do aparelho), revisão editável, lançamento do líquido como receita, histórico com gráfico.
2. **Tooltips inteligentes** (ROADMAP Fase 4): dicas ancoradas com glossário financeiro e atalhos no chat da IA, respeitando a opção `tooltipsEnabled` que hoje não faz nada.
3. **Animação individual dos troféus** (ROADMAP tarefa 08): configuração por categoria e por troféu, motor de movimento, efeitos e partículas, e prévia no DebugTools. A aprovação de cada troféu fica com o dono.
4. **Taskmaster #1**: testes de replay para os tipos de evento sem cobertura.

**Tipo.** Requisito novo de stakeholder. Não foi revelado por nenhuma story do sprint.

**Evidências.**
- `ROADMAP.md` (tarefas 08, 09 e "Pendências da Fase 4") e `.taskmaster/tasks/tasks.json` (tarefa 1, pendente).
- Uma implementação desses itens foi feita fora do processo, a partir da `main`, e **descartada** a pedido do dono para ser refeita pelo BMAD. Ela serve só como prova de viabilidade: os quatro itens cabem no código atual sem dependência nova.
- A tarefa 1 do Taskmaster cita caminhos de outro projeto (`/home/devuser/projects/Orcafacil-Monorepo/test/replay.test.ts`, `OrderShippedEvent`). É um modelo genérico, não uma especificação do DOMUS.

## 2. Análise de impacto

### 2.1 Checklist

| Item | Status | Achado |
|---|---|---|
| 1.1 Story gatilho | N/A | Pedido direto do dono, sem story de origem. |
| 1.2 Problema | [x] | Requisito novo; quatro itens fora do PRD. |
| 1.3 Evidências | [x] | Ver §1. |
| 2.1 Épico atual (Epic 1) | [x] | Não é afetado. O prazo da Play (25/10) continua prioritário. |
| 2.2 Mudança em épicos | [!] | Precisa de um épico novo (Epic 11). Nenhum épico existente cobre UI nova. |
| 2.3 Épicos futuros | [!] | O holerite depende do Epic 3 (3.1, 3.3 e 3.8) e, para sincronizar, de uma decisão sobre o Epic 4 (ver §2.3). |
| 2.4 Épicos obsoletos | [x] | Nenhum. A tarefa 1 do Taskmaster já está coberta pelo Epic 3. |
| 2.5 Ordem | [!] | O Epic 11 entra depois do Epic 1, com as stories de holerite depois do Epic 3. |
| 3.1 PRD | [!] | Conflita com dois não-objetivos do §5 (ver §2.2). |
| 3.2 Arquitetura | [!] | AD-4 (rota do tipo novo), FR-15/FR-17 (versões publicadas) e AD-10 (troféus). |
| 3.3 UX | N/A | Não há documento de UX; as telas seguem os padrões do app. |
| 3.4 Outros artefatos | [!] | Data safety (story 1.5) e o inventário do FR-8a passam a incluir o holerite. |
| 4.x Caminho | [x] | Ajuste direto com emenda ao PRD (híbrido das opções 1 e 3). |

### 2.2 Conflitos com o PRD

- **§5 "Interface nova do app"** é não-objetivo. O holerite (tela nova) e os tooltips (componentes novos) são interface nova. → Precisa de emenda explícita ao §5.
- **§5 "Reformulação dos troféus"** consta como "em andamento fora deste PRD". O `ROADMAP.md` §3.4 mostra essa reformulação acontecendo por **Lottie**, troféu a troféu com aprovação (ex.: `seasonal_volta_aulas` aprovado, "16 sazonais restantes"). A tarefa 08 anima o **fallback SVG** (`AnimatedTrophy` / `AnimatedSeasonalTrophy`), que só aparece quando não há Lottie aprovado. Fazer as duas coisas em paralelo duplica esforço e pode dar animações diferentes para o mesmo troféu. → **Decisão do dono** (ver §6, D1).

### 2.3 Conflitos com a arquitetura e riscos técnicos

- **AD-4.** `PAYSLIP_RECORDED` e `PAYSLIP_DELETED` precisam entrar em `EVENT_TYPES` de `packages/events` e ser roteados ao `domainReducer`. Sem isso, o tipo novo é descartado em silêncio.
- **FR-15, FR-17 e NFR-4 (Epic 3).** Hoje, um aparelho com versão antiga que recebe `PAYSLIP_*` pelo sync ignora o tipo, sem Quarentena e sem reprocessamento garantido depois da atualização. O FR-17 também pede `schemaVersion` em payload novo. → As stories de evento do holerite dependem das stories **3.1, 3.3 e 3.8**.
- **Sigilo (Epic 4).** O holerite traz salário, nome do empregador, CNPJ e nome do funcionário. O PRD já tratou um dado sensível (a preferência religiosa) como "só sincroniza depois do Grupo forte" (FR-8b). Pelo Grupo antigo (XOR, código de 6 caracteres), esses dados ficam legíveis por força bruta. Proposta: **não guardar o nome do funcionário**, e o dono decide se o holerite sincroniza antes do Epic 4 (ver §6, D2).
- **AD-3.** O parser de holerite e o resumo do histórico ficam em `packages/parsers` e `packages/domain`, puros, sem `react`/`expo`. A captura fica em `src/hooks`.
- **AD-10.** A animação de troféus é só visual e não mexe no sorteio, então não conflita com a regra do colecionável.
- **Data safety (story 1.5).** O Vision OCR envia a **foto do holerite** ao provedor de IA escolhido. O fluxo "provedores de IA" já está na lista do FR-5; a story 1.5 precisa citar documentos financeiros como exemplo de dado enviado.

### 2.4 Impacto em stories existentes

- **Story 1.5** (Data safety): acrescentar o holerite ao texto do fluxo de IA e OCR (critério novo, abaixo).
- **Story 9.1** (inventário do FR-8a): o holerite é Evento; classificar como "vira Evento", com nota de sensibilidade.
- **Taskmaster #1**: encerrada como coberta pelas stories **3.2** (isolar evento no replay) e **3.4** (ordem total), que já exigem testes de replay. Não vira story nova.

## 3. Caminho recomendado

**Abordagem: ajuste direto com emenda ao PRD (híbrido das opções 1 e 3).**

- **Opção 1, ajuste direto:** viável. Um épico novo (Epic 11) com 8 stories, sem mudar os épicos atuais. Esforço médio, risco baixo, desde que o holerite respeite a ordem do Epic 3.
- **Opção 2, rollback:** não se aplica. Nada do sprint precisa ser desfeito.
- **Opção 3, revisão do MVP:** só na parte da emenda. O §5 do PRD muda para permitir esses três recursos de UI, e três FRs novos (FR-25 a FR-27) entram com prioridade **depois** do Epic 1.

**Por quê.** O prazo da Play (FR-1 e FR-5, até 25/10) continua intocado. Os tooltips não têm dependência e podem vir logo depois do Epic 1. O holerite espera o log robusto (Epic 3) para não quebrar as versões publicadas. A animação de troféus fica condicionada à decisão sobre o Lottie, para não duplicar trabalho.

**Estimativa.** Tooltips: baixa. Holerite: média (4 stories). Troféus: média, mais o tempo de aprovação do dono. Nenhum impacto no cronograma do Epic 1.

## 4. Propostas de mudança

### 4.1 PRD — §5 Não-objetivos

```
OLD:
- **Interface nova do app.** Além de mensagens de reconexão, migração e privacidade.

NEW:
- **Interface nova do app.** Além de mensagens de reconexão, migração e privacidade,
  e dos recursos do FR-25 (tooltips), FR-26 (holerite) e FR-27 (animação de troféus),
  incluídos pela Sprint Change Proposal de 16/10/2026.
```

```
OLD:
- **Reformulação dos troféus.** Está em andamento fora deste PRD; a regra do colecionável fica como insumo (§4.6).

NEW:
- **Reformulação dos troféus.** Está em andamento fora deste PRD (Lottie, ROADMAP §3.4);
  a regra do colecionável fica como insumo (§4.6). Só a animação do fallback SVG entra,
  pelo FR-27, conforme a decisão D1 da Sprint Change Proposal de 16/10/2026.
```

### 4.2 PRD — nova seção §4.8 H. Recursos de uso (antes dos NFRs)

```
#### FR-25: Tooltips com glossário financeiro
O usuário toca num ícone de informação e lê a explicação de um termo financeiro sem sair da tela.

Consequências (testáveis):
- Um glossário único (`src/constants/financialGlossary.ts`) alimenta todas as dicas.
- A dica é um balão ancorado ao ícone, que abre acima ou abaixo conforme o espaço e fecha ao tocar fora.
- Há dicas no orçamento 50/30/20, no campo de dividendo do CDB e na tela de holerites.
- No chat da IA, termos do glossário citados na resposta viram atalhos "O que é…?", só com `tooltipsEnabled` ligado.
- Nenhuma dependência nova.

#### FR-26: Leitor de holerite
O usuário fotografa o holerite e acompanha a evolução do salário e dos descontos.

Consequências (testáveis):
- O parser extrai empresa, CNPJ, competência (YYYY-MM), bruto, líquido, rubricas, descontos e FGTS,
  sem tratar bases de cálculo como desconto, e informa confiança e avisos.
- A captura usa o Vision OCR quando há provedor com visão; senão, o OCR do aparelho.
- O usuário revisa e corrige antes de salvar; pode lançar o líquido como receita (categoria "salario").
- O holerite é Evento (`PAYSLIP_RECORDED` / `PAYSLIP_DELETED`) com `schemaVersion`; a mesma
  competência e o mesmo empregador substituem a leitura anterior.
- O nome do funcionário não é guardado.
- A tela mostra o histórico, o gráfico líquido × bruto e o total por desconto.
- Depende de FR-15 e FR-17.

#### FR-27: Animação por troféu (fallback SVG)
O usuário vê, em cada troféu sem Lottie aprovado, uma animação ligada ao tema dele.

Consequências (testáveis):
- Toda configuração vem de `src/constants/trophyAnimationConfigs.ts` (categoria + ajuste por troféu), e
  um teste garante configuração válida para todos os troféus do app.
- Troféus com Lottie aprovado continuam usando o Lottie.
- Em listas estáticas, o troféu aparece sem efeitos.
- O DebugTools mostra a configuração de cada troféu para a aprovação individual do dono.
```

### 4.3 PRD — §6.3 Ordem de entrega

```
NEW (linha acrescentada depois da ordem 1):
| 1b | FR-25 | sem dependência; não disputa com o prazo da Play |

NEW (linha acrescentada depois da ordem 5):
| 5b | FR-26 | depende do log robusto (FR-15, FR-17) |

NEW (linha acrescentada ao fim):
| 12 | FR-27 | depois da decisão D1 sobre o Lottie |
```

### 4.4 Épicos — novo Epic 11

```
### Epic 11: Recursos de uso
A pessoa entende os termos financeiros na hora, acompanha o salário pelo holerite e vê
troféus animados conforme o tema.
**FRs covered:** FR-25, FR-26, FR-27
**Depende de:** Epic 3 (stories 3.1, 3.3 e 3.8) para as stories 11.4 a 11.6; decisão D1 para 11.7 e 11.8.
```

Stories (critérios no formato Given/When/Then entram no `epics.md` ao aplicar):

| Story | Título | FR | Depende de |
|---|---|---|---|
| 11.1 | Criar o glossário financeiro e o balão de dica | FR-25 | — |
| 11.2 | Mostrar dicas nas telas e atalhos no chat da IA | FR-25 | 11.1 |
| 11.3 | Extrair os dados do holerite a partir do texto do OCR | FR-26 | — |
| 11.4 | Registrar o holerite como evento com `schemaVersion` | FR-26 | 3.1, 3.3, 3.8 |
| 11.5 | Capturar, revisar e salvar o holerite | FR-26 | 11.3, 11.4 |
| 11.6 | Mostrar o histórico e o gráfico do holerite | FR-26 | 11.5 |
| 11.7 | Configurar a animação de cada troféu | FR-27 | D1 |
| 11.8 | Animar os troféus pela configuração e mostrar a prévia | FR-27 | 11.7 |

### 4.5 Story existente — 1.5 (Data safety)

```
Section: Acceptance Criteria

NEW (critério acrescentado):
**And** o fluxo "provedores de IA e OCR" cita que fotos de documentos financeiros
(nota fiscal e holerite) são enviadas ao provedor escolhido pelo usuário.
```

### 4.6 Sprint status

Acrescentar `epic-11: backlog`, as stories 11.1 a 11.8 em `backlog` e `epic-11-retrospective: optional`.

### 4.7 Taskmaster

Marcar a tarefa 1 como `cancelled`, com a nota "coberta pelas stories 3.2 e 3.4 do plano BMAD".

## 5. Entrega

- **Escopo:** moderado. Reorganiza o backlog com uma emenda pequena ao PRD; a arquitetura não muda.
- **Responsáveis:**
  - Dono: aprovar esta proposta e decidir D1, D2 e D3.
  - PO/Dev (BMAD): aplicar as emendas no PRD, `epics.md`, `sprint-status.yaml` e Taskmaster.
  - Dev (`bmad-build`): implementar as stories na ordem do sprint, cada uma com spec, revisão e sync do status.
- **Critérios de sucesso:** PRD e épicos com FR-25 a FR-27 rastreáveis; Epic 11 no sprint-status; o Epic 1
  sem atraso; cada story do Epic 11 passa por `bmad-build` e revisão antes de `done`.

## 6. Decisões do dono

- **D1 — Troféus:** (a) fazer o FR-27 só para o fallback SVG, como proposto; (b) não fazer o FR-27 e seguir só com o Lottie; (c) parar o Lottie e usar só a configuração.
- **D2 — Sigilo do holerite:** (a) sincronizar como os gastos já sincronizam (Grupo antigo incluído); (b) só sincronizar depois do Epic 4, mantendo o holerite local até lá.
- **D3 — Ordem:** confirmar os tooltips (11.1 e 11.2) logo depois do Epic 1, antes do Epic 2.

## 7. Aprovação (16/10/2026)

O dono aprovou a proposta com estas decisões, que **substituem** o que diverge nas seções 3 e 4:

- **D1 = (c) Trocar o Lottie.** O FR-27 vale para **todos** os troféus: a animação por configuração substitui o Lottie, e a reformulação por Lottie do ROADMAP §3.4 é encerrada. Entra a story 11.9 (remover o Lottie do app: `lottie-react-native`, `assets/lottie/` com 6 MB e `APPROVED_LOTTIE`). Isso também elimina a falha conhecida do build web, que exige `@lottiefiles/dotlottie-react`.
- **D2 = (b) Só depois do Epic 4.** `PAYSLIP_*` não é publicado no Grupo antigo; o holerite fica no aparelho (e no backup do próprio Drive) até o Grupo forte. A story 4.5 passa a publicar esses eventos no Grupo forte.
- **D3 = Sim.** As stories 11.1 e 11.2 vêm logo depois do Epic 1, antes do Epic 2.

As emendas foram aplicadas no PRD, em `epics.md`, em `sprint-status.yaml` e no Taskmaster na mesma data.
