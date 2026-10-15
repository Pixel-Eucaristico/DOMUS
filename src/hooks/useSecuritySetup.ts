import { useState, useCallback, useEffect, useReducer } from "react";
import { Alert, Platform } from "react-native";
import * as Haptics from "expo-haptics";
import { SecurityService } from "@/src/modules/security/application/SecurityService";
import { BiometricService } from "@/src/modules/security/application/BiometricService";
import { PinAuthService } from "@/src/modules/security/application/PinAuthService";
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
  const [local, dispatch] = useReducer(localReducer, initialLocalState);

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
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  }, []);

  const hapticError = useCallback(() => {
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
  }, []);

  const reloadSettings = useCallback(async () => {
    const s = await SecurityService.loadSettings();
    setSettings(s);
  }, []);

  // Toggle lock
  const handleToggleLock = useCallback(
    async (value: boolean) => {
      if (!settings) return;
      haptic();
      if (value) {
        dispatch({ type: "START_ENABLE" });
      } else {
        if (settings.method === "pin") {
          dispatch({ type: "START_DISABLE_PIN" });
        } else {
          dispatch({ type: "START_DISABLE_BIOMETRIC" });
        }
      }
    },
    [settings, haptic],
  );

  // Choose method
  const handleChooseMethod = useCallback(
    async (method: LockMethod) => {
      if (!settings) return;
      haptic();
      if (method === "biometric") {
        if (!biometricAvailable) {
          Alert.alert("Biometria indisponível", "Nenhuma biometria cadastrada no dispositivo.");
          return;
        }
        dispatch({ type: "SET_SAVING", value: true });
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
      } else {
        dispatch({ type: "CHOOSE_PIN" });
      }
    },
    [settings, biometricAvailable, haptic, hapticSuccess],
  );

  // PIN setup
  const handlePinNew = useCallback((pin: string) => {
    dispatch({ type: "PIN_NEW_DONE", pin });
  }, []);

  const handlePinConfirm = useCallback(
    async (pin: string) => {
      if (!settings) return;
      if (pin !== local.pendingPin) {
        hapticError();
        dispatch({ type: "PIN_CONFIRM_MISMATCH" });
        return;
      }
      dispatch({ type: "SET_SAVING", value: true });
      const updated = await PinAuthService.setupPin(pin, {
        ...settings,
        enabled: true,
        method: "pin",
      });
      setSettings(updated);
      dispatch({ type: "PIN_CONFIRM_DONE" });
      hapticSuccess();
    },
    [settings, local.pendingPin, hapticError, hapticSuccess],
  );

  // Disable lock (PIN verification)
  const handleVerifyPinToDisable = useCallback(
    async (pin: string) => {
      if (!settings) return;
      const result = await PinAuthService.verifyPin(pin, settings);
      await reloadSettings();

      if (result.success) {
        dispatch({ type: "SET_SAVING", value: true });
        await SecurityService.disableLock();
        await reloadSettings();
        dispatch({ type: "RESET" });
        hapticSuccess();
      } else {
        hapticError();
        const updated = await SecurityService.loadSettings();
        setSettings(updated);
        if (result.reason === "locked") {
          const secs = Math.ceil(PinAuthService.getRemainingLockMs(updated) / 1000);
          dispatch({ type: "SET_ERROR", message: `Bloqueado. Aguarde ${secs}s.` });
        } else {
          const rem = result.remainingAttempts ?? 0;
          dispatch({
            type: "SET_ERROR",
            message: rem === 0
              ? "Conta bloqueada por 30 segundos."
              : `PIN incorreto. ${rem} tentativa${rem === 1 ? "" : "s"} restante${rem === 1 ? "" : "s"}.`,
          });
        }
      }
    },
    [settings, reloadSettings, hapticSuccess, hapticError],
  );

  // Disable lock (biometric verification)
  const handleBiometricToDisable = useCallback(async () => {
    const result = await BiometricService.authenticate();
    if (result.success) {
      dispatch({ type: "SET_SAVING", value: true });
      await SecurityService.disableLock();
      await reloadSettings();
      dispatch({ type: "RESET" });
      hapticSuccess();
    } else if (result.reason !== "cancelled") {
      dispatch({ type: "SET_ERROR", message: "Autenticação falhou. Tente novamente." });
      hapticError();
    }
  }, [reloadSettings, hapticSuccess, hapticError]);

  // Auto-prompt biometric when in verification step
  useEffect(() => {
    if (local.step === "verify_biometric_to_disable") {
      handleBiometricToDisable();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- prompt biométrico deve disparar só na entrada do passo; reexecutar por mudança do callback repetiria o prompt
  }, [local.step]);

  // Change PIN flow
  const handleChangeCurrentPin = useCallback(
    async (pin: string) => {
      if (!settings) return;
      const result = await PinAuthService.verifyPin(pin, settings);
      await reloadSettings();
      if (result.success) {
        dispatch({ type: "CHANGE_CURRENT_DONE" });
      } else {
        hapticError();
        const updated = await SecurityService.loadSettings();
        setSettings(updated);
        const rem = result.remainingAttempts ?? 0;
        dispatch({
          type: "SET_ERROR",
          message: rem === 0
            ? "Conta bloqueada."
            : `PIN incorreto. ${rem} tentativa${rem === 1 ? "" : "s"} restante${rem === 1 ? "" : "s"}.`,
        });
      }
    },
    [settings, reloadSettings, hapticError],
  );

  const handleChangeNewPin = useCallback((pin: string) => {
    dispatch({ type: "CHANGE_NEW_DONE", pin });
  }, []);

  const handleChangeConfirmPin = useCallback(
    async (pin: string) => {
      if (!settings) return;
      if (pin !== local.pendingPin) {
        hapticError();
        dispatch({ type: "CHANGE_NEW_DONE", pin: "" });
        dispatch({ type: "SET_ERROR", message: "Os PINs não coincidem. Tente novamente." });
        return;
      }
      dispatch({ type: "SET_SAVING", value: true });
      const updated = await PinAuthService.setupPin(pin, settings);
      setSettings(updated);
      dispatch({ type: "RESET" });
      hapticSuccess();
      Alert.alert("Sucesso", "PIN alterado com sucesso.");
    },
    [settings, local.pendingPin, hapticError, hapticSuccess],
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
