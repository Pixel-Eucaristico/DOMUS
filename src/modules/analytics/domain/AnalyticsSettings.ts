// ─── Analytics & Performance Settings Domain ────────────────────────────────

export interface AnalyticsSettings {
  /** Usuário optou por enviar dados de uso (analytics) */
  analyticsEnabled: boolean;
  /** Usuário optou por enviar dados de performance (FPS, slow frames) */
  performanceEnabled: boolean;
  /** true após o usuário ter visto o modal de consentimento */
  hasCompletedConsent: boolean;
}

export const DEFAULT_ANALYTICS_SETTINGS: AnalyticsSettings = {
  analyticsEnabled: false,
  performanceEnabled: false,
  hasCompletedConsent: false,
};

export const ANALYTICS_SETTINGS_KEY = "domus_analytics_settings_v1";
