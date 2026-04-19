import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Modal,
  TextInput,
  ScrollView,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { soundManager } from "@/src/services/SoundManager";
import type { ThemeColors } from "@packages/theme";
import type { AccountPayload, AccountType } from "@packages/events/src/types";

const TYPE_CONFIG: Record<
  AccountType,
  { label: string; icon: string; color: string }
> = {
  checking:    { label: "Conta Corrente",    icon: "credit-card",  color: "#3B82F6" },
  savings:     { label: "Poupança",          icon: "trending-up",  color: "#10B981" },
  wallet:      { label: "Carteira",          icon: "briefcase",    color: "#F59E0B" },
  credit_card: { label: "Cartão de Crédito", icon: "zap",          color: "#8B5CF6" },
};

function formatBalance(acc: AccountPayload): string {
  const v = acc.balance ?? 0;
  const abs = Math.abs(v).toLocaleString("pt-BR", { minimumFractionDigits: 2 });
  return v < 0 ? `−R$ ${abs}` : `R$ ${abs}`;
}

interface AccountPickerProps {
  accounts: AccountPayload[];
  selectedId: string;
  theme: ThemeColors;
  label?: string;
  onSelect: (id: string) => void;
  compact?: boolean; // always modal — button + search modal
}

// ─── Compact (modal) mode ─────────────────────────────────────────────────────

