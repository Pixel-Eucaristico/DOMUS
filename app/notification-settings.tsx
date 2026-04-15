import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Platform,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useAppState } from "@/src/context/AppStateProvider";
import { soundManager } from "@/src/services/SoundManager";
import { TCard, TText } from "@/src/components/tamagui";
import {
  loadNotificationSettings,
  saveNotificationSettings,
} from "@/src/modules/notifications/application/NotificationSettingsStore";
import {
  requestPermission,
  setupChannels,
  setupCategories,
  cancelAll,
} from "@/src/modules/notifications/infrastructure/NotificationService";
import {
  DEFAULT_NOTIFICATION_SETTINGS,
  type NotificationSettings,
} from "@/src/modules/notifications/domain/NotificationSettings";

export default function NotificationSettingsScreen() {
  const router = useRouter();
  const { theme } = useAppState();
  const [settings, setSettings] = useState<NotificationSettings>(DEFAULT_NOTIFICATION_SETTINGS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadNotificationSettings().then((s) => {
      setSettings(s);
      setLoading(false);
    });
  }, []);

  const update = useCallback(
    (patch: Partial<NotificationSettings>) => {
      const next = { ...settings, ...patch };
      setSettings(next);
      saveNotificationSettings(next);
    },
    [settings],
  );

  const handleMasterToggle = useCallback(
    async (value: boolean) => {
      if (value) {
        const granted = await requestPermission();
        if (!granted) {
          Alert.alert(
            "Permissão Necessária",
            "Para receber notificações, habilite a permissão nas configurações do sistema.",
          );
          return;
        }
        await setupChannels();
        await setupCategories();
      } else {
        await cancelAll();
      }
      update({ enabled: value });
    },
    [update],
  );

  const s = styles(theme);

  if (loading) return null;

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity
          onPress={() => { soundManager.play("tap"); router.back(); }}
          style={s.backBtn}
          activeOpacity={0.7}
        >
          <Feather name="arrow-left" size={22} color={theme.textColor} />
        </TouchableOpacity>
        <TText variant="subtitle" bold color={theme.textColor} fontSize={19} flex={1}>
          Notificações
        </TText>
      </View>

      <ScrollView
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Master Toggle */}
        <TCard backgroundColor={theme.cardBackground} borderColor={theme.border} padding={0}>
          <View style={s.cardBody}>
            <SwitchRow
              icon="bell"
              label="Notificações"
              description="Habilitar lembretes e alertas locais"
              color="#F59E0B"
              theme={theme}
              value={settings.enabled}
              onValueChange={handleMasterToggle}
            />
          </View>
        </TCard>

        {/* Categorias */}
        <TCard backgroundColor={theme.cardBackground} borderColor={theme.border} padding={0} opacity={!settings.enabled ? 0.5 : 1}>
          <View style={s.sectionHeader}>
            <View style={[s.sectionIconBg, { backgroundColor: "#6366F118" }]}>
              <Feather name="layers" size={16} color="#6366F1" />
            </View>
            <TText variant="subtitle" bold color={theme.textColor} fontSize={15} flex={1}>Categorias</TText>
          </View>
          <View style={[s.divider, { backgroundColor: theme.border }]} />
          <View style={s.cardBody}>
            <SwitchRow
              icon="credit-card"
              label="Vencimento de Contas"
              description="Lembrete antes do vencimento de faturas e recorrentes"
              color="#EF4444"
              theme={theme}
              value={settings.billReminders}
              onValueChange={(v) => update({ billReminders: v })}
              disabled={!settings.enabled}
            />
            <SwitchRow
              icon="pie-chart"
              label="Alertas de Orçamento"
              description="Aviso ao atingir 80% ou 100% do limite 50/30/20"
              color="#F59E0B"
              theme={theme}
              value={settings.budgetAlerts}
              onValueChange={(v) => update({ budgetAlerts: v })}
              disabled={!settings.enabled}
            />
            <SwitchRow
              icon="calendar"
              label="Fechamento do Cartão"
              description="Lembrete antes da data de fechamento"
              color="#8B5CF6"
              theme={theme}
              value={settings.creditCardClosing}
              onValueChange={(v) => update({ creditCardClosing: v })}
              disabled={!settings.enabled}
            />
            <SwitchRow
              icon="target"
              label="Metas de Poupança"
              description="Milestones quando atingir 25%, 50%, 75% e 100%"
              color="#10B981"
              theme={theme}
              value={settings.savingsGoalMilestones}
              onValueChange={(v) => update({ savingsGoalMilestones: v })}
              disabled={!settings.enabled}
            />
            <SwitchRow
              icon="clock"
              label="Transações Pendentes"
              description="Lembrete diário de transações aguardando efetivação"
              color="#3B82F6"
              theme={theme}
              value={settings.pendingTransactions}
              onValueChange={(v) => update({ pendingTransactions: v })}
              disabled={!settings.enabled}
            />
            <SwitchRow
              icon="bar-chart-2"
              label="Resumo Semanal"
              description="Digest com receitas, despesas e saldo (domingo 18h)"
              color="#06B6D4"
              theme={theme}
              value={settings.weeklySummary}
              onValueChange={(v) => update({ weeklySummary: v })}
              disabled={!settings.enabled}
            />
          </View>
        </TCard>

        {/* Antecedência */}
        <TCard backgroundColor={theme.cardBackground} borderColor={theme.border} padding={0} opacity={!settings.enabled ? 0.5 : 1}>
          <View style={s.sectionHeader}>
            <View style={[s.sectionIconBg, { backgroundColor: "#F59E0B18" }]}>
              <Feather name="clock" size={16} color="#F59E0B" />
            </View>
            <TText variant="subtitle" bold color={theme.textColor} fontSize={15} flex={1}>Antecedência</TText>
          </View>
          <View style={[s.divider, { backgroundColor: theme.border }]} />
          <View style={s.cardBody}>
            <DaySelector
              label="Lembrete de Vencimento"
              description="Dias antes do vencimento da fatura"
              value={settings.billReminderDays}
              onChange={(v) => update({ billReminderDays: v })}
              theme={theme}
              disabled={!settings.enabled}
            />
            <DaySelector
              label="Lembrete de Fechamento"
              description="Dias antes do fechamento do cartão"
              value={settings.closingReminderDays}
              onChange={(v) => update({ closingReminderDays: v })}
              theme={theme}
              disabled={!settings.enabled}
            />
          </View>
        </TCard>

        {/* Horário Silencioso */}
        <TCard backgroundColor={theme.cardBackground} borderColor={theme.border} padding={0} opacity={!settings.enabled ? 0.5 : 1}>
          <View style={s.sectionHeader}>
            <View style={[s.sectionIconBg, { backgroundColor: "#8B5CF618" }]}>
              <Feather name="moon" size={16} color="#8B5CF6" />
            </View>
            <TText variant="subtitle" bold color={theme.textColor} fontSize={15} flex={1}>Horário Silencioso</TText>
          </View>
          <View style={[s.divider, { backgroundColor: theme.border }]} />
          <View style={s.cardBody}>
            <SwitchRow
              icon="volume-x"
              label="Não Perturbe"
              description={
                settings.quietHours.enabled
                  ? `${String(settings.quietHours.startHour).padStart(2, "0")}:00 às ${String(settings.quietHours.endHour).padStart(2, "0")}:00`
                  : "Desabilitado"
              }
              color="#8B5CF6"
              theme={theme}
              value={settings.quietHours.enabled}
              onValueChange={(v) =>
                update({ quietHours: { ...settings.quietHours, enabled: v } })
              }
              disabled={!settings.enabled}
            />
            {settings.quietHours.enabled && settings.enabled && (
              <View style={s.hourRow}>
                <HourSelector
                  label="Início"
                  value={settings.quietHours.startHour}
                  onChange={(v) =>
                    update({ quietHours: { ...settings.quietHours, startHour: v } })
                  }
                  theme={theme}
                />
                <HourSelector
                  label="Fim"
                  value={settings.quietHours.endHour}
                  onChange={(v) =>
                    update({ quietHours: { ...settings.quietHours, endHour: v } })
                  }
                  theme={theme}
                />
              </View>
            )}
          </View>
        </TCard>

        {/* Info */}
        <View style={[s.infoBox, { backgroundColor: `${theme.primaryColor}10` }]}>
          <Feather name="shield" size={14} color={theme.primaryColor} />
          <Text style={[s.infoText, { color: theme.primaryColor }]}>
            Todas as notificações são 100% locais. Nenhum dado é enviado para servidores.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Sub-components ─────────────────────────────────────────────────────────

