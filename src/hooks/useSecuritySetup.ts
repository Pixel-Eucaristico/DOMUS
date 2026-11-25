import { useState, useCallback, useEffect, useReducer, useRef } from "react";
import { Platform } from "react-native";
import * as Haptics from "expo-haptics";
import { SecurityService } from "@/src/modules/security/application/SecurityService";
import { BiometricService } from "@/src/modules/security/application/BiometricService";
import { PinAuthService } from "@/src/modules/security/application/PinAuthService";
import { createSecuritySetupRunner } from "@/src/modules/security/application/pinVerificationFlow";
import type {
  UserSecuritySettings,
  LockMethod,
} from "@/src/modules/security/domain/UserSecuritySettings";
import {
  localReducer,
  initialLocalState,
  type LocalState,
  type LocalAction,
} from "@/src/modules/security/application/securitySetupReducer";
import { appAlert } from "@/src/services/appAlert";

export interface SecuritySetupState {
  settings: UserSecuritySettings | null;
  biometricAvailable: boolean;
  local: LocalState;
  dispatch: React.Dispatch<LocalAction>;
  handleToggleLock: (value: boolean) => void;
  handleChooseMethod: (method: LockMethod) => void;
  handlePinNew: (pin: string) => void;
  handlePinConfirm: (pin: string) => void;
  handleVerifyPinToDisable: (pin: string) => void;
  handleBiometricToDisable: () => void;
  handleChangeCurrentPin: (pin: string) => void;
  handleChangeNewPin: (pin: string) => void;
  handleChangeConfirmPin: (pin: string) => void;
}