function CompactAccountPicker({
  accounts,
  selectedId,
  theme,
  label = "Conta",
  onSelect,
}: AccountPickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const selected = accounts.find((a) => a.id === selectedId);
  const selCfg = selected ? TYPE_CONFIG[selected.type] ?? TYPE_CONFIG.checking : null;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return accounts;
    return accounts.filter(
      (a) =>
        a.name.toLowerCase().includes(q) ||
        (TYPE_CONFIG[a.type]?.label ?? "").toLowerCase().includes(q),
    );
  }, [accounts, search]);

  const handleSelect = (id: string) => {
    soundManager.play("tap");
    onSelect(id);
    setOpen(false);
    setSearch("");
  };

  return (
    <>
      {/* Trigger button */}
      <Pressable
        style={[
          cs.trigger,
          {
            backgroundColor: theme.cardBackground,
            borderColor: selCfg ? selCfg.color : theme.border,
          },
        ]}
        onPress={() => { soundManager.play("pop"); setOpen(true); }}
      >
        {selCfg ? (
          <View style={[cs.triggerIcon, { backgroundColor: `${selCfg.color}18` }]}>
            <Feather name={selCfg.icon as any} size={16} color={selCfg.color} />
          </View>
        ) : (
          <View style={[cs.triggerIcon, { backgroundColor: `${theme.primaryColor}12` }]}>
            <Feather name="credit-card" size={16} color={theme.primaryColor} />
          </View>
        )}
        <View style={{ flex: 1 }}>
          <Text style={[cs.triggerLabel, { color: theme.secondaryText }]}>{label}</Text>
          <Text style={[cs.triggerValue, { color: selected ? theme.textColor : theme.secondaryText }]}>
            {selected ? selected.name : "Selecionar conta..."}
          </Text>
        </View>
        <Feather name="chevron-down" size={16} color={theme.secondaryText} />
      </Pressable>

      {/* Modal */}
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={cs.overlay} onPress={() => { setOpen(false); setSearch(""); }}>
          <Pressable
            style={[cs.sheet, { backgroundColor: theme.background }]}
            onPress={(e) => e.stopPropagation?.()}
          >
            {/* Header */}
            <View style={[cs.sheetHeader, { borderBottomColor: theme.border }]}>
              <Text style={[cs.sheetTitle, { color: theme.textColor }]}>{label}</Text>
              <Pressable onPress={() => { setOpen(false); setSearch(""); }} hitSlop={10}>
                <Feather name="x" size={22} color={theme.secondaryText} />
              </Pressable>
            </View>

            {/* Search */}
            {accounts.length > 4 && (
              <View style={[cs.searchBox, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
                <Feather name="search" size={15} color={theme.secondaryText} />
                <TextInput
                  style={[cs.searchInput, { color: theme.textColor }]}
                  placeholder="Buscar conta..."
                  placeholderTextColor={theme.secondaryText}
                  value={search}
                  onChangeText={setSearch}
                  autoFocus
                />
                {search.length > 0 && (
                  <Pressable onPress={() => setSearch("")} hitSlop={8}>
                    <Feather name="x-circle" size={15} color={theme.secondaryText} />
                  </Pressable>
                )}
              </View>
            )}

            {/* List */}
            <ScrollView style={cs.list} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              {filtered.length === 0 ? (
                <Text style={[cs.empty, { color: theme.secondaryText }]}>Nenhuma conta encontrada</Text>
              ) : (
                filtered.map((a) => {
                  const cfg = TYPE_CONFIG[a.type] ?? TYPE_CONFIG.checking;
                  const active = a.id === selectedId;
                  return (
                    <Pressable
                      key={a.id}
                      style={({ pressed }) => [
                        cs.row,
                        {
                          backgroundColor: active ? `${cfg.color}12` : theme.cardBackground,
                          borderColor: active ? cfg.color : theme.border,
                          opacity: pressed ? 0.75 : 1,
                        },
                      ]}
                      onPress={() => handleSelect(a.id)}
                    >
                      <View style={[cs.iconBox, { backgroundColor: `${cfg.color}18` }]}>
                        <Feather name={cfg.icon as any} size={18} color={cfg.color} />
                      </View>
                      <View style={cs.info}>
                        <Text style={[cs.accountName, { color: theme.textColor }]} numberOfLines={1}>
                          {a.name}
                        </Text>
                        <Text style={[cs.accountType, { color: cfg.color }]}>{cfg.label}</Text>
                      </View>
                      <View style={cs.balanceBox}>
                        <Text style={[cs.balance, { color: (a.balance ?? 0) < 0 ? theme.danger : theme.secondaryText }]}>
                          {formatBalance(a)}
                        </Text>
                        {active && (
                          <View style={[cs.checkCircle, { backgroundColor: cfg.color }]}>
                            <Feather name="check" size={10} color="#FFF" />
                          </View>
                        )}
                      </View>
                    </Pressable>
                  );
                })
              )}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

// ─── List (inline) mode — original behavior ───────────────────────────────────

function ListAccountPicker({
  accounts,
  selectedId,
  theme,
  label = "Conta",
  onSelect,
}: AccountPickerProps) {
  if (accounts.length === 0) return null;

  return (
    <View style={[s.card, { backgroundColor: theme.cardBackground }]}>
      <Text style={[s.label, { color: theme.secondaryText }]}>{label}</Text>
      <View style={s.list}>
        {accounts.map((a) => {
          const cfg = TYPE_CONFIG[a.type] ?? TYPE_CONFIG.checking;
          const active = selectedId === a.id;
          const color = cfg.color;
          return (
            <Pressable
              key={a.id}
              style={({ pressed }) => [
                s.row,
                {
                  backgroundColor: active ? `${color}12` : theme.background,
                  borderColor: active ? color : theme.border,
                  opacity: pressed ? 0.75 : 1,
                },
              ]}
              onPress={() => { soundManager.play("tap"); onSelect(a.id); }}
              accessibilityRole="radio"
              accessibilityState={{ checked: active }}
              accessibilityLabel={`${a.name}, ${cfg.label}, saldo ${formatBalance(a)}${active ? ", selecionada" : ""}`}
            >
              <View style={[s.iconBox, { backgroundColor: `${color}18` }]}>
                <Feather name={cfg.icon as any} size={18} color={color} />
              </View>
              <View style={s.info}>
                <Text style={[s.accountName, { color: theme.textColor }]} numberOfLines={1}>{a.name}</Text>
                <Text style={[s.accountType, { color }]}>{cfg.label}</Text>
              </View>
              <View style={s.balanceBox}>
                <Text style={[s.balance, { color: (a.balance ?? 0) < 0 ? theme.danger : theme.secondaryText }]}>
                  {formatBalance(a)}
                </Text>
                {active && (
                  <View style={[s.checkCircle, { backgroundColor: color }]}>
                    <Feather name="check" size={10} color="#FFF" />
                  </View>
                )}
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

// ─── Public component — auto-selects mode ────────────────────────────────────

export function AccountPicker(props: AccountPickerProps) {
  const useCompact = props.compact || props.accounts.length > 3;
  return useCompact
    ? <CompactAccountPicker {...props} />
    : <ListAccountPicker {...props} />;
}

// ─── Styles ──────────────────────────────────────────────────────────────────

// Compact styles
const cs = StyleSheet.create({
  trigger: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 14,
  },
  triggerIcon: {
    width: 38,
    height: 38,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  triggerLabel: { fontFamily: "DMSans_400Regular", fontSize: 11, marginBottom: 2 },
  triggerValue: { fontFamily: "DMSans_600SemiBold", fontSize: 15 },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: "75%",
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: 14,
    marginBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  sheetTitle: { fontFamily: "DMSans_700Bold", fontSize: 17 },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    fontFamily: "DMSans_400Regular",
    fontSize: 15,
    padding: 0,
  },
  list: { flex: 1 },
  empty: { textAlign: "center", marginTop: 24, fontFamily: "DMSans_400Regular" },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 14,
    borderWidth: 1.5,
    padding: 12,
    marginBottom: 8,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  info: { flex: 1, gap: 2 },
  accountName: { fontFamily: "DMSans_600SemiBold", fontSize: 14 },
  accountType: { fontFamily: "DMSans_400Regular", fontSize: 11 },
  balanceBox: { alignItems: "flex-end", gap: 4 },
  balance: { fontFamily: "DMSans_500Medium", fontSize: 13 },
  checkCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
});

// List styles (original)
const s = StyleSheet.create({
  card: { borderRadius: 20, padding: 20 },
  label: { fontFamily: "DMSans_500Medium", fontSize: 13, marginBottom: 10 },
  list: { gap: 8 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 14,
    borderWidth: 1.5,
    padding: 12,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  info: { flex: 1, gap: 2 },
  accountName: { fontFamily: "DMSans_600SemiBold", fontSize: 14 },
  accountType: { fontFamily: "DMSans_400Regular", fontSize: 11 },
  balanceBox: { alignItems: "flex-end", gap: 4 },
  balance: { fontFamily: "DMSans_500Medium", fontSize: 13 },
  checkCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
});
