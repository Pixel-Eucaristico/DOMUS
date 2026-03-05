// State machine for security setup flow (pure TypeScript, no React)

export type SetupStep =
  | "idle"
  | "choose_method"
  | "set_pin_new"
  | "set_pin_confirm"
  | "verify_pin_to_disable"
  | "verify_biometric_to_disable"
  | "change_pin_current"
  | "change_pin_new"
  | "change_pin_confirm";

export interface LocalState {
  step: SetupStep;
  pendingPin: string;
  pinError: string | null;
  saving: boolean;
}

export type LocalAction =
  | { type: "START_ENABLE" }
  | { type: "CHOOSE_PIN" }
  | { type: "CHOOSE_BIOMETRIC" }
  | { type: "PIN_NEW_DONE"; pin: string }
  | { type: "PIN_CONFIRM_DONE" }
  | { type: "PIN_CONFIRM_MISMATCH" }
  | { type: "START_DISABLE_PIN" }
  | { type: "START_DISABLE_BIOMETRIC" }
  | { type: "START_CHANGE_PIN" }
  | { type: "CHANGE_CURRENT_DONE" }
  | { type: "CHANGE_NEW_DONE"; pin: string }
  | { type: "SET_ERROR"; message: string }
  | { type: "SET_SAVING"; value: boolean }
  | { type: "RESET" };

export function localReducer(state: LocalState, action: LocalAction): LocalState {
  switch (action.type) {
    case "START_ENABLE":
      return { ...state, step: "choose_method", pinError: null };
    case "CHOOSE_PIN":
      return { ...state, step: "set_pin_new", pinError: null };
    case "CHOOSE_BIOMETRIC":
      return { ...state, step: "idle", pinError: null };
    case "PIN_NEW_DONE":
      return { ...state, step: "set_pin_confirm", pendingPin: action.pin, pinError: null };
    case "PIN_CONFIRM_DONE":
      return { ...state, step: "idle", pendingPin: "", pinError: null };
    case "PIN_CONFIRM_MISMATCH":
      return {
        ...state,
        step: "set_pin_new",
        pendingPin: "",
        pinError: "Os PINs não coincidem. Tente novamente.",
      };
    case "START_DISABLE_PIN":
      return { ...state, step: "verify_pin_to_disable", pinError: null };
    case "START_DISABLE_BIOMETRIC":
      return { ...state, step: "verify_biometric_to_disable", pinError: null };
    case "START_CHANGE_PIN":
      return { ...state, step: "change_pin_current", pinError: null };
    case "CHANGE_CURRENT_DONE":
      return { ...state, step: "change_pin_new", pendingPin: "", pinError: null };
    case "CHANGE_NEW_DONE":
      return { ...state, step: "change_pin_confirm", pendingPin: action.pin, pinError: null };
    case "SET_ERROR":
      return { ...state, pinError: action.message };
    case "SET_SAVING":
      return { ...state, saving: action.value };
    case "RESET":
      return { step: "idle", pendingPin: "", pinError: null, saving: false };
    default:
      return state;
  }
}

export const initialLocalState: LocalState = {
  step: "idle",
  pendingPin: "",
  pinError: null,
  saving: false,
};
