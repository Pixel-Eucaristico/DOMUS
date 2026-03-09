import { Platform } from "react-native";
import type { QuietHours } from "../domain/NotificationSettings";

// ─── Lazy import (evita crash se native module não estiver disponível) ───────

let _Notifications: typeof import("expo-notifications") | null = null;

async function getNotifications() {
  if (!_Notifications) {
    _Notifications = await import("expo-notifications");
  }
  return _Notifications;
}

// ─── Channel IDs (Android) ──────────────────────────────────────────────────

export const CHANNELS = {
  BILL_REMINDERS: "bill-reminders",
  BUDGET_ALERTS: "budget-alerts",
  SAVINGS_MILESTONES: "savings-milestones",
  PENDING_TRANSACTIONS: "pending-transactions",
  WEEKLY_SUMMARY: "weekly-summary",
  CREDIT_CARD: "credit-card",
} as const;

// ─── Notification Handler (foreground) ──────────────────────────────────────

let _handlerConfigured = false;

async function ensureHandler() {
  if (_handlerConfigured) return;
  _handlerConfigured = true;
  try {
    const Notifications = await getNotifications();
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
  } catch {
    // not available
  }
}

// ─── Setup ──────────────────────────────────────────────────────────────────

/** Solicita permissão de notificações ao OS */
export async function requestPermission(): Promise<boolean> {
  if (Platform.OS === "web") return false;
  try {
    const Notifications = await getNotifications();
    const { status: existing } = await Notifications.getPermissionsAsync();
    if (existing === "granted") return true;
    const { status } = await Notifications.requestPermissionsAsync();
    return status === "granted";
  } catch {
    return false;
  }
}

/** Cria canais Android para categorizar notificações */
export async function setupChannels(): Promise<void> {
  if (Platform.OS !== "android") return;
  try {
    const Notifications = await getNotifications();
    const channels: { id: string; name: string }[] = [
      { id: CHANNELS.BILL_REMINDERS, name: "Lembretes de Contas" },
      { id: CHANNELS.BUDGET_ALERTS, name: "Alertas de Orçamento" },
      { id: CHANNELS.SAVINGS_MILESTONES, name: "Metas de Poupança" },
      { id: CHANNELS.PENDING_TRANSACTIONS, name: "Transações Pendentes" },
      { id: CHANNELS.WEEKLY_SUMMARY, name: "Resumo Semanal" },
      { id: CHANNELS.CREDIT_CARD, name: "Cartão de Crédito" },
    ];
    for (const ch of channels) {
      await Notifications.setNotificationChannelAsync(ch.id, {
        name: ch.name,
        importance: Notifications.AndroidImportance.DEFAULT,
        sound: "default",
      });
    }
  } catch {
    // not available
  }
}

/** Registra categorias de ação para notificações interativas */
export async function setupCategories(): Promise<void> {
  if (Platform.OS === "web") return;
  try {
    const Notifications = await getNotifications();
    await Notifications.setNotificationCategoryAsync("pending-transaction", [
      {
        identifier: "efetivar",
        buttonTitle: "Efetivar ✓",
        options: { opensAppToForeground: false },
      },
      {
        identifier: "editar",
        buttonTitle: "Editar ✏️",
        options: { opensAppToForeground: true },
      },
    ]);
  } catch {
    // not available
  }
}

// ─── Schedule / Cancel ──────────────────────────────────────────────────────

interface ScheduleOptions {
  channelId: string;
  title: string;
  body: string;
  trigger: { type: string; [key: string]: unknown };
  categoryIdentifier?: string;
  data?: Record<string, unknown>;
}

/** Agenda uma notificação local */
export async function scheduleNotification(
  opts: ScheduleOptions,
): Promise<string> {
  await ensureHandler();
  const Notifications = await getNotifications();
  return Notifications.scheduleNotificationAsync({
    content: {
      title: opts.title,
      body: opts.body,
      sound: "default",
      categoryIdentifier: opts.categoryIdentifier,
      data: opts.data ?? {},
      ...(Platform.OS === "android" ? { channelId: opts.channelId } : {}),
    },
    trigger: opts.trigger as any,
  });
}

/** Cancela todas as notificações agendadas (reagendamento completo) */
export async function cancelAll(): Promise<void> {
  try {
    const Notifications = await getNotifications();
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch {
    // not available
  }
}

// ─── Quiet Hours Helper ─────────────────────────────────────────────────────

/** Verifica se um horário cai dentro do período silencioso */
export function isInQuietHours(
  date: Date,
  quietHours: QuietHours,
): boolean {
  if (!quietHours.enabled) return false;
  const hour = date.getHours();
  const { startHour, endHour } = quietHours;

  // Ex: 22h-8h → hour >= 22 OR hour < 8
  if (startHour > endHour) {
    return hour >= startHour || hour < endHour;
  }
  // Ex: 1h-6h → hour >= 1 AND hour < 6
  return hour >= startHour && hour < endHour;
}
