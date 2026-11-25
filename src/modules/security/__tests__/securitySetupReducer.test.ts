import { describe, expect, it } from "vitest";
import {
  initialLocalState,
  localReducer,
  type LocalAction,
} from "../application/securitySetupReducer";

describe("securitySetupReducer — estado saving (D15)", () => {
  it("limpa saving ao concluir PIN_CONFIRM_DONE", () => {
    const busy = { ...initialLocalState, step: "set_pin_confirm" as const, pendingPin: "123456", saving: true };
    const next = localReducer(busy, { type: "PIN_CONFIRM_DONE" });
    expect(next.step).toBe("idle");
    expect(next.saving).toBe(false);
    expect(next.pendingPin).toBe("");
  });

  it("limpa saving ao concluir CHANGE_CURRENT_DONE", () => {
    const busy = { ...initialLocalState, step: "change_pin_current" as const, saving: true };
    const next = localReducer(busy, { type: "CHANGE_CURRENT_DONE" });
    expect(next.step).toBe("change_pin_new");
    expect(next.saving).toBe(false);
  });

  it("limpa saving ao registrar SET_ERROR", () => {
    const busy = { ...initialLocalState, step: "verify_pin_to_disable" as const, saving: true };
    const next = localReducer(busy, { type: "SET_ERROR", message: "PIN incorreto." });
    expect(next.pinError).toBe("PIN incorreto.");
    expect(next.saving).toBe(false);
  });

  it("limpa saving residual em todas as transições de passo", () => {
    const busy = { ...initialLocalState, step: "set_pin_confirm" as const, pendingPin: "123456", saving: true };
    const actions: LocalAction[] = [
      { type: "START_ENABLE" },
      { type: "CHOOSE_PIN" },
      { type: "CHOOSE_BIOMETRIC" },
      { type: "PIN_NEW_DONE", pin: "123456" },
      { type: "PIN_CONFIRM_MISMATCH" },
      { type: "START_DISABLE_PIN" },
      { type: "START_DISABLE_BIOMETRIC" },
      { type: "START_CHANGE_PIN" },
      { type: "CHANGE_NEW_DONE", pin: "654321" },
      { type: "RESET" },
    ];
    for (const action of actions) {
      const next = localReducer(busy, action);
      expect(next.saving).toBe(false);
    }
  });
});
