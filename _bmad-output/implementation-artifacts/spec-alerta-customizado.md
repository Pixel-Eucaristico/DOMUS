---
title: 'Trocar o alerta nativo pelo alerta customizado do app'
type: 'bugfix'
created: '2026-10-23'
status: 'in-progress'
baseline_commit: 'a6a9a6f'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/AGENTS.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** O app mostra o alerta nativo do Android (`Alert.alert`, e `window.confirm`/`window.alert` na web) em 48 lugares de 25 arquivos, fora do visual do DOMUS. A regra do dono é usar sempre o alerta customizado. Além disso, na tela Sobre, a linha "Consultas de itens, preços e ícones" ficou fora do padrão: o texto longo da Story 12.7 ocupa 12 linhas e desalinha o interruptor.

**Approach:**
- Um alerta customizado único, no estilo do `ConfirmDeleteModal` (folha que sobe, tema do app, botões `TButton`), montado uma vez na raiz (`app/_layout.tsx`) e chamado de qualquer lugar por uma função com a mesma forma do `Alert.alert` (título, mensagem, botões com `text`, `style` "cancel"/"destructive"/"default" e `onPress`) e um `appConfirm(...)` que devolve `Promise<boolean>`. Funciona igual no Android, iOS e web.
- Trocar os 48 usos; `confirmAsync` passa a usar o alerta customizado.
- Na tela Sobre, a linha da flag mostra uma descrição curta do tamanho das outras e um "Saiba mais" que abre o alerta customizado com o texto completo da Story 12.7 (o que envia e o que se perde), mantendo o que a 12.7 pede.
- Registrar a regra no `AGENTS.md`.

## Boundaries & Constraints

**Always:** texto em pt-BR com acentos; mesmos títulos, mensagens, botões e efeitos de cada alerta trocado (inclusive o que acontece ao cancelar ou tocar fora, que vale como o botão "cancel" ou, sem ele, como fechar); um alerta por vez, os seguintes em fila; chamável fora de componentes (serviços e hooks); a lógica da fila fica num módulo sem `react-native`, testável no vitest; um teste falha se aparecer `Alert.alert`, `window.alert` ou `window.confirm` em `app/` ou `src/`.

**Never:** mudar o que cada alerta faz; usar `Alert` do `react-native` em código novo; mexer em `packages/sync`, `ios/`, `android/`.

## I/O & Edge-Case Matrix

| Cenário | Chamada | Resultado |
|---|---|---|
| Aviso simples | `appAlert("Erro", "Falhou")` | alerta customizado com botão "OK" |
| Confirmação | botões Cancelar + Excluir (`destructive`) | Excluir em vermelho; cada botão chama o seu `onPress` |
| Tocar fora / voltar do Android | alerta com botão `cancel` | chama o `onPress` do cancel |
| `appConfirm` | usuário confirma / cancela | `true` / `false` |
| Dois alertas seguidos | duas chamadas | o segundo aparece depois de fechar o primeiro |
| Chamado antes de a raiz montar | serviço no início do app | aparece quando a raiz monta |
| Web | qualquer alerta | mesmo alerta customizado (não `window.confirm`) |

</frozen-after-approval>

## Code Map

- `src/components/shared/ConfirmDeleteModal.tsx` -- estilo de referência
- `app/_layout.tsx` -- onde montar o alerta
- `src/utils/confirmAsync.ts` -- passa a usar o alerta customizado
- 25 arquivos com `Alert.alert` / `window.confirm` / `window.alert` (`grep -rn` em `app` e `src`)
- `app/about.tsx` (`SwitchRow`), `src/constants/privacyFlagTexts.ts`, `src/components/privacy/PrivacyFlagNote.tsx` -- linha da flag
- `AGENTS.md` -- registrar a regra

## Tasks & Acceptance

**Execution:**
- [ ] Fila pura (sem `react-native`) + alerta customizado + montagem na raiz + testes da fila
- [ ] Trocar os 48 usos e o `confirmAsync`; teste que barra o alerta nativo
- [ ] Linha da flag na tela Sobre com descrição curta e "Saiba mais"
- [ ] Regra no `AGENTS.md`

**Acceptance Criteria:**
- Given qualquer alerta do app, when ele aparece, then é o alerta customizado, no Android, no iOS e na web
- Given a tela Sobre, when vejo a linha "Consultas de itens, preços e ícones", then ela tem o tamanho e o alinhamento das outras, e o "Saiba mais" mostra o texto completo

## Verification

- `npx vitest run` e `npx tsc --noEmit` sem falhas novas
- Build web e captura da tela Sobre e de um alerta (Playwright)
