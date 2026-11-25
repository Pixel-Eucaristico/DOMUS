// Orquestração pura do fluxo de verificação/gravação de PIN (TypeScript puro, sem react-native).

import type { PinResult } from "./PinAuthService";
import type { UserSecuritySettings } from "../domain/UserSecuritySettings";
import type { LocalAction } from "./securitySetupReducer";

/**
 * Cede um macrotask ao event loop para o React commitar e pintar o indicador
 * de carregamento antes de `@noble/hashes` iniciar o loop assíncrono via microtasks.
 */
export function yieldToPaint(): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, 0);
  });
}

export function formatPinFailureMessage(
  result: Extract<PinResult, { success: false }>,
  updatedSettings: UserSecuritySettings,
  getRemainingLockMs: (settings: UserSecuritySettings) => number,
  lockedPrefix: string = "Bloqueado.",
): string {
  if (result.reason === "locked") {
    const secs = Math.ceil(getRemainingLockMs(updatedSettings) / 1000);
    return `${lockedPrefix} Aguarde ${secs}s.`;
  }
  if (result.reason === "not_configured") {
    return "PIN não configurado.";
  }
  const rem = result.remainingAttempts ?? 0;
  if (rem === 0) {
    return "Conta bloqueada por 30 segundos.";
  }
  return `PIN incorreto. ${rem} tentativa${rem === 1 ? "" : "s"} restante${rem === 1 ? "" : "s"}.`;
}

export interface LockScreenPinVerifierDeps {
  verifyPin: (pin: string, settings: UserSecuritySettings) => Promise<PinResult>;
  loadSettings: () => Promise<UserSecuritySettings>;
  getRemainingLockMs: (settings: UserSecuritySettings) => number;
  setSettings: (settings: UserSecuritySettings) => void;
  setPinError: (message: string | null) => void;
  setPinVerifying: (verifying: boolean) => void;
  onUnlock: () => void;
  onSuccessFeedback: () => void;
  onErrorFeedback: () => void;
  yieldBeforeHash?: () => Promise<void>;
}

export function createLockScreenPinVerifier(deps: LockScreenPinVerifierDeps) {
  let inFlight = false;
  let cancelled = false;

  const verify = async (
    pin: string,
    settings: UserSecuritySettings | null,
  ): Promise<void> => {
    if (!settings || inFlight || cancelled) return;
    inFlight = true;
    deps.setPinError(null);
    deps.setPinVerifying(true);

    try {
      await (deps.yieldBeforeHash ?? yieldToPaint)();
      if (cancelled) return;

      const result = await deps.verifyPin(pin, settings);
      if (cancelled) return;

      if (result.success) {
        deps.onSuccessFeedback();
        deps.onUnlock();
        return;
      }

      deps.onErrorFeedback();
      const updated = await deps.loadSettings();
      if (cancelled) return;

      deps.setSettings(updated);
      deps.setPinError(
        formatPinFailureMessage(
          result,
          updated,
          deps.getRemainingLockMs,
          "Muitas tentativas.",
        ),
      );
    } catch {
      if (!cancelled) {
        deps.onErrorFeedback();
        deps.setPinError("Erro ao verificar PIN. Tente novamente.");
      }
    } finally {
      inFlight = false;
      if (!cancelled) {
        deps.setPinVerifying(false);
      }
    }
  };

  const cancel = () => {
    cancelled = true;
  };

  return { verify, cancel };
}

export interface SecuritySetupRunnerDeps {
  verifyPin: (pin: string, settings: UserSecuritySettings) => Promise<PinResult>;
  setupPin: (pin: string, settings: UserSecuritySettings) => Promise<UserSecuritySettings>;
  loadSettings: () => Promise<UserSecuritySettings>;
  disableLock: () => Promise<void>;
  getRemainingLockMs: (settings: UserSecuritySettings) => number;
  setSettings: (settings: UserSecuritySettings) => void;
  dispatch: (action: LocalAction) => void;
  onSuccessFeedback: () => void;
  onErrorFeedback: () => void;
  onPinChanged?: () => void;
  yieldBeforeHash?: () => Promise<void>;
}

