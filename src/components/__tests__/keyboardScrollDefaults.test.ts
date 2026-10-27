import { describe, it, expect } from "vitest";
import {
  KEYBOARD_BOTTOM_OFFSET,
  KEYBOARD_ONLY_PROPS,
  SCROLL_BOTTOM_PADDING,
  withKeyboardScrollDefaults,
} from "@/components/keyboardScrollDefaults";

describe("withKeyboardScrollDefaults (Story 13.2)", () => {
  it("constantes", () => {
    expect(KEYBOARD_BOTTOM_OFFSET).toBe(50);
    expect(SCROLL_BOTTOM_PADDING).toBe(32);
  });

  it("nativo: aplica bottomOffset e keyboardShouldPersistTaps padrão", () => {
    expect(withKeyboardScrollDefaults({}, "android")).toEqual({
      bottomOffset: KEYBOARD_BOTTOM_OFFSET,
      keyboardShouldPersistTaps: "handled",
    });
  });

  it("R9: bottomOffset={undefined} explícito também vira o padrão", () => {
    const r = withKeyboardScrollDefaults({ bottomOffset: undefined, keyboardShouldPersistTaps: undefined }, "android");
    expect(r).toMatchObject({ bottomOffset: KEYBOARD_BOTTOM_OFFSET, keyboardShouldPersistTaps: "handled" });
  });

  it("nativo: valores passados pela tela prevalecem (inclusive 0)", () => {
    expect(withKeyboardScrollDefaults({ bottomOffset: 0 }, "ios")).toMatchObject({ bottomOffset: 0 });
    expect(withKeyboardScrollDefaults({ bottomOffset: 176 }, "android")).toMatchObject({ bottomOffset: 176 });
  });

  it("web: tira as props do teclado e mantém o resto", () => {
    const props = {
      bottomOffset: 50,
      extraKeyboardSpace: 10,
      disableScrollOnKeyboardHide: true,
      enabled: true,
      ScrollViewComponent: () => null,
      showsVerticalScrollIndicator: false,
    };
    const r = withKeyboardScrollDefaults(props, "web") as Record<string, unknown>;
    for (const key of KEYBOARD_ONLY_PROPS) expect(r).not.toHaveProperty(key);
    expect(r).toEqual({ showsVerticalScrollIndicator: false, keyboardShouldPersistTaps: "handled" });
  });
});
