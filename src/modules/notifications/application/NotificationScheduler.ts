import type {
  AccountPayload,
  TransactionPayload,
  CategoryPayload,
} from "@packages/events/src/types";
import type { NotificationSettings } from "../domain/NotificationSettings";
import { CHANNELS, isInQuietHours } from "../infrastructure/NotificationService";

// Trigger types inline para evitar import direto do expo-notifications no bundle
type NotificationTrigger =
  | { type: "date"; date: Date }
  | { type: "daily"; hour: number; minute: number }
  | { type: "weekly"; weekday: number; hour: number; minute: number };

// ─── Tipos internos ─────────────────────────────────────────────────────────

export interface ScheduledNotification {
  channelId: string;
  title: string;
  body: string;
  trigger: NotificationTrigger;
  categoryIdentifier?: string;
  data?: Record<string, unknown>;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function dateForDayOfMonth(day: number): Date {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  let target = new Date(y, m, day);
  // Se o dia já passou neste mês, usa o próximo mês
  if (target.getTime() < now.getTime() - 86400000) {
    target = new Date(y, m + 1, day);
  }
  return target;
}

function formatCurrency(value: number): string {
  return `R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function triggerAtDate(date: Date): NotificationTrigger {
  return { type: "date", date };
}

function triggerWeekly(
  weekday: number,
  hour: number,
  minute: number,
): NotificationTrigger {
  return { type: "weekly", weekday, hour, minute };
}

function triggerDaily(
  hour: number,
  minute: number,
): NotificationTrigger {
  return { type: "daily", hour, minute };
}

// ─── Compute Functions ──────────────────────────────────────────────────────

/** Lembretes de vencimento: cartões de crédito (dueDay) e despesas recorrentes */
export function computeBillReminders(
  accounts: Record<string, AccountPayload>,
  transactions: Record<string, TransactionPayload>,
  settings: NotificationSettings,
): ScheduledNotification[] {
  if (!settings.billReminders) return [];
  const results: ScheduledNotification[] = [];
  const reminderDays = settings.billReminderDays;

  // Cartões de crédito com dueDay
  for (const acc of Object.values(accounts)) {
    if (acc.type !== "credit_card" || !acc.dueDay) continue;

    const dueDate = dateForDayOfMonth(acc.dueDay);
    const notifyDate = addDays(dueDate, -reminderDays);

    if (notifyDate.getTime() < Date.now()) continue;
    if (isInQuietHours(notifyDate, settings.quietHours)) {
      notifyDate.setHours(settings.quietHours.endHour, 0, 0, 0);
    }

    // Calcula fatura parcial: soma de despesas do mês atual nesta conta
    const now = new Date();
    const monthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    let invoiceTotal = 0;
    for (const tx of Object.values(transactions)) {
      if (tx.accountId === acc.id && tx.type === "expense" && tx.date?.startsWith(monthPrefix)) {
        invoiceTotal += tx.amount;
      }
    }

    const dayLabel = reminderDays === 1 ? "amanhã" : `em ${reminderDays} dias`;
    results.push({
      channelId: CHANNELS.BILL_REMINDERS,
      title: `Fatura: ${acc.name}`,
      body: `Fatura do ${acc.name} vence ${dayLabel} (dia ${acc.dueDay}). Valor: ${formatCurrency(invoiceTotal)}`,
      trigger: triggerAtDate(notifyDate),
      data: { type: "bill-reminder", accountId: acc.id },
    });
  }

  // Despesas recorrentes (monthly, weekly, yearly)
  for (const tx of Object.values(transactions)) {
    if (tx.type !== "expense" || !tx.recurrence || tx.recurrence === "once") continue;
    if (tx.status === "confirmed") continue;

    const txDate = new Date(tx.date + "T12:00:00");
    const notifyDate = addDays(txDate, -reminderDays);

    if (notifyDate.getTime() < Date.now()) continue;
    if (isInQuietHours(notifyDate, settings.quietHours)) {
      notifyDate.setHours(settings.quietHours.endHour, 0, 0, 0);
    }

    const desc = tx.description || "Despesa recorrente";
    results.push({
      channelId: CHANNELS.BILL_REMINDERS,
      title: "Vencimento Próximo",
      body: `${desc} vence ${reminderDays === 1 ? "amanhã" : `em ${reminderDays} dias`}. Valor: ${formatCurrency(tx.amount)}`,
      trigger: triggerAtDate(notifyDate),
      data: { type: "bill-reminder", transactionId: tx.id },
    });
  }

  return results;
}

/** Alertas de orçamento: verifica % das categorias 50/30/20 */
export function computeBudgetAlerts(
  transactions: Record<string, TransactionPayload>,
  categories: Record<string, CategoryPayload>,
  accounts: Record<string, AccountPayload>,
  settings: NotificationSettings,
): ScheduledNotification[] {
  if (!settings.budgetAlerts) return [];

  const now = new Date();
  const monthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  // Calcula receita total do mês (para determinar limites 50/30/20)
  let totalIncome = 0;
  for (const tx of Object.values(transactions)) {
    if (tx.type === "income" && tx.date?.startsWith(monthPrefix) && tx.status === "confirmed") {
      totalIncome += tx.amount;
    }
  }
  if (totalIncome <= 0) return [];

  const groupLimits: Record<string, { pct: number; label: string }> = {
    needs: { pct: 0.5, label: "Essencial" },
    wants: { pct: 0.3, label: "Estilo de Vida" },
    savings: { pct: 0.2, label: "Futuro" },
  };

  // Agrupa despesas do mês por grupo
  const groupSpending: Record<string, number> = { needs: 0, wants: 0, savings: 0 };
  for (const tx of Object.values(transactions)) {
    if (tx.type !== "expense" || !tx.date?.startsWith(monthPrefix)) continue;
    const cat = categories[tx.categoryId];
    if (!cat) continue;
    groupSpending[cat.group] = (groupSpending[cat.group] || 0) + tx.amount;
  }

  const results: ScheduledNotification[] = [];

  for (const [group, info] of Object.entries(groupLimits)) {
    const limit = totalIncome * info.pct;
    const spent = groupSpending[group] || 0;
    const pct = spent / limit;

    if (pct >= 1) {
      results.push({
        channelId: CHANNELS.BUDGET_ALERTS,
        title: "Limite Atingido",
        body: `${info.label} ultrapassou o orçamento de ${Math.round(info.pct * 100)}%. Gasto: ${formatCurrency(spent)}`,
        trigger: { type: "date", date: new Date(Date.now() + 5000) },
        data: { type: "budget-alert", group, level: 100 },
      });
    } else if (pct >= 0.8) {
      results.push({
        channelId: CHANNELS.BUDGET_ALERTS,
        title: "Atenção: Orçamento",
        body: `${info.label} atingiu 80% do limite mensal. Gasto: ${formatCurrency(spent)} de ${formatCurrency(limit)}`,
        trigger: { type: "date", date: new Date(Date.now() + 5000) },
        data: { type: "budget-alert", group, level: 80 },
      });
    }
  }

  return results;
}

/** Lembretes de fechamento do cartão de crédito */
export function computeCreditCardClosingReminders(
  accounts: Record<string, AccountPayload>,
  transactions: Record<string, TransactionPayload>,
  settings: NotificationSettings,
): ScheduledNotification[] {
  if (!settings.creditCardClosing) return [];
  const results: ScheduledNotification[] = [];
  const reminderDays = settings.closingReminderDays;

  for (const acc of Object.values(accounts)) {
    if (acc.type !== "credit_card" || !acc.closingDay) continue;

    const closingDate = dateForDayOfMonth(acc.closingDay);
    const notifyDate = addDays(closingDate, -reminderDays);

    if (notifyDate.getTime() < Date.now()) continue;
    if (isInQuietHours(notifyDate, settings.quietHours)) {
      notifyDate.setHours(settings.quietHours.endHour, 0, 0, 0);
    }

    // Calcula fatura parcial
    const now = new Date();
    const monthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    let partialInvoice = 0;
    for (const tx of Object.values(transactions)) {
      if (tx.accountId === acc.id && tx.type === "expense" && tx.date?.startsWith(monthPrefix)) {
        partialInvoice += tx.amount;
      }
    }

    const dayLabel = reminderDays === 1 ? "amanhã" : `em ${reminderDays} dias`;
    results.push({
      channelId: CHANNELS.CREDIT_CARD,
      title: `Fechamento: ${acc.name}`,
      body: `${acc.name} fecha ${dayLabel} (dia ${acc.closingDay}). Fatura parcial: ${formatCurrency(partialInvoice)}`,
      trigger: triggerAtDate(notifyDate),
      data: { type: "credit-card-closing", accountId: acc.id },
    });
  }

  return results;
}

/** Milestones de metas de poupança (25%, 50%, 75%, 100%) */
export function computeSavingsGoalAlerts(
  accounts: Record<string, AccountPayload>,
  settings: NotificationSettings,
): ScheduledNotification[] {
  if (!settings.savingsGoalMilestones) return [];
  const results: ScheduledNotification[] = [];

  for (const acc of Object.values(accounts)) {
    if (acc.type !== "savings" || !acc.savingsGoalEnabled || !acc.creditLimit) continue;
    // creditLimit é usado como meta na poupança
    const goal = acc.creditLimit;
    if (goal <= 0) continue;

    const progress = acc.balance / goal;
    const milestones = [0.25, 0.5, 0.75, 1.0];

    for (const milestone of milestones) {
      if (progress >= milestone && progress < milestone + 0.05) {
        results.push({
          channelId: CHANNELS.SAVINGS_MILESTONES,
          title: `Meta: ${acc.name}`,
          body: `Sua meta '${acc.name}' atingiu ${Math.round(milestone * 100)}%! ${formatCurrency(acc.balance)} de ${formatCurrency(goal)}`,
          trigger: { type: "date", date: new Date(Date.now() + 3000) },
          data: { type: "savings-milestone", accountId: acc.id, milestone },
        });
        break; // Apenas 1 milestone por conta
      }
    }
  }

  return results;
}

/** Lembretes de transações pendentes */
export function computePendingTransactionReminders(
  transactions: Record<string, TransactionPayload>,
  accounts: Record<string, AccountPayload>,
  categories: Record<string, CategoryPayload>,
  settings: NotificationSettings,
): ScheduledNotification[] {
  if (!settings.pendingTransactions) return [];

  const today = todayStr();
  // Exclui aportes de poupança — eles têm lembrete próprio na data certa,
  // não devem gerar notificação diária repetitiva
  const pending = Object.values(transactions).filter(
    (tx) =>
      tx.status === "pending" &&
      tx.date <= today &&
      !tx.description?.startsWith("Aporte poupança:"),
  );

  if (pending.length === 0) return [];

  // Horário: 9h (após fim do quiet hours padrão)
  let notifyHour = 9;
  if (isInQuietHours(new Date(new Date().setHours(9, 0, 0, 0)), settings.quietHours)) {
    notifyHour = settings.quietHours.endHour;
  }

  if (pending.length === 1) {
    const tx = pending[0];
    const acc = accounts[tx.accountId];
    const cat = categories[tx.categoryId];
    const accName = acc?.name || "Conta";
    const catName = cat?.name || "";

    return [{
      channelId: CHANNELS.PENDING_TRANSACTIONS,
      title: "Transação Pendente",
      body: `${tx.description || "Transação"} • ${catName}\n${formatCurrency(tx.amount)} • ${accName}\nVencimento: ${tx.date.split("-").reverse().join("/")}`,
      trigger: triggerDaily(notifyHour, 0),
      categoryIdentifier: "pending-transaction",
      data: { type: "pending-transaction", transactionId: tx.id },
    }];
  }

  // Múltiplas pendentes: notificação agrupada
  const total = pending.reduce((sum, tx) => sum + tx.amount, 0);
  const lines = pending.slice(0, 5).map((tx) => {
    const desc = tx.description || "Transação";
    return `${desc} - ${formatCurrency(tx.amount)}`;
  });
  const extra = pending.length > 5 ? `\n+${pending.length - 5} mais` : "";

  return [{
    channelId: CHANNELS.PENDING_TRANSACTIONS,
    title: `${pending.length} Transações Pendentes`,
    body: `${lines.join("\n")}${extra}\nTotal: ${formatCurrency(total)}`,
    trigger: triggerDaily(notifyHour, 0),
    data: { type: "pending-transactions-group", count: pending.length },
  }];
}

/** Lembrete de aporte de poupança — apenas no dia configurado (ou dia seguinte) */
export function computeSavingsContributionReminders(
  transactions: Record<string, TransactionPayload>,
  accounts: Record<string, AccountPayload>,
  settings: NotificationSettings,
): ScheduledNotification[] {
  if (!settings.pendingTransactions) return [];
  const results: ScheduledNotification[] = [];

  const today = todayStr();
  const pendingSavings = Object.values(transactions).filter(
    (tx) =>
      tx.status === "pending" &&
      tx.date <= today &&
      tx.description?.startsWith("Aporte poupança:"),
  );

  if (pendingSavings.length === 0) return results;

  let notifyHour = 9;
  if (isInQuietHours(new Date(new Date().setHours(9, 0, 0, 0)), settings.quietHours)) {
    notifyHour = settings.quietHours.endHour;
  }

  for (const tx of pendingSavings) {
    const acc = accounts[tx.accountId];
    const accName = acc?.name || "Poupança";
    results.push({
      channelId: CHANNELS.PENDING_TRANSACTIONS,
      title: `Aporte pendente: ${accName}`,
      body: `Confirme o aporte de ${formatCurrency(tx.amount)} para ${accName}`,
      trigger: triggerAtDate(new Date(new Date().setHours(notifyHour, 0, 0, 0))),
      data: { type: "savings-contribution", transactionId: tx.id },
    });
  }

  return results;
}

/** Resumo semanal — domingo 18h */
export function computeWeeklySummary(
  transactions: Record<string, TransactionPayload>,
  settings: NotificationSettings,
): ScheduledNotification[] {
  if (!settings.weeklySummary) return [];

  // Calcula receita e despesa da semana atual
  const now = new Date();
  const day = now.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diffToMonday);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  const fmt = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

  const weekStart = fmt(monday);
  const weekEnd = fmt(sunday);

  let income = 0;
  let expense = 0;
  for (const tx of Object.values(transactions)) {
    if (tx.date < weekStart || tx.date > weekEnd) continue;
    if (tx.type === "income") income += tx.amount;
    if (tx.type === "expense") expense += tx.amount;
  }

  const balance = income - expense;
  const sign = balance >= 0 ? "+" : "";

  return [{
    channelId: CHANNELS.WEEKLY_SUMMARY,
    title: "Resumo da Semana",
    body: `Semana: ${formatCurrency(income)} receita, ${formatCurrency(expense)} despesas. Saldo: ${sign}${formatCurrency(Math.abs(balance))}`,
    trigger: triggerWeekly(1, 18, 0), // 1 = Sunday in expo-notifications
    data: { type: "weekly-summary" },
  }];
}