export function createSecuritySetupRunner(deps: SecuritySetupRunnerDeps) {
  let inFlight = false;
  let requestId = 0;

  const isStale = (id: number) => requestId !== id;

  const cancel = () => {
    requestId += 1;
    inFlight = false;
  };

  const verifyToDisable = async (
    pin: string,
    settings: UserSecuritySettings | null,
  ): Promise<void> => {
    if (!settings || inFlight) return;
    inFlight = true;
    const reqId = ++requestId;
    deps.dispatch({ type: "SET_SAVING", value: true });

    try {
      await (deps.yieldBeforeHash ?? yieldToPaint)();
      if (isStale(reqId)) return;

      const result = await deps.verifyPin(pin, settings);
      if (isStale(reqId)) return;

      if (result.success) {
        await deps.disableLock();
        if (isStale(reqId)) return;

        const updated = await deps.loadSettings();
        if (isStale(reqId)) return;

        deps.setSettings(updated);
        deps.dispatch({ type: "RESET" });
        deps.onSuccessFeedback();
        return;
      }

      deps.onErrorFeedback();
      const updated = await deps.loadSettings();
      if (isStale(reqId)) return;

      deps.setSettings(updated);
      deps.dispatch({
        type: "SET_ERROR",
        message: formatPinFailureMessage(
          result,
          updated,
          deps.getRemainingLockMs,
          "Bloqueado.",
        ),
      });
    } catch {
      if (!isStale(reqId)) {
        deps.onErrorFeedback();
        deps.dispatch({
          type: "SET_ERROR",
          message: "Erro ao verificar PIN. Tente novamente.",
        });
      }
    } finally {
      if (!isStale(reqId)) {
        inFlight = false;
      }
    }
  };

  const verifyCurrentToChange = async (
    pin: string,
    settings: UserSecuritySettings | null,
  ): Promise<void> => {
    if (!settings || inFlight) return;
    inFlight = true;
    const reqId = ++requestId;
    deps.dispatch({ type: "SET_SAVING", value: true });

    try {
      await (deps.yieldBeforeHash ?? yieldToPaint)();
      if (isStale(reqId)) return;

      const result = await deps.verifyPin(pin, settings);
      if (isStale(reqId)) return;

      const updated = await deps.loadSettings();
      if (isStale(reqId)) return;

      deps.setSettings(updated);
      if (result.success) {
        deps.dispatch({ type: "CHANGE_CURRENT_DONE" });
        return;
      }

      deps.onErrorFeedback();
      deps.dispatch({
        type: "SET_ERROR",
        message: formatPinFailureMessage(
          result,
          updated,
          deps.getRemainingLockMs,
          "Bloqueado.",
        ),
      });
    } catch {
      if (!isStale(reqId)) {
        deps.onErrorFeedback();
        deps.dispatch({
          type: "SET_ERROR",
          message: "Erro ao verificar PIN. Tente novamente.",
        });
      }
    } finally {
      if (!isStale(reqId)) {
        inFlight = false;
      }
    }
  };

  const savePin = async (
    pin: string,
    targetSettings: UserSecuritySettings,
    mode: "enable" | "change",
  ): Promise<void> => {
    if (inFlight) return;
    inFlight = true;
    const reqId = ++requestId;
    deps.dispatch({ type: "SET_SAVING", value: true });

    try {
      await (deps.yieldBeforeHash ?? yieldToPaint)();
      if (isStale(reqId)) return;

      const updated = await deps.setupPin(pin, targetSettings);
      if (isStale(reqId)) return;

      deps.setSettings(updated);
      deps.dispatch({ type: mode === "enable" ? "PIN_CONFIRM_DONE" : "RESET" });
      deps.onSuccessFeedback();
      if (mode === "change") {
        deps.onPinChanged?.();
      }
    } catch {
      if (!isStale(reqId)) {
        deps.onErrorFeedback();
        deps.dispatch({
          type: "SET_ERROR",
          message:
            mode === "enable"
              ? "Erro ao salvar PIN. Tente novamente."
              : "Erro ao alterar PIN. Tente novamente.",
        });
      }
    } finally {
      if (!isStale(reqId)) {
        inFlight = false;
      }
    }
  };

  return {
    verifyToDisable,
    verifyCurrentToChange,
    savePin,
    cancel,
  };
}
