import { useEffect, useRef } from "react";
import { Platform } from "react-native";
import { useAppState } from "@/src/context/AppStateProvider";
import { loadNotificationSettings } from "@/src/modules/notifications/application/NotificationSettingsStore";
import {
  cancelAll,
  scheduleNotification,
  setupChannels,
  setupCategories,
} from "@/src/modules/notifications/infrastructure/NotificationService";
import {
  computeBillReminders,
  computeBudgetAlerts,
  computeCreditCardClosingReminders,
  computeSavingsGoalAlerts,
  computeSavingsContributionReminders,
  computePendingTransactionReminders,
  computeWeeklySummary,
} from "@/src/modules/notifications/application/NotificationScheduler";

/**
 * Roda 1x na inicialização (após loading=false).
 * Cancela todas as notificações anteriores e reagenda com base no estado atual.
 * Silencioso em falhas (best-effort). Pula em web.
 */
export function useNotificationScheduler() {
  const { domain, loading } = useAppState();
  const hasRunRef = useRef(false);

  useEffect(() => {
    if (loading || hasRunRef.current) return;
    if (Platform.OS === "web") return;
    hasRunRef.current = true;

    (async () => {
      try {
        const settings = await loadNotificationSettings();
        if (!settings.enabled) return;

        await setupChannels();
        await setupCategories();
        await cancelAll();

        const notifications = [
          ...computeBillReminders(domain.accounts, domain.transactions, settings),
          ...computeBudgetAlerts(domain.transactions, domain.categories, domain.accounts, settings),
          ...computeCreditCardClosingReminders(domain.accounts, domain.transactions, settings),
          ...computeSavingsGoalAlerts(domain.accounts, settings),
          ...computeSavingsContributionReminders(domain.transactions, domain.accounts, settings),
          ...computePendingTransactionReminders(domain.transactions, domain.accounts, domain.categories, settings),
          ...computeWeeklySummary(domain.transactions, settings),
        ];

        for (const n of notifications) {
          await scheduleNotification(n);
        }
      } catch {
        // best-effort — silencioso em falhas
      }
    })();
  }, [loading]); // eslint-disable-line react-hooks/exhaustive-deps
}
