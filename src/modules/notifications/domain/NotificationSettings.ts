// ─── Notification Settings Domain ──────────────────────────────────────────

export interface QuietHours {
  enabled: boolean;
  /** Hora de início (0-23), padrão 22 */
  startHour: number;
  /** Hora de fim (0-23), padrão 8 */
  endHour: number;
}

export interface NotificationSettings {
  /** Master toggle — desabilitado até o usuário ativar explicitamente */
  enabled: boolean;
  /** Lembretes de vencimento de contas/cartões */
  billReminders: boolean;
  /** Alertas quando 80% ou 100% do orçamento 50/30/20 */
  budgetAlerts: boolean;
  /** Lembrete de fechamento do cartão de crédito */
  creditCardClosing: boolean;
  /** Milestones de metas de poupança (25%, 50%, 75%, 100%) */
  savingsGoalMilestones: boolean;
  /** Lembrete de transações pendentes */
  pendingTransactions: boolean;
  /** Resumo semanal (domingo 18h) */
  weeklySummary: boolean;
  /** Dias de antecedência para lembrete de vencimento (padrão 2) */
  billReminderDays: number;
  /** Dias de antecedência para lembrete de fechamento (padrão 1) */
  closingReminderDays: number;
  /** Horário silencioso */
  quietHours: QuietHours;
  /** true após o usuário ter visto o modal de setup */
  hasCompletedSetup: boolean;
}

export const DEFAULT_QUIET_HOURS: QuietHours = {
  enabled: true,
  startHour: 22,
  endHour: 8,
};

/** Tudo habilitado por padrão, mas master toggle OFF até setup */
export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  enabled: false,
  billReminders: true,
  budgetAlerts: true,
  creditCardClosing: true,
  savingsGoalMilestones: true,
  pendingTransactions: true,
  weeklySummary: true,
  billReminderDays: 2,
  closingReminderDays: 1,
  quietHours: { ...DEFAULT_QUIET_HOURS },
  hasCompletedSetup: false,
};

/** AsyncStorage key for notification settings */
export const NOTIFICATION_SETTINGS_KEY = "domus_notification_settings_v1";
