---
title: 'Sprint Change Proposal — Teclado nunca cobre o campo'
status: approved
approved: '2026-10-20'
created: '2026-10-20'
mode: batch
trigger: pedido do dono
scope: moderate
---

# Sprint Change Proposal — Teclado nunca cobre o campo

## 1. Resumo do problema

**Gatilho.** O dono pediu que, em todo campo de texto do app, a tela suba e o teclado nunca cubra o campo em uso.

**Diagnóstico (levantamento do código na `dev`):**

- **Dois sistemas de teclado, um deles morto.**
  - `react-native-avoid-softinput` está ligado globalmente em `app/_layout.tsx:337-345` e é quem faz as telas comuns subirem.
  - `react-native-keyboard-controller` (1.18.5) é usado em 4 telas (`KeyboardAwareScrollView`) e no `src/components/shared/KeyboardSafeView.tsx` dos modais. Mas **não há `KeyboardProvider` na raiz**: sem ele a biblioteca cai num contexto vazio e não faz nada.
- **Modais sem tratamento.** O RN `<Modal>` abre uma janela própria no Android. O AvoidSoftInput global não a alcança, e o `KeyboardSafeView` está inerte. Por isso nenhum modal com campo sobe.
- **Chat com três camadas.** O `app/ai-chat.tsx` tem um `KeyboardProvider` local. O GiftedChat 3.3.2 traz o seu próprio provider e um `KeyboardAvoidingView`. E o AvoidSoftInput global continua ativo. Isso pode deslocar a tela duas vezes ou deixar sobra de espaço.
- **Android 16 / target 36.** O modo *edge-to-edge* é obrigatório, e o `adjustResize` deixa de redimensionar a janela sozinho. O tratamento precisa vir do app (Story 1.3, adiado D6).

**Evidências — campos por local:**

| Grupo | Locais | Situação |
|---|---|---|
| Telas | add-transaction, ai-settings, backup, about, ocr-settings, sync, import-invoice (QR manual e itens), ParsedScreen | Sobem pelo AvoidSoftInput global; os `KeyboardAwareScrollView` estão inertes |
| Modais com `KeyboardSafeView` (inerte) | TransactionBottomSheet (nova transação da home), AccountFormModal, CreateListModal, AddItemModal | **Não sobem** |
| Modais sem nada | CategoryPickerModal, StoreGridModal, AccountPicker compacto, modal "APAGAR TUDO" (about), WelcomeCarousel (chave de IA no onboarding), DebugTools | **Não sobem** |
| Chat | ChatInputBar no GiftedChat | Três camadas ao mesmo tempo |

Sem uso: `src/components/shared/AppTextInput.tsx` e `components/KeyboardAwareScrollViewCompat.tsx`.

## 2. Análise de impacto

| Item | Status | Achado |
|---|---|---|
| Epic 1 | [!] | A Story 1.3 (Android 16) testa os mesmos fluxos; o D6 já cita edge-to-edge. Este plano corrige o que a 1.3 vai encontrar. |
| PRD | [!] | É correção de comportamento, não "interface nova" (§5). Entra como FR-29, em "Conformidade Play e plataforma", ligado ao FR-1. |
| Arquitetura | [x] | Decisão nova de padrão: **um só sistema de teclado** (proposta: keyboard-controller), registrado no spine como convenção de UI. |
| Epic 8 (SDK 55–57) | [!] | Cada salto do SDK reavalia o keyboard-controller junto dos patches. |
| Dependências | [!] | Se o AvoidSoftInput sair, `package.json` e `package-lock.json` mudam (npm 10). |

## 3. Caminho recomendado

Ajuste direto: novo **Epic 13 "Teclado nunca cobre o campo"**. Um só sistema, o `react-native-keyboard-controller`, porque:

- já está instalado e já é usado nos lugares certos;
- funciona dentro de modais;
- é o sistema que o GiftedChat usa.

O AvoidSoftInput global sai, para não deslocar a tela duas vezes. A correção fica centralizada em três peças comuns: o provider na raiz, uma rolagem padrão para telas e uma folha (sheet) padrão para modais. Assim cada tela só troca o contêiner.

**Ordem:** depois do envio do AAB (Story 1.6). Mexer no teclado do app inteiro a 5 dias do prazo arrisca o envio. Exceção: se a Story 1.3 achar campo coberto no Android 16 que impeça o uso, a Story 13.1 entra antes.

