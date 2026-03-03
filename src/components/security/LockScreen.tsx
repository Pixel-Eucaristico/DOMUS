import React, { useState, useCallback, useEffect } from "react";
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
import type { UserSecuritySettings } from "@/src/modules/security/domain/UserSecuritySettings";

interface LockScreenProps {
  onUnlock: () => void;
}

export function LockScreen({ onUnlock }: LockScreenProps) {
  const { theme } = useAppState();
  const [settings, setSettings] = useState<UserSecuritySettings | null>(null);
  const [pinError, setPinError] = useState<string | null>(null);
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
  }, [settings?.lockedUntil]);

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
  }, [settings?.method]);

  const handlePinComplete = useCallback(
    async (pin: string) => {
      if (!settings) return;
      setPinError(null);

      const result = await PinAuthService.verifyPin(pin, settings);

      if (result.success) {
        if (Platform.OS !== "web") {
          Haptics.notificationAsync(
            Haptics.NotificationFeedbackType.Success,
          ).catch(() => {});
        }
        onUnlock();
        return;
      }

      if (Platform.OS !== "web") {
        Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Error,
        ).catch(() => {});
      }

      const updated = await SecurityService.loadSettings();
      setSettings(updated);

      if (result.reason === "locked") {
        const secs = Math.ceil(
          PinAuthService.getRemainingLockMs(updated) / 1000,
        );
        setPinError(`Muitas tentativas. Aguarde ${secs}s.`);
      } else {
        const rem = result.remainingAttempts ?? 0;
        if (rem === 0) {
          setPinError("Conta bloqueada por 30 segundos.");
        } else {
          setPinError(
            `PIN incorreto. ${rem} tentativa${rem === 1 ? "" : "s"} restante${rem === 1 ? "" : "s"}.`,
          );
        }
      }
    },
    [settings, onUnlock],
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
