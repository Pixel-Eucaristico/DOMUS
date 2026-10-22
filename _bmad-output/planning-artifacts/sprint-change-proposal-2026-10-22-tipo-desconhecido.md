---
title: 'Sprint Change Proposal — tipo de evento desconhecido no sync'
status: approved
approved: '2026-10-22'
created: '2026-10-22'
mode: batch
trigger: conflito entre as Stories 3.1 e 3.3 ao iniciar o Epic 3
scope: minor
---

# Sprint Change Proposal — tipo de evento desconhecido no sync

## 1. Problema

A Story 3.1 pedia que um evento com `type` "fora dos tipos conhecidos" não fosse gravado. A Story 3.3 pede que um evento de tipo desconhecido (de uma versão mais nova do app no outro aparelho) não seja descartado, para ser reprocessado depois da atualização. As duas não cabem juntas: o que a 3.1 recusa, a 3.3 precisa reprocessar.

## 2. Decisão do dono (22/10/2026)

**Gravar e reprocessar.** A 3.1 recusa só envelope malformado: `id`, `type`, `timestamp`, `deviceId` ausentes ou do tipo errado, `type` vazio, `payload` nulo ou que não é objeto. Um `type` bem formado mas desconhecido é gravado; no replay ele fica sem efeito (Quarentena, Story 3.2) até uma versão que o conheça reprocessá-lo (Story 3.3).

## 3. Mudança

- `epics.md`, Story 3.1: o critério "`type` fora dos tipos conhecidos não é gravado" passa a "`type` ausente, vazio ou que não é texto não é gravado; um `type` bem formado e desconhecido é gravado para a Story 3.3".
