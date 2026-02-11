import React from "react";
import { StyleSheet, View, Text, Pressable, ScrollView, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { BalanceCard } from "@/src/components/BalanceCard";
import { BudgetChart } from "@/src/components/BudgetChart";
import { colors, spacing } from "@/src/theme";

const MOCK_BALANCE = 12450.75;

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const webTopInset = Platform.OS === "web" ? 67 : 0;
  const webBottomInset = Platform.OS === "web" ? 34 : 0;

  const handleAddPress = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  };

  return (
    <View style={styles.root}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: insets.top + webTopInset + spacing.md,
            paddingBottom: insets.bottom + webBottomInset + 100,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Ola!</Text>
            <Text style={styles.subtitle}>Seu resumo financeiro</Text>
          </View>
          <Pressable
            style={({ pressed }) => [
              styles.notificationButton,
              pressed && styles.pressed,
            ]}
          >
            <Feather name="bell" size={22} color={colors.text.primary} />
          </Pressable>
        </View>

        <View style={styles.section}>
          <BalanceCard balance={MOCK_BALANCE} />
        </View>

        <View style={styles.section}>
          <BudgetChart />
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Ultimas transacoes</Text>
            <Pressable>
              <Text style={styles.seeAll}>Ver todas</Text>
            </Pressable>
          </View>
          <View style={styles.emptyState}>
            <Feather name="inbox" size={32} color={colors.text.tertiary} />
            <Text style={styles.emptyText}>Nenhuma transacao ainda</Text>
            <Text style={styles.emptySubtext}>
              Toque no botao + para adicionar
            </Text>
          </View>
        </View>
      </ScrollView>

      <Pressable
        style={({ pressed }) => [
          styles.fab,
          { bottom: insets.bottom + webBottomInset + 80 },
          pressed && styles.fabPressed,
        ]}
        onPress={handleAddPress}
      >
        <Feather name="plus" size={28} color="#FFFFFF" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    gap: spacing.md,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  greeting: {
    fontFamily: "DMSans_700Bold",
    fontSize: 28,
    color: colors.text.primary,
  },
  subtitle: {
    fontFamily: "DMSans_400Regular",
    fontSize: 14,
    color: colors.text.secondary,
    marginTop: 2,
  },
  notificationButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surface,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 2,
  },
  pressed: {
    opacity: 0.7,
  },
  section: {
    marginTop: spacing.sm,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontFamily: "DMSans_600SemiBold",
    fontSize: 16,
    color: colors.text.primary,
  },
  seeAll: {
    fontFamily: "DMSans_500Medium",
    fontSize: 13,
    color: colors.primary,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: spacing.xl,
    marginHorizontal: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: 20,
    gap: 8,
  },
  emptyText: {
    fontFamily: "DMSans_500Medium",
    fontSize: 15,
    color: colors.text.secondary,
  },
  emptySubtext: {
    fontFamily: "DMSans_400Regular",
    fontSize: 13,
    color: colors.text.tertiary,
  },
  fab: {
    position: "absolute",
    right: spacing.lg,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.primary,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  fabPressed: {
    transform: [{ scale: 0.92 }],
    opacity: 0.9,
  },
});
