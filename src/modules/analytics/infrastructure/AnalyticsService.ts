// ─── Firebase Analytics & Performance Service ────────────────────────────────
// Inicializa Firebase somente quando o usuário consente.
// Lazy-load para evitar crash quando as libs nativas não estão disponíveis (web).

import { Platform } from "react-native";
import { loadAnalyticsSettings } from "../application/AnalyticsSettingsStore";

let _initialized = false;

/**
 * Inicializa Firebase Analytics e/ou Performance conforme as preferências do usuário.
 * Só executa uma vez — chamadas subsequentes são no-op.
 */
export async function initFirebase(): Promise<void> {
  if (_initialized || Platform.OS === "web") return;

  try {
    const settings = await loadAnalyticsSettings();

    // Se o usuário não consentiu nada, não inicializa o Firebase
    if (!settings.analyticsEnabled && !settings.performanceEnabled) return;

    // Inicializa o Firebase App (necessário antes de qualquer módulo)
    const firebaseApp = await import("@react-native-firebase/app");
    // Garante que o app default foi inicializado
    if (!firebaseApp.default.apps.length) {
      // O Firebase é auto-inicializado pelo google-services.json / GoogleService-Info.plist
      // mas fazemos a verificação para segurança
    }

    // Analytics
    if (settings.analyticsEnabled) {
      const analytics = await import("@react-native-firebase/analytics");
      await analytics.default().setAnalyticsCollectionEnabled(true);
    } else {
      try {
        const analytics = await import("@react-native-firebase/analytics");
        await analytics.default().setAnalyticsCollectionEnabled(false);
      } catch {
        // module not available
      }
    }

    // Performance Monitoring
    if (settings.performanceEnabled) {
      const perf = await import("@react-native-firebase/perf");
      await perf.default().setPerformanceCollectionEnabled(true);
    } else {
      try {
        const perf = await import("@react-native-firebase/perf");
        await perf.default().setPerformanceCollectionEnabled(false);
      } catch {
        // module not available
      }
    }

    _initialized = true;
  } catch {
    // Firebase não disponível (web ou dependência ausente) — silencioso
  }
}

/**
 * Aplica as configurações de coleta sem reiniciar o app.
 * Chamado quando o usuário altera as preferências na tela de configurações.
 */
export async function applyAnalyticsPreferences(
  analyticsEnabled: boolean,
  performanceEnabled: boolean,
): Promise<void> {
  if (Platform.OS === "web") return;

  try {
    const analytics = await import("@react-native-firebase/analytics");
    await analytics.default().setAnalyticsCollectionEnabled(analyticsEnabled);
  } catch {
    // module not available
  }

  try {
    const perf = await import("@react-native-firebase/perf");
    await perf.default().setPerformanceCollectionEnabled(performanceEnabled);
  } catch {
    // module not available
  }
}

/**
 * Registra um evento personalizado no Firebase Analytics.
 * No-op se analytics não está habilitado.
 */
export async function logEvent(
  name: string,
  params?: Record<string, string | number>,
): Promise<void> {
  if (Platform.OS === "web") return;
  try {
    const settings = await loadAnalyticsSettings();
    if (!settings.analyticsEnabled) return;

    const analytics = await import("@react-native-firebase/analytics");
    await analytics.default().logEvent(name, params);
  } catch {
    // silencioso
  }
}

/**
 * Define a tela atual para o Firebase Analytics.
 */
export async function logScreenView(screenName: string): Promise<void> {
  if (Platform.OS === "web") return;
  try {
    const settings = await loadAnalyticsSettings();
    if (!settings.analyticsEnabled) return;

    const analytics = await import("@react-native-firebase/analytics");
    await analytics.default().logScreenView({
      screen_name: screenName,
      screen_class: screenName,
    });
  } catch {
    // silencioso
  }
}
