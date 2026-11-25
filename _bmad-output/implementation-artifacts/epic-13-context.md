# Epic 13 Context: Teclado nunca cobre o campo

<!-- Compiled from planning artifacts. Edit freely. Regenerate with compile-epic-context if planning docs change. -->

## Goal

Ensure every text input in DOMUS—across full screens, form modals, bottom sheets, search and confirmation dialogs, AI chat, and camera overlays—stays visible alongside its primary action whenever the soft keyboard is open. Unifying keyboard handling under a single system eliminates double-shifting, broken modal lifting, and residual blank space, and satisfies Android 16's mandatory edge-to-edge display behavior as well as web.

## Stories

- Story 13.1: Ligar o sistema único de teclado na raiz
- Story 13.2: Padronizar a rolagem das telas com campos
- Story 13.3: Fazer os modais com formulário subirem
- Story 13.4: Fazer as buscas e diálogos em modal subirem
- Story 13.5: Um só deslocamento no chat da IA
- Story 13.6: Corrigir a digitação manual da chave da NF sobre a câmera
- Story 13.7: Verificar todos os campos no aparelho

## Requirements & Constraints

- **Focused Input Clearance:** Focusing any field in any screen, modal, bottom sheet, dialog, or camera overlay must lift or scroll the layout so the active input remains visible above the keyboard with at least 8 dp of breathing room.
- **Primary Action Reachability:** Primary form buttons (Save, Add, Confirm) must remain reachable while the keyboard is open (via scrolling when needed), and tapping buttons with the keyboard open must work on the first tap without requiring an extra tap to dismiss the keyboard.
- **Clean Layout Restoration:** Dismissing the keyboard must return the view to its original position with no leftover blank space, including across repeated open/close cycles.
- **Single Keyboard System:** Use `react-native-keyboard-controller` exclusively across the entire app and remove `react-native-avoid-softinput` from code, `package.json`, and `package-lock.json` (keeping npm 10 lockfile compatibility for CI).
- **Android 16 Edge-to-Edge & Web Parity:** Behavior must hold on Android 16 (target API 36), where edge-to-edge is always enforced and window-level `adjustResize` no longer resizes the viewport automatically, as well as in desktop/mobile web browsers.
- **No Regressions & Real-Device Proof:** Every screen that already lifted or scrolled for the keyboard must continue working. Because web screenshots with simulated keyboards cannot prove native soft-keyboard behavior, final verification requires hands-on testing of every input area on an Android 16 device and on web, recorded in a checklist under `docs/`.
- **App-Wide UI Standards:** Keep all UI copy in Brazilian Portuguese (pt-BR) with full accents, keep UI interactions non-blocking and offline-first, and ensure changes pass `npx eslint .`, `npx vitest run`, and `npx tsc --noEmit`.

## Technical Decisions

- **Single Root Provider:** Wrap root navigation (`app/_layout.tsx`) in one translucent `KeyboardProvider` configured for edge-to-edge rendering. Do not mount separate screen-level `KeyboardProvider` instances.
- **Centralized Reusable Primitives:** Standardize keyboard avoidance around three shared building blocks so individual views only adopt the right container:
  - Root `KeyboardProvider` from `react-native-keyboard-controller`.
  - One shared keyboard-aware scroll wrapper for form screens, enforcing a consistent bottom offset and persistent tap handling (`keyboardShouldPersistTaps`).
  - `KeyboardSafeView` for React Native `<Modal>` surfaces, because Android modals render in a separate native window that global window-level keyboard avoidance cannot reach.
- **Forbidden Patterns:** Do not use React Native's built-in `KeyboardAvoidingView` or `react-native-avoid-softinput`; mixing multiple keyboard systems causes double displacement or dead modal avoidance.
- **AI Chat Integration:** GiftedChat already uses `react-native-keyboard-controller` internally. Configure it through its keyboard props (`keyboardProviderProps` / `keyboardAvoidingViewProps`) against the root provider instead of adding a local provider or stacking multiple avoidance layers.
- **Dependencies, Patches & Native Folders:** Local development uses pnpm while GitHub Actions CI runs `npm ci` against `package-lock.json` (there is no `pnpm-lock.yaml`); after removing `react-native-avoid-softinput`, regenerate `package-lock.json` cleanly and verify all patches in `patches/` (including the `react-native-keyboard-controller` patch) still apply cleanly. Never hand-edit generated `ios/` or `android/` directories—native adjustments belong in `plugins/` or `patches/`.
- **Architecture Boundaries:** UI work stays in `app/` and `src/components/`; screens dispatch events via `useAppState()` without mutating state directly, avoid native `Alert.alert`/`window.alert`/`window.confirm` in favor of `appAlert`/`appConfirm`, and avoid oversized animated views that crash Android Mali GPUs.

## UX & Interaction Patterns

- **Scrollable Form Screens:** Focusing any field smoothly scrolls it above the keyboard with consistent bottom padding, while allowing the user to scroll to and immediately tap the primary action button on the first touch.
- **Form Modals & Bottom Sheets:** Modal forms (new transaction sheet, account creation/editing, wishlist creation, add wishlist item) lift cleanly so both the active input and the save button remain accessible, collapsing with zero stray whitespace when the keyboard closes.
- **Search Pickers & Utility Dialogs:** Compact search modals (category, store, compact account picker), destructive confirmation dialogs with text confirmation, onboarding API key input, and debug tools must all keep the focused input plus matching results or confirmation button visible above the keyboard.
- **AI Chat Composer:** The message input bar sits flush directly above the keyboard while typing and snaps cleanly back to its resting bottom position on dismissal across repeated toggles, with neither extra gap nor overlap.
- **Camera Overlay Manual Entry:** On the invoice QR scanner screen, when manual access-key entry auto-focuses over the live camera preview, the bottom input bar and submit button must lift above the keyboard so the typed key remains visible.

## Cross-Story Dependencies

- **Foundation Within Epic 13:** Story 13.1 (root `KeyboardProvider` and removal of `react-native-avoid-softinput`) is a prerequisite for Stories 13.2 through 13.6—both the standardized screen scroll wrapper and `KeyboardSafeView` in modals depend on the active root provider context. Story 13.7 verifies all surfaces updated across Stories 13.1–13.6 on a real Android 16 device and on web.
- **Play Store Target API 36 Release (Epic 1):** Epic 13 is sequenced after the target API 36 AAB submission to avoid introducing app-wide keyboard regressions right before the store deadline, unless Android 16 verification finds an obscured field that blocks usage (in which case root provider activation moves up). Story 13.7's device checklist pairs directly with the Android 16 validation checklist.
- **Future Expo SDK Upgrades (Epic 8):** `react-native-keyboard-controller` and its patch in `patches/` must be re-evaluated during each Expo SDK upgrade step (54→55→56→57).