function SwitchRow({
  icon,
  label,
  description,
  color,
  theme,
  value,
  onValueChange,
  disabled,
}: {
  icon: string;
  label: string;
  description: string;
  color: string;
  theme: any;
  value: boolean;
  onValueChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <View style={[swStyles.row, disabled && { opacity: 0.5 }]}>
      <View style={[swStyles.iconBg, { backgroundColor: color + "18" }]}>
        <Feather name={icon as any} size={16} color={color} />
      </View>
      <View style={swStyles.texts}>
        <Text style={[swStyles.label, { color: theme.textColor }]}>{label}</Text>
        <Text style={[swStyles.description, { color: theme.secondaryText }]}>
          {description}
        </Text>
      </View>
      <Switch
        value={value}
        onValueChange={(v) => {
          soundManager.play("tap");
          onValueChange(v);
        }}
        trackColor={{ true: theme.primaryColor }}
        thumbColor={Platform.OS === "ios" ? undefined : value ? "#fff" : "#f4f3f4"}
        disabled={disabled}
      />
    </View>
  );
}

const swStyles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 6 },
  iconBg: { width: 36, height: 36, borderRadius: 10, justifyContent: "center", alignItems: "center" },
  texts: { flex: 1 },
  label: { fontFamily: "DMSans_600SemiBold", fontSize: 14 },
  description: { fontFamily: "DMSans_400Regular", fontSize: 12, marginTop: 1 },
});

