import React, { useState, useCallback, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useAppState } from "@/src/context/AppStateProvider";
import { PinPad } from "./PinPad";
import { BiometricService } from "@/src/modules/security/application/BiometricService";
import { PinAuthService } from "@/src/modules/security/application/PinAuthService";
import { SecurityService } from "@/src/modules/security/application/SecurityService";
import { createLockScreenPinVerifier } from "@/src/modules/security/application/pinVerificationFlow";
import type { UserSecuritySettings } from "@/src/modules/security/domain/UserSecuritySettings";

interface LockScreenProps {
  onUnlock: () => void;
}

export function LockScreen({ onUnlock }: LockScreenProps) {
  const { theme } = useAppState();
  const [settings, setSettings] = useState<UserSecuritySettings | null>(null);
  const [pinError, setPinError] = useState<string | null>(null);
  const [pinVerifying, setPinVerifying] = useState(false);
  const [biometricLoading, setBiometricLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    SecurityService.loadSettings().then(setSettings);
  }, []);

  // Countdown timer while account is locked
  useEffect(() => {
    if (!settings?.lockedUntil) return;
    const remaining = PinAuthService.getRemainingLockMs(settings);
    if (remaining <= 0) return;

    setCountdown(Math.ceil(remaining / 1000));
    const interval = setInterval(() => {
      const r = PinAuthService.getRemainingLockMs(settings);
      if (r <= 0) {
        setCountdown(0);
        clearInterval(interval);
        SecurityService.loadSettings().then(setSettings);
      } else {
        setCountdown(Math.ceil(r / 1000));
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [settings?.lockedUntil, settings]);

  const tryBiometric = useCallback(async () => {
    setBiometricLoading(true);
    setPinError(null);
    const result = await BiometricService.authenticate();
    setBiometricLoading(false);

    if (result.success) {
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Success,
        ).catch(() => {});
      }
      onUnlock();
      return;
    }

    if (
      result.reason === "unavailable" ||
      result.reason === "not_enrolled"
    ) {
      setPinError("Biometria indisponível. Configure um PIN.");
    }
    // cancelled / failed: do nothing, user can retry
  }, [onUnlock]);

  // Auto-prompt biometrics when method is biometric
  useEffect(() => {
    if (settings?.method === "biometric") {
      tryBiometric();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- prompt biométrico deve disparar só quando o método muda; incluir tryBiometric repetiria o prompt a cada render do pai
  }, [settings?.method]);

  const onUnlockRef = useRef(onUnlock);
  onUnlockRef.current = onUnlock;

  const pinVerifier = useRef(
    createLockScreenPinVerifier({
      verifyPin: (pin, current) => PinAuthService.verifyPin(pin, current),
      loadSettings: () => SecurityService.loadSettings(),
      getRemainingLockMs: (current) => PinAuthService.getRemainingLockMs(current),
      setSettings,
      setPinError,
      setPinVerifying,
      onUnlock: () => onUnlockRef.current(),
      onSuccessFeedback: () => {
        if (Platform.OS !== "web") {
          Haptics.notificationAsync(
            Haptics.NotificationFeedbackType.Success,
          ).catch(() => {});
        }
      },
      onErrorFeedback: () => {
        if (Platform.OS !== "web") {
          Haptics.notificationAsync(
            Haptics.NotificationFeedbackType.Error,
          ).catch(() => {});
        }
      },
    }),
  ).current;

  useEffect(() => () => pinVerifier.cancel(), [pinVerifier]);

  const handlePinComplete = useCallback(
    (pin: string) => {
      void pinVerifier.verify(pin, settings);
    },
    [pinVerifier, settings],
  );

  if (!settings) {
    return (
      <View
        style={[styles.loading, { backgroundColor: theme.background }]}
      >
        <ActivityIndicator color={theme.primaryColor} size="large" />
      </View>
    );
  }

  const isPinLocked = PinAuthService.isLocked(settings);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]}>
      <View style={styles.container}>
        <View
          style={[
            styles.logoCircle,
            { backgroundColor: theme.primaryColor + "18" },
          ]}
        >
          <Feather name="lock" size={40} color={theme.primaryColor} />
        </View>

        <Text style={[styles.appName, { color: theme.textColor }]}>
          DOMUS
        </Text>
        <Text style={[styles.tagline, { color: theme.secondaryText }]}>
          Acesso protegido
        </Text>

        {settings.method === "biometric" ? (
          <View style={styles.biometricSection}>
            <TouchableOpacity
              style={[
                styles.biometricBtn,
                { backgroundColor: theme.primaryColor },
              ]}
              onPress={tryBiometric}
              disabled={biometricLoading}
              activeOpacity={0.8}
            >
              {biometricLoading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Feather name="shield" size={32} color="#fff" />
              )}
            </TouchableOpacity>
            <Text
              style={[styles.biometricHint, { color: theme.secondaryText }]}
            >
              {biometricLoading ? "Autenticando…" : "Toque para autenticar"}
            </Text>
            {pinError != null && (
              <Text style={[styles.errorText, { color: theme.danger }]}>
                {pinError}
              </Text>
            )}
          </View>
        ) : pinVerifying ? (
          <View style={styles.biometricSection}>
            <ActivityIndicator size="large" color={theme.primaryColor} />
            <Text
              style={[styles.biometricHint, { color: theme.secondaryText }]}
            >
              Verificando PIN…
            </Text>
          </View>
        ) : (
          <PinPad
            theme={theme}
            onComplete={handlePinComplete}
            disabled={isPinLocked}
            error={
              isPinLocked
                ? `Bloqueado. Aguarde ${countdown}s.`
                : pinError
            }
            title="Digite seu PIN"
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  loading: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 16,
    paddingHorizontal: 32,
  },
  logoCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  appName: {
    fontFamily: "DMSans_700Bold",
    fontSize: 32,
    letterSpacing: 4,
  },
  tagline: {
    fontFamily: "DMSans_400Regular",
    fontSize: 15,
    marginBottom: 8,
  },
  biometricSection: {
    alignItems: "center",
    gap: 16,
    marginTop: 16,
  },
  biometricBtn: {
    width: 88,
    height: 88,
    borderRadius: 44,
    justifyContent: "center",
    alignItems: "center",
  },
  biometricHint: {
    fontFamily: "DMSans_400Regular",
    fontSize: 14,
  },
  errorText: {
    fontFamily: "DMSans_400Regular",
    fontSize: 13,
    textAlign: "center",
  },
});