export function useSecuritySetup(): SecuritySetupState {
  const [settings, setSettings] = useState<UserSecuritySettings | null>(null);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [local, rawDispatch] = useReducer(localReducer, initialLocalState);

  // Load settings + biometric check
  useEffect(() => {
    SecurityService.loadSettings().then(setSettings);
    BiometricService.isAvailable().then(setBiometricAvailable);
  }, []);

  // Haptic helpers
  const haptic = useCallback(() => {
    if (Platform.OS !== "web") Haptics.selectionAsync().catch(() => {});
  }, []);

  const hapticSuccess = useCallback(() => {
    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    }
  }, []);

  const hapticError = useCallback(() => {
    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
    }
  }, []);

  const reloadSettings = useCallback(async () => {
    const s = await SecurityService.loadSettings();
    setSettings(s);
  }, []);

  const feedbackRef = useRef({ hapticSuccess, hapticError });
  feedbackRef.current = { hapticSuccess, hapticError };

  const runner = useRef(
    createSecuritySetupRunner({
      verifyPin: (pin, current) => PinAuthService.verifyPin(pin, current),
      setupPin: (pin, target) => PinAuthService.setupPin(pin, target),
      loadSettings: () => SecurityService.loadSettings(),
      disableLock: () => SecurityService.disableLock(),
      getRemainingLockMs: (current) => PinAuthService.getRemainingLockMs(current),
      setSettings,
      dispatch: rawDispatch,
      onSuccessFeedback: () => feedbackRef.current.hapticSuccess(),
      onErrorFeedback: () => feedbackRef.current.hapticError(),
      onPinChanged: () => appAlert("Sucesso", "PIN alterado com sucesso."),
    }),
  ).current;

  useEffect(() => () => runner.cancel(), [runner]);

  const dispatch: React.Dispatch<LocalAction> = useCallback(
    (action) => {
      if (action.type === "RESET") {
        runner.cancel();
      }
      rawDispatch(action);
    },
    [runner],
  );

  // Toggle lock
  const handleToggleLock = useCallback(
    async (value: boolean) => {
      if (!settings) return;
      haptic();
      if (value) {
        dispatch({ type: "START_ENABLE" });
      } else if (settings.method === "pin") {
        dispatch({ type: "START_DISABLE_PIN" });
      } else {
        dispatch({ type: "START_DISABLE_BIOMETRIC" });
      }
    },
    [settings, haptic, dispatch],
  );

  // Choose method
  const handleChooseMethod = useCallback(
    async (method: LockMethod) => {
      if (!settings) return;
      haptic();
      if (method === "biometric") {
        if (!biometricAvailable) {
          appAlert("Biometria indisponível", "Nenhuma biometria cadastrada no dispositivo.");
          return;
        }
        rawDispatch({ type: "SET_SAVING", value: true });
        try {
          const updated: UserSecuritySettings = {
            ...settings,
            enabled: true,
            method: "biometric",
            pinHash: null,
            pinSalt: null,
            failedAttempts: 0,
            lockedUntil: null,
          };
          await SecurityService.saveSettings(updated);
          setSettings(updated);
          dispatch({ type: "RESET" });
          hapticSuccess();
        } catch {
          hapticError();
          rawDispatch({ type: "SET_ERROR", message: "Erro ao salvar biometria. Tente novamente." });
        }
      } else {
        dispatch({ type: "CHOOSE_PIN" });
      }
    },
    [settings, biometricAvailable, haptic, hapticSuccess, hapticError, dispatch],
  );

  // PIN setup
  const handlePinNew = useCallback((pin: string) => {
    rawDispatch({ type: "PIN_NEW_DONE", pin });
  }, []);

  const handlePinConfirm = useCallback(
    async (pin: string) => {
      if (!settings) return;
      if (pin !== local.pendingPin) {
        hapticError();
        rawDispatch({ type: "PIN_CONFIRM_MISMATCH" });
        return;
      }
      await runner.savePin(
        pin,
        {
          ...settings,
          enabled: true,
          method: "pin",
        },
        "enable",
      );
    },
    [settings, local.pendingPin, hapticError, runner],
  );

  // Disable lock (PIN verification)
  const handleVerifyPinToDisable = useCallback(
    (pin: string) => {
      void runner.verifyToDisable(pin, settings);
    },
    [runner, settings],
  );

  // Disable lock (biometric verification)
  const handleBiometricToDisable = useCallback(async () => {
    try {
      const result = await BiometricService.authenticate();
      if (result.success) {
        rawDispatch({ type: "SET_SAVING", value: true });
        await SecurityService.disableLock();
        await reloadSettings();
        dispatch({ type: "RESET" });
        hapticSuccess();
      } else if (result.reason !== "cancelled") {
        rawDispatch({ type: "SET_ERROR", message: "Autenticação falhou. Tente novamente." });
        hapticError();
      }
    } catch {
      hapticError();
      rawDispatch({ type: "SET_ERROR", message: "Erro ao desativar bloqueio. Tente novamente." });
    }
  }, [reloadSettings, hapticSuccess, hapticError, dispatch]);

  // Auto-prompt biometric when in verification step
  useEffect(() => {
    if (local.step === "verify_biometric_to_disable") {
      handleBiometricToDisable();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- prompt biométrico deve disparar só na entrada do passo; reexecutar por mudança do callback repetiria o prompt
  }, [local.step]);

  // Change PIN flow
  const handleChangeCurrentPin = useCallback(
    (pin: string) => {
      void runner.verifyCurrentToChange(pin, settings);
    },
    [runner, settings],
  );

  const handleChangeNewPin = useCallback((pin: string) => {
    rawDispatch({ type: "CHANGE_NEW_DONE", pin });
  }, []);

  const handleChangeConfirmPin = useCallback(
    async (pin: string) => {
      if (!settings) return;
      if (pin !== local.pendingPin) {
        hapticError();
        rawDispatch({ type: "CHANGE_NEW_DONE", pin: "" });
        rawDispatch({ type: "SET_ERROR", message: "Os PINs não coincidem. Tente novamente." });
        return;
      }
      await runner.savePin(pin, settings, "change");
    },
    [settings, local.pendingPin, hapticError, runner],
  );

  return {
    settings,
    biometricAvailable,
    local,
    dispatch,
    handleToggleLock,
    handleChooseMethod,
    handlePinNew,
    handlePinConfirm,
    handleVerifyPinToDisable,
    handleBiometricToDisable,
    handleChangeCurrentPin,
    handleChangeNewPin,
    handleChangeConfirmPin,
  };
}
