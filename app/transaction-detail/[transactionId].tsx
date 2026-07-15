import React from "react";
import { View, ScrollView, Pressable, StyleSheet } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAppState } from "@/src/context/AppStateProvider";
import { soundManager } from "@/src/services/SoundManager";
import { TCard, TText } from "@/src/components/tamagui";
import { resolveEffectiveGroup } from "@packages/domain/src/transactions";
import { getCategoryDisplayName, getGroupColor, getGroupLabel } from "@/src/utils/categoryHelpers";

export default function TransactionDetailScreen() {
  const { transactionId } = useLocalSearchParams<{ transactionId: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { domain, theme } = useAppState();

  const transaction = domain.transactions[transactionId];

  const handleBack = () => {
    soundManager.play("tap");
    router.back();
  };

  if (!transaction) {
    return (
      <View style={[s.container, { backgroundColor: theme.background }]}>
        <View style={[s.header, { paddingTop: insets.top + 10 }]}>
          <Pressable onPress={handleBack}>
            <Feather name="arrow-left" size={24} color={theme.textColor} />
          </Pressable>
          <TText variant="subtitle" color={theme.textColor}>Detalhes</TText>
          <View style={{ width: 24 }} />
        </View>
        <View style={s.center}>
          <TText color={theme.textColor}>Transação não encontrada</TText>
        </View>
      </View>
    );
  }

  const hasItems = transaction.items && transaction.items.length > 0;

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

  return (
    <View style={[s.container, { backgroundColor: theme.background }]}>
      <View style={[s.header, { paddingTop: insets.top + 10 }]}>
        <Pressable onPress={handleBack}>
          <Feather name="arrow-left" size={24} color={theme.textColor} />
        </Pressable>
        <TText variant="subtitle" color={theme.textColor}>Detalhes</TText>
        <View style={{ width: 24 }} />
      </View>

      <TCard
        elevated
        backgroundColor={theme.cardBackground}
        borderColor={theme.border}
        marginHorizontal={20}
        marginBottom={20}
        alignItems="center"
        borderWidth={0}
      >
        <TText variant="subtitle" color={theme.textColor} marginBottom={4}>
          {transaction.description || "Transação"}
        </TText>
        <TText variant="caption" secondary marginBottom={12}>
          {new Date(transaction.date).toLocaleDateString("pt-BR", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </TText>
        <TText variant="title" color={theme.primaryColor} fontSize={32}>
          {formatCurrency(transaction.amount)}
        </TText>
      </TCard>

      <ScrollView style={s.scrollView} contentContainerStyle={s.scrollContent}>
        {hasItems ? (
          <>
            <TText variant="subtitle" color={theme.textColor} marginBottom={8}>
              Itens ({transaction.items!.length})
            </TText>
            {transaction.items!.map((item, index) => {
              const category = domain.categories[item.categoryId];
              // Fallback para categorias constantes da importação de notas
              const categoryName = category?.name ?? getCategoryDisplayName(item.categoryId, item.subcategoryId);
              const itemGroup = resolveEffectiveGroup(item.categoryId, domain.categories, item.groupOverride);
              return (
                <TCard
                  key={index}
                  compact
                  backgroundColor={theme.cardBackground}
                  borderColor={theme.border}
                  flexDirection="row"
                  alignItems="center"
                  justifyContent="space-between"
                  borderWidth={0}
                  padding={14}
                  borderRadius={12}
                >
                  <View style={s.itemLeft}>
                    <View style={[s.itemIcon, { backgroundColor: `${theme.primaryColor}15` }]}>
                      <Feather name="shopping-bag" size={18} color={theme.primaryColor} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <TText variant="label" color={theme.textColor} marginBottom={2}>
                        {item.description}
                      </TText>
                      <TText variant="caption" secondary>
                        {categoryName}
                        {"  •  "}
                        <TText variant="caption" color={getGroupColor(itemGroup)}>
                          {getGroupLabel(itemGroup)}
                        </TText>
                      </TText>
                    </View>
                  </View>
                  <TText variant="body" bold color={theme.textColor} fontSize={15}>
                    {formatCurrency(item.amount)}
                  </TText>
                </TCard>
              );
            })}
          </>
        ) : (
          <View style={s.emptyState}>
            <Feather name="inbox" size={32} color={theme.secondaryText} />
            <TText variant="body" secondary textAlign="center" maxWidth={200}>
              Esta transação não possui itens individualizados
            </TText>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 15,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  scrollView: { flex: 1 },
  scrollContent: { padding: 20, gap: 12 },
  itemLeft: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  itemIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 40,
    gap: 12,
  },
});