function DaySelector({
  label,
  description,
  value,
  onChange,
  theme,
  disabled,
}: {
  label: string;
  description: string;
  value: number;
  onChange: (v: number) => void;
  theme: any;
  disabled?: boolean;
}) {
  const options = [1, 2, 3, 5, 7];
  return (
    <View style={[dayStyles.container, disabled && { opacity: 0.5 }]}>
      <Text style={[dayStyles.label, { color: theme.textColor }]}>{label}</Text>
      <Text style={[dayStyles.description, { color: theme.secondaryText }]}>
        {description}
      </Text>
      <View style={dayStyles.chips}>
        {options.map((d) => (
          <TouchableOpacity
            key={d}
            style={[
              dayStyles.chip,
              {
                backgroundColor: d === value ? theme.primaryColor : theme.background,
                borderColor: d === value ? theme.primaryColor : theme.border,
              },
            ]}
            onPress={() => {
              if (disabled) return;
              soundManager.play("tap");
              onChange(d);
            }}
            activeOpacity={0.7}
          >
            <Text
              style={[
                dayStyles.chipText,
                { color: d === value ? "#fff" : theme.textColor },
              ]}
            >
              {d}d
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const dayStyles = StyleSheet.create({
  container: { gap: 4 },
  label: { fontFamily: "DMSans_600SemiBold", fontSize: 14 },
  description: { fontFamily: "DMSans_400Regular", fontSize: 12 },
  chips: { flexDirection: "row", gap: 8, marginTop: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  chipText: { fontFamily: "DMSans_600SemiBold", fontSize: 13 },
});

function HourSelector({
  label,
  value,
  onChange,
  theme,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  theme: any;
}) {
  return (
    <View style={hourStyles.container}>
      <Text style={[hourStyles.label, { color: theme.secondaryText }]}>{label}</Text>
      <View style={hourStyles.stepper}>
        <TouchableOpacity
          style={[hourStyles.btn, { backgroundColor: theme.background, borderColor: theme.border }]}
          onPress={() => {
            soundManager.play("tap");
            onChange((value - 1 + 24) % 24);
          }}
        >
          <Feather name="minus" size={14} color={theme.textColor} />
        </TouchableOpacity>
        <Text style={[hourStyles.value, { color: theme.textColor }]}>
          {String(value).padStart(2, "0")}:00
        </Text>
        <TouchableOpacity
          style={[hourStyles.btn, { backgroundColor: theme.background, borderColor: theme.border }]}
          onPress={() => {
            soundManager.play("tap");
            onChange((value + 1) % 24);
          }}
        >
          <Feather name="plus" size={14} color={theme.textColor} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const hourStyles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", gap: 6 },
  label: { fontFamily: "DMSans_500Medium", fontSize: 12 },
  stepper: { flexDirection: "row", alignItems: "center", gap: 10 },
  btn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  value: { fontFamily: "DMSans_700Bold", fontSize: 16, minWidth: 52, textAlign: "center" },
});

// ─── Stylesheet ─────────────────────────────────────────────────────────────

function styles(theme: any) {
  return StyleSheet.create({
    safe: { flex: 1 },
    header: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingVertical: 12,
      gap: 10,
    },
    backBtn: { padding: 4 },
    content: { paddingHorizontal: 16, paddingBottom: 40, gap: 12 },
    cardBody: { paddingHorizontal: 14, paddingTop: 12, paddingBottom: 14, gap: 10 },
    sectionHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      paddingHorizontal: 14,
      paddingVertical: 13,
    },
    sectionIconBg: {
      width: 36,
      height: 36,
      borderRadius: 11,
      justifyContent: "center",
      alignItems: "center",
    },
    divider: { height: StyleSheet.hairlineWidth, marginHorizontal: 14 },
    hourRow: { flexDirection: "row", gap: 16, paddingTop: 8 },
    infoBox: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 10,
      borderRadius: 12,
      padding: 14,
    },
    infoText: {
      fontFamily: "DMSans_400Regular",
      fontSize: 12,
      lineHeight: 17,
      flex: 1,
    },
  });
}