## 4. Propostas de mudança

### 4.1 PRD — FR-29

```
#### FR-29: Teclado nunca cobre o campo
O usuário digita em qualquer campo do app vendo o campo e o botão de confirmar.

Consequências (testáveis):
- Em toda tela, modal e bottom sheet, ao focar um campo, o conteúdo sobe ou rola até o
  campo ficar visível acima do teclado, com folga mínima de 8 dp.
- O botão principal do formulário (Salvar, Adicionar, Confirmar) fica alcançável com o
  teclado aberto, rolando se preciso.
- Ao fechar o teclado, a tela volta à posição original, sem espaço sobrando.
- Um só sistema de teclado no app (keyboard-controller, com `KeyboardProvider` na raiz).
- Vale no Android 16 com edge-to-edge e no navegador.
```

### 4.2 Épicos — Epic 13

| Story | Título | Cobre |
|---|---|---|
| 13.1 | Ligar o sistema único de teclado na raiz | `KeyboardProvider` em `app/_layout.tsx` (translúcido para edge-to-edge); remover o AvoidSoftInput global e a dependência; o `KeyboardAwareScrollView` das 4 telas e o `KeyboardSafeView` passam a funcionar |
| 13.2 | Padronizar a rolagem das telas com campos | Wrapper único (a partir do `KeyboardAwareScrollViewCompat`) em add-transaction, ai-settings, backup, about, ocr-settings, sync e ParsedScreen, com `bottomOffset` comum e `keyboardShouldPersistTaps` |
| 13.3 | Fazer os modais com formulário subirem | `KeyboardSafeView` funcionando dentro do RN Modal em TransactionBottomSheet, AccountFormModal, CreateListModal, AddItemModal; o botão principal visível |
| 13.4 | Fazer as buscas e diálogos em modal subirem | CategoryPickerModal, StoreGridModal, AccountPicker compacto, "APAGAR TUDO", WelcomeCarousel (chave de IA), DebugTools |
| 13.5 | Um só deslocamento no chat da IA | Sem o provider local; GiftedChat configurado por `keyboardProviderProps`/`keyboardAvoidingViewProps`; sem sobra nem falta de espaço |
| 13.6 | Corrigir a digitação manual da chave da NF sobre a câmera | Barra inferior do `QrScanScreen` com `autoFocus` sobe acima do teclado |
| 13.7 | Verificar todos os campos no aparelho | Checklist em `docs/` com cada campo da tabela §1, no Android 16 e no navegador; entra junto da checklist da Story 1.3 |

Critérios de cada story, no formato Given/When/Then, entram no `epics.md` ao aplicar. Critério comum a todas: dado um campo focado, o campo e o botão principal ficam visíveis acima do teclado, e ao fechar o teclado não sobra espaço.

### 4.3 Arquitetura — spine

Convenção nova na tabela de padrões: "Teclado: só `react-native-keyboard-controller` (`KeyboardProvider` na raiz); telas usam a rolagem padrão, modais usam o `KeyboardSafeView`; não usar `KeyboardAvoidingView` do RN nem AvoidSoftInput."

### 4.4 Sprint status

`epic-13: backlog`, stories 13.1 a 13.7 em `backlog`, `epic-13-retrospective: optional`.

## 5. Entrega

- **Escopo:** moderado; épico novo, FR-29 e uma convenção no spine.
- **Dev (`bmad-build`):** uma story por vez, com conferência visual. Na web, por screenshot com teclado simulado não dá para provar, então o teste real é no aparelho (13.7).

## 6. Decisões do dono

- **D-K1 — Sistema único:** (a) keyboard-controller e remover o AvoidSoftInput (recomendado); (b) manter o AvoidSoftInput e tratar os modais de outro jeito.
- **D-K2 — Quando:** (a) depois do AAB de 25/10 (recomendado); (b) a 13.1 e a 13.3 antes do AAB.

## 7. Aprovação (20/10/2026)

Aprovada com **D-K1 = (a)** keyboard-controller, AvoidSoftInput sai; **D-K2 = (a)** depois do AAB de 25/10, antecipando só se a Story 1.3 achar campo coberto que impeça o uso. Emendas aplicadas no PRD, `epics.md`, spine e `sprint-status.yaml`.
