# Epic 14 Context: Polimento visual e correções de interface

<!-- Generated from planning artifacts. Regenerate with compile-epic-context if planning docs change. -->

## Goal

Ensure every screen in DOMUS renders cleanly on real devices—respecting safe areas and edge-to-edge display, eliminating text/button collisions and truncation, fixing dark-theme contrast and input surface consistency, correcting pt-BR copy and typos, and providing helpful empty states and intuitive tool affordances.

## Stories

- Story 14.1: Proteger cabeçalhos e rolagem com área segura
- Story 14.2: Evitar sobreposição de botões e colisões nas listas
- Story 14.3: Corrigir contraste de botões bege e padronizar cor dos campos
- Story 14.4: Corrigir textos, grade de urgência e fluxo do modal de Desejos
- Story 14.5: Melhorar estado vazio da IA, scanner de barras, Drive e Sobre

## Requirements & Constraints

- **Edge-to-edge & Safe Area:** All headers, scrollable content, and top action bars must respect device safe areas on Android (including Android 16 edge-to-edge) and web without overlapping system status bars or clipping right-edge icons.
- **Brazilian Portuguese (pt-BR):** All UI copy, labels, placeholders, and dates must use complete pt-BR with proper accents (`DD/MM/AAAA` or `DD mes` instead of raw `YYYY-MM-DD` in user-facing lists), and typos or duplicated strings must be eliminated.
- **Accessibility & Visual Consistency:** Text over light beige surfaces in dark mode must maintain high-contrast dark foreground colors; form inputs across screens must share the theme's standard dark surface color; explanatory copy on dark backgrounds must remain legible.
- **Public Claims Match Behavior:** Any copy on the About/Settings screen or banners must accurately reflect app behavior and settings.
- **Offline-first & Performance:** UI polish and empty-state shortcuts (such as local AI analysis suggestions) must not block the interface or assume network connectivity.

## Technical Decisions

- **Event Sourcing Boundary:** Screens (`app/`, `src/components/`) only dispatch events via `useAppState()` and never mutate state directly or persist derived state. UI preferences remain in `AsyncStorage`; domain facts remain events.
- **Keyboard Handling:** Keyboard behavior is centralized via `react-native-keyboard-controller` (`KeyboardProvider` at the root). Screens use standard scrolling and modals use `KeyboardSafeView`—never use React Native's `KeyboardAvoidingView` or `AvoidSoftInput`.
- **Native Graphics Constraint:** Never use oversized animated `View` elements (e.g., 30000px) that crash Android Mali GPUs; use `absoluteFillObject`.
- **Custom Alerts & Currency:** Never use native `Alert.alert`, `window.alert`, or `window.confirm`; use `appAlert`/`appConfirm`. Format all monetary values via `formatCurrency` (`pt-BR`/BRL).
- **Platform & Verification:** Expo SDK 54, React Native 0.81 (New Architecture), TypeScript strict, and Tamagui. Changes must pass `npx eslint .`, `npx vitest run`, and `npx tsc --noEmit` (remove any generated `expo-env.d.ts` before running `tsc`). Do not edit `ios/`, `android/`, `packages/sync`, or `packages/core`.

## UX & Interaction Patterns

- **List & Floating Action Clearance:** List rows with inline action buttons (such as `Efetivar`) must reserve space so descriptions, accounts, and dates never collide with or slide behind buttons. Scrollable lists on Home must include sufficient bottom clearance so the floating `+` button never obscures `Cobranças pendentes` values/actions or the final row of `Últimas transações`.
- **Modals & Form Controls:** In the Wishlist (`Desejos`) flow, disable or hide destructive bulk actions (trash icon) when the list is empty, keep the primary submit button labeled `Adicionar à lista` in a disabled state when the name is empty (rather than relabeling it `Cancelar`), and arrange the 4 urgency chips symmetrically without an orphan chip on a second row.
- **Empty States & Tool Affordances:** Empty AI chat (`DOMUS IA`) should offer clickable local-analysis prompt chips, route configuration banners directly to AI settings on tap, and omit unnecessary Markdown formatting toolbars from the message input. Barcode scanning (`Cód. Barras`) should use a horizontal rectangular reticle, and Drive backup settings should maintain clear spacing between truncated account emails and the `Desconectar` button.
