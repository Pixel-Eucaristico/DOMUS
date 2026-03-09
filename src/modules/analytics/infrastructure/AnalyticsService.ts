// ─── Firebase Analytics, Performance & Crashlytics Service ───────────────────
// Inicializa Firebase somente quando o usuário consente.
// Lazy-load para evitar crash quando as libs nativas não estão disponíveis (web).

import { Platform } from "react-native";
import { loadAnalyticsSettings } from "../application/AnalyticsSettingsStore";

let _initialized = false;
let _globalHandlerInstalled = false;

/**
 * Inicializa Firebase Analytics, Performance e Crashlytics conforme preferências.
 * Só executa uma vez — chamadas subsequentes são no-op.
 */
export async function initFirebase(): Promise<void> {
  if (_initialized || Platform.OS === "web") return;

  try {
    const settings = await loadAnalyticsSettings();

    if (!settings.analyticsEnabled && !settings.performanceEnabled && !settings.crashlyticsEnabled) return;

    // Inicializa o Firebase App (necessário antes de qualquer módulo)
    const firebaseApp = await import("@react-native-firebase/app");
    if (!firebaseApp.default.apps.length) {
      // Auto-inicializado pelo google-services.json / GoogleService-Info.plist
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

    // Crashlytics
    if (settings.crashlyticsEnabled) {
      const crashlytics = await import("@react-native-firebase/crashlytics");
      await crashlytics.default().setCrashlyticsCollectionEnabled(true);
      installGlobalErrorHandler();
    } else {
      try {
        const crashlytics = await import("@react-native-firebase/crashlytics");
        await crashlytics.default().setCrashlyticsCollectionEnabled(false);
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
 * Instala handler global para capturar erros JS não tratados e enviar ao Crashlytics.
 * Preserva o handler anterior (chain).
 */
function installGlobalErrorHandler(): void {
  if (_globalHandlerInstalled || Platform.OS === "web") return;
  _globalHandlerInstalled = true;

  const originalHandler = ErrorUtils.getGlobalHandler();

  ErrorUtils.setGlobalHandler(async (error: Error, isFatal?: boolean) => {
    try {
      const crashlytics = await import("@react-native-firebase/crashlytics");
      if (isFatal) {
        crashlytics.default().log(`Fatal error: ${error.message}`);
      }
      await crashlytics.default().recordError(error);
    } catch {
      // Crashlytics indisponível — não impede o handler original
    }

    // Chama o handler original para manter comportamento padrão do React Native
    if (originalHandler) {
      originalHandler(error, isFatal);
    }
  });
}

/**
 * Aplica as configurações de coleta sem reiniciar o app.
 * Chamado quando o usuário altera as preferências na tela de configurações.
 */
export async function applyAnalyticsPreferences(
  analyticsEnabled: boolean,
  performanceEnabled: boolean,
  crashlyticsEnabled: boolean,
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

  try {
    const crashlytics = await import("@react-native-firebase/crashlytics");
    await crashlytics.default().setCrashlyticsCollectionEnabled(crashlyticsEnabled);
    if (crashlyticsEnabled) {
      installGlobalErrorHandler();
    }
  } catch {
    // module not available
  }
}

/**
 * Reporta erro do ErrorBoundary ao Crashlytics (se habilitado).
 */
export async function reportCrashToFirebase(error: Error, componentStack?: string): Promise<void> {
  if (Platform.OS === "web") return;
  try {
    const settings = await loadAnalyticsSettings();
    if (!settings.crashlyticsEnabled) return;

    const crashlytics = await import("@react-native-firebase/crashlytics");
    if (componentStack) {
      crashlytics.default().log(`Component stack: ${componentStack}`);
    }
    await crashlytics.default().recordError(error);
  } catch {
    // silencioso
  }
}

/**
 * Registra um evento personalizado no Firebase Analytics.
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
