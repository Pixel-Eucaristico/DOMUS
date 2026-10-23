import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Switch,
} from "react-native";
import { TInput } from "@/src/components/tamagui";
import { Feather } from "@expo/vector-icons";
import { useAppState } from "@/src/context/AppStateProvider";
import { soundManager } from "@/src/services/SoundManager";
import {
  DAILY_TOKEN_BUDGET,
  MONTHLY_TOKEN_BUDGET,
  UNLIMITED_BUDGET,
  getProviderBudget,
  isUnlimitedBudget,
  getMonthlyBudget,
  isUnlimitedMonthlyBudget,
  getBillingCycle,
  getEffectiveDailyBudget,
} from "@/src/modules/ai/domain/AISettings";
import type { BudgetMode } from "@/src/modules/ai/domain/AISettings";
import {
  TokenPricingService,
  TOKEN_PRICES_USD,
} from "@/src/modules/ai/infrastructure/TokenPricingService";
import type { CostEstimate } from "@/src/modules/ai/infrastructure/TokenPricingService";
import type { AIProvider } from "@packages/ai";
import { appAlert } from "@/src/services/appAlert";

// ─── Props ───────────────────────────────────────────────────────────────────

interface BudgetCostSectionProps {
  provider: AIProvider;
  modelTier: "fast" | "smart";
  customBudgets?: Partial<Record<AIProvider, number>>;
  budgetMode: BudgetMode;
  monthlyBudgets?: Partial<Record<AIProvider, number>>;
  billingDay: number;
  onBudgetChange: (budget: number) => void;
  onMonthlyBudgetChange: (budget: number) => void;
  onBudgetModeChange: (mode: BudgetMode) => void;
  onBillingDayChange: (day: number) => void;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function BudgetCostSection({
  provider,
  modelTier,
  customBudgets,
  budgetMode,
  monthlyBudgets,
  billingDay,
  onBudgetChange,
  onMonthlyBudgetChange,
  onBudgetModeChange,
  onBillingDayChange,
}: BudgetCostSectionProps) {
  const { theme } = useAppState();
  const isMonthly = budgetMode === "monthly";

  // Daily mode values
  const dailyBudget = getProviderBudget(provider, customBudgets);
  const dailyUnlimited = isUnlimitedBudget(provider, customBudgets);
  const defaultDailyBudget = DAILY_TOKEN_BUDGET[provider];

  // Monthly mode values
  const monthlyBudget = getMonthlyBudget(provider, monthlyBudgets);
  const monthlyUnlimited = isUnlimitedMonthlyBudget(provider, monthlyBudgets);
  const defaultMonthlyBudget = MONTHLY_TOKEN_BUDGET[provider];
  const cycle = getBillingCycle(billingDay);
  const daysLeft = Math.max(1, Math.ceil((cycle.end.getTime() - Date.now()) / 86_400_000));
  const effectiveDaily = getEffectiveDailyBudget(provider, 0, billingDay, monthlyBudgets);

  // Current active values based on mode
  const activeBudget = isMonthly ? monthlyBudget : dailyBudget;
  const activeUnlimited = isMonthly ? monthlyUnlimited : dailyUnlimited;
  const activeDefault = isMonthly ? defaultMonthlyBudget : defaultDailyBudget;
  const activeOnChange = isMonthly ? onMonthlyBudgetChange : onBudgetChange;

  const usdPrice = TOKEN_PRICES_USD[provider][modelTier];
  const [exchangeRate, setExchangeRate] = useState<number | null>(null);
  const [budgetCost, setBudgetCost] = useState<CostEstimate | null>(null);

  // Bidirectional input state
  const [editingField, setEditingField] = useState<"tokens" | "brl" | "usd" | null>(null);
  const [tokensInput, setTokensInput] = useState(activeUnlimited ? "" : String(activeBudget));
  const [brlInput, setBrlInput] = useState("");
  const [usdInput, setUsdInput] = useState("");

  // Sync inputs when budget/provider/mode changes externally
  useEffect(() => {
    if (editingField) return;
    setTokensInput(activeUnlimited ? "" : String(activeBudget));
    if (exchangeRate && !activeUnlimited) {
      const usd = (activeBudget / 1_000_000) * usdPrice;
      const brl = usd * exchangeRate;
      setUsdInput(usd.toFixed(2));
      setBrlInput(brl.toFixed(2));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- sincroniza apenas em mudança externa de orçamento/provedor; reagir a editingField/exchangeRate sobrescreveria o que o usuário digita
  }, [activeBudget, activeUnlimited, provider, budgetMode]);

  // Fetch exchange rate and cost estimate
  useEffect(() => {
    let mounted = true;
    (async () => {
      const rate = await TokenPricingService.getUsdToBrl();
      if (!mounted) return;
      setExchangeRate(rate);
      if (!activeUnlimited) {
        const cost = await TokenPricingService.estimateCost(provider, modelTier, activeBudget);
        if (mounted) setBudgetCost(cost);
        const usd = (activeBudget / 1_000_000) * usdPrice;
        if (mounted && !editingField) {
          setUsdInput(usd.toFixed(2));
          setBrlInput((usd * rate).toFixed(2));
        }
      } else {
        if (mounted) setBudgetCost(null);
      }
    })();
    return () => { mounted = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- busca cotação só quando orçamento/modelo mudam; usdPrice deriva de provider+modelTier e editingField não deve refazer o fetch
  }, [provider, modelTier, activeBudget, activeUnlimited]);

  // ── Bidirectional conversion helpers ──

  const tokensFromBrl = (brl: number) => {
    if (!exchangeRate) return 0;
    return Math.floor(brl / ((usdPrice / 1_000_000) * exchangeRate));
  };
  const tokensFromUsd = (usd: number) => Math.floor(usd / (usdPrice / 1_000_000));
  const brlFromTokens = (t: number) => exchangeRate ? (t / 1_000_000) * usdPrice * exchangeRate : 0;
  const usdFromTokens = (t: number) => (t / 1_000_000) * usdPrice;

  const handleTokensChange = (text: string) => {
    setEditingField("tokens");
    setTokensInput(text);
    const val = parseInt(text, 10);
    if (!isNaN(val) && val > 0 && exchangeRate) {
      setBrlInput(brlFromTokens(val).toFixed(2));
      setUsdInput(usdFromTokens(val).toFixed(2));
    }
  };

  const handleBrlChange = (text: string) => {
    setEditingField("brl");
    setBrlInput(text);
    const val = parseFloat(text.replace(",", "."));
    if (!isNaN(val) && val > 0 && exchangeRate) {
      const t = tokensFromBrl(val);
      setTokensInput(String(t));
      setUsdInput(usdFromTokens(t).toFixed(2));
    }
  };

  const handleUsdChange = (text: string) => {
    setEditingField("usd");
    setUsdInput(text);
    const val = parseFloat(text.replace(",", "."));
    if (!isNaN(val) && val > 0) {
      const t = tokensFromUsd(val);
      setTokensInput(String(t));
      if (exchangeRate) setBrlInput(brlFromTokens(t).toFixed(2));
    }
  };

  const handleSave = () => {
    setEditingField(null);
    const val = parseInt(tokensInput, 10);
    if (isNaN(val) || val < 1000) {
      appAlert("Valor invalido", "O limite minimo e 1.000 tokens.");
      setTokensInput(activeUnlimited ? "" : String(activeBudget));
      return;
    }
    activeOnChange(val);
  };

  const handleReset = () => {
    soundManager.play("tap");
    activeOnChange(activeDefault);
    setTokensInput(String(activeDefault));
    setEditingField(null);
  };

  const handleToggleUnlimited = () => {
    soundManager.play("tap");
    if (activeUnlimited) {
      activeOnChange(activeDefault);
    } else {
      activeOnChange(UNLIMITED_BUDGET);
    }
  };

  const formatCycleDate = (d: Date) =>
    `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;

  return (
    <>
      <View style={sectionStyles.sectionHeader}>
        <Text style={[sectionStyles.sectionTitle, { color: theme.secondaryText }]}>
          Limites e custos
        </Text>
      </View>
      <View
        style={[
          sectionStyles.card,
          { backgroundColor: theme.cardBackground, borderColor: theme.border },
        ]}
      >
        {/* Mode toggle: Daily / Monthly */}
        <View style={styles.modeRow}>
          {(["daily", "monthly"] as BudgetMode[]).map((mode) => (
            <TouchableOpacity
              key={mode}
              onPress={() => { soundManager.play("tap"); onBudgetModeChange(mode); }}
              style={[
                styles.modeBtn,
                {
                  backgroundColor: budgetMode === mode ? theme.accentColor : theme.background,
                  borderColor: budgetMode === mode ? theme.accentColor : theme.border,
                },
              ]}
            >
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: budgetMode === mode ? "700" : "400",
                  color: budgetMode === mode ? "#fff" : theme.textColor,
                }}
              >
                {mode === "daily" ? "Diario" : "Mensal"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Billing day picker (monthly only) */}
        {isMonthly && (
          <View style={styles.billingDayRow}>
            <Text style={{ fontSize: 13, color: theme.textColor }}>
              Dia do vencimento:
            </Text>
            <View style={styles.billingDayControl}>
              <TouchableOpacity
                onPress={() => { soundManager.play("tap"); onBillingDayChange(Math.max(1, billingDay - 1)); }}
                style={[styles.billingDayBtn, { borderColor: theme.border }]}
              >
                <Feather name="minus" size={14} color={theme.textColor} />
              </TouchableOpacity>
              <Text style={[styles.billingDayValue, { color: theme.textColor }]}>
                {billingDay}
              </Text>
              <TouchableOpacity
                onPress={() => { soundManager.play("tap"); onBillingDayChange(Math.min(28, billingDay + 1)); }}
                style={[styles.billingDayBtn, { borderColor: theme.border }]}
              >
                <Feather name="plus" size={14} color={theme.textColor} />
              </TouchableOpacity>
            </View>
          </View>
        )}

        <Text style={[sectionStyles.cardTitle, { color: theme.textColor }]}>
          Limite {isMonthly ? "mensal" : "diario"} de tokens
        </Text>
        <Text style={[sectionStyles.cardSubtitle, { color: theme.secondaryText }]}>
          Padrao: {activeDefault.toLocaleString("pt-BR")} tokens.
          {isMonthly ? ` Ciclo: ${formatCycleDate(cycle.start)} — ${formatCycleDate(cycle.end)} (${daysLeft}d restantes).` : ""}
        </Text>

        {/* Unlimited toggle */}
        <View style={sectionStyles.toggleRow}>
          <View style={sectionStyles.toggleInfo}>
            <Text style={[sectionStyles.permissionLabel, { color: theme.textColor }]}>
              Modo ilimitado
            </Text>
            <Text style={[sectionStyles.cardSubtitle, { color: theme.secondaryText }]}>
              Sem limite {isMonthly ? "mensal" : "diario"} de tokens
            </Text>
          </View>
          <Switch
            value={activeUnlimited}
            onValueChange={handleToggleUnlimited}
            trackColor={{ false: theme.border, true: theme.warning }}
            thumbColor="#fff"
          />
        </View>

        {!activeUnlimited && (
          <>
            {/* Tokens input */}
            <View style={styles.fieldRow}>
              <Text style={[styles.fieldLabel, { color: theme.secondaryText }]}>Tokens</Text>
              <TInput
                flex={1}
                value={tokensInput}
                onChangeText={handleTokensChange}
                keyboardType="numeric"
                onBlur={handleSave}
                onSubmitEditing={handleSave}
                height={38}
                color={theme.textColor}
                backgroundColor={theme.cardBackground}
                borderColor={theme.border}
              />
              {activeBudget !== activeDefault && (
                <TouchableOpacity onPress={handleReset}>
                  <Feather name="rotate-ccw" size={14} color={theme.secondaryText} />
                </TouchableOpacity>
              )}
            </View>

            {/* BRL input */}
            <View style={styles.fieldRow}>
              <Text style={[styles.fieldLabel, { color: theme.secondaryText }]}>R$</Text>
              <TInput
                flex={1}
                value={brlInput}
                onChangeText={handleBrlChange}
                keyboardType="decimal-pad"
                placeholder="0,00"
                onBlur={handleSave}
                onSubmitEditing={handleSave}
                height={38}
                color={theme.textColor}
                backgroundColor={theme.cardBackground}
                borderColor={theme.border}
              />
            </View>

            {/* USD input */}
            <View style={styles.fieldRow}>
              <Text style={[styles.fieldLabel, { color: theme.secondaryText }]}>US$</Text>
              <TInput
                flex={1}
                value={usdInput}
                onChangeText={handleUsdChange}
                keyboardType="decimal-pad"
                placeholder="0.00"
                onBlur={handleSave}
                onSubmitEditing={handleSave}
                height={38}
                color={theme.textColor}
                backgroundColor={theme.cardBackground}
                borderColor={theme.border}
              />
            </View>
          </>
        )}

        {/* Effective daily (monthly mode) */}
        {isMonthly && !monthlyUnlimited && (
          <View style={[styles.effectiveCard, { backgroundColor: `${theme.accentColor}10` }]}>
            <Text style={{ fontSize: 12, color: theme.secondaryText }}>
              Limite efetivo diario (mensal / {daysLeft}d):
            </Text>
            <Text style={{ fontSize: 14, fontWeight: "700", color: theme.textColor }}>
              {effectiveDaily.toLocaleString("pt-BR")} tokens/dia
            </Text>
          </View>
        )}

        {/* Cost estimate */}
        <View style={[styles.costCard, { backgroundColor: `${theme.accentColor}10` }]}>
          <Text style={[styles.costTitle, { color: theme.textColor }]}>
            Custo estimado {activeUnlimited ? "(por uso)" : `do limite ${isMonthly ? "mensal" : "diario"}`}
          </Text>

          <View style={styles.costRow}>
            <Text style={[styles.costLabel, { color: theme.secondaryText }]}>
              Preco por 1M tokens:
            </Text>
            <Text style={[styles.costValue, { color: theme.textColor }]}>
              US$ {usdPrice.toFixed(2)}
              {exchangeRate ? ` (R$ ${(usdPrice * exchangeRate).toFixed(2)})` : ""}
            </Text>
          </View>

          {budgetCost && !activeUnlimited && (
            <View style={styles.costRow}>
              <Text style={[styles.costLabel, { color: theme.secondaryText }]}>
                Custo max {isMonthly ? "mensal" : "diario"}:
              </Text>
              <Text style={[styles.costValue, { color: theme.textColor }]}>
                R$ {budgetCost.costBrl.toFixed(2)} (US$ {budgetCost.costUsd.toFixed(2)})
              </Text>
            </View>
          )}

          {activeUnlimited && (
            <View style={styles.costRow}>
              <Feather name="alert-triangle" size={12} color={theme.warning} />
              <Text style={[styles.costLabel, { color: theme.warning }]}>
                Sem limite — custos podem acumular sem restricao
              </Text>
            </View>
          )}

          {exchangeRate && (
            <Text style={[styles.disclaimer, { color: theme.secondaryText }]}>
              Cotacao: 1 USD = {exchangeRate.toFixed(2)} BRL · Valores estimados
            </Text>
          )}
        </View>
      </View>
    </>
  );
}

// ─── Shared styles referenced from parent card layout ────────────────────────

const sectionStyles = StyleSheet.create({
  sectionHeader: {
    paddingHorizontal: 4,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    gap: 8,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "600",
  },
  cardSubtitle: {
    fontSize: 12,
    lineHeight: 16,
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  toggleInfo: {
    flex: 1,
    gap: 2,
  },
  permissionLabel: {
    fontSize: 14,
  },
});

// ─── Local styles ────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  modeRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 4,
  },
  modeBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
  },
  billingDayRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  billingDayControl: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  billingDayBtn: {
    width: 28,
    height: 28,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  billingDayValue: {
    fontSize: 16,
    fontWeight: "700",
    minWidth: 24,
    textAlign: "center",
  },
  fieldRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 4,
  },
  fieldLabel: {
    fontSize: 13,
    width: 52,
  },
  effectiveCard: {
    borderRadius: 10,
    padding: 10,
    gap: 2,
    marginTop: 4,
  },
  costCard: {
    borderRadius: 10,
    padding: 12,
    gap: 6,
    marginTop: 4,
  },
  costTitle: {
    fontSize: 13,
    fontWeight: "600",
  },
  costRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  costLabel: {
    fontSize: 12,
  },
  costValue: {
    fontSize: 12,
    fontWeight: "500",
  },
  disclaimer: {
    fontSize: 10,
    fontStyle: "italic",
    textAlign: "center",
    marginTop: 4,
  },
});
