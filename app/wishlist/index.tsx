import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import { FlashList } from "@shopify/flash-list";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useAppState } from "@/src/context/AppStateProvider";
import { soundManager } from "@/src/services/SoundManager";
import { useWishlist } from "@/src/hooks/useWishlist";
import { WishlistListCard } from "@/src/components/wishlist/WishlistListCard";
import { CreateListModal } from "@/src/components/wishlist/CreateListModal";

export default function WishlistIndexScreen() {
  const { theme } = useAppState();
  const router = useRouter();
  const { lists, getItemsByList, createList } = useWishlist();
  const [showCreateModal, setShowCreateModal] = useState(false);

  const sortedLists = useMemo(
    () => [...lists].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [lists],
  );

  const handleCreate = (name: string) => {
    createList(name);
    setShowCreateModal(false);
  };

  return (
    <SafeAreaView
      style={[styles.safe, { backgroundColor: theme.background }]}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => { soundManager.play("tap"); router.back(); }}
          style={styles.backBtn}
          activeOpacity={0.7}
        >
          <Feather name="arrow-left" size={22} color={theme.textColor} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.textColor }]}>
          Lista de Desejos
        </Text>
        <TouchableOpacity
          style={[styles.addBtn, { backgroundColor: theme.primaryColor }]}
          onPress={() => { soundManager.play("pop"); setShowCreateModal(true); }}
          activeOpacity={0.7}
        >
          <Feather name="plus" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {sortedLists.length === 0 ? (
        <View style={styles.emptyState}>
          <View
            style={[
              styles.emptyIcon,
              { backgroundColor: theme.primaryColor + "15" },
            ]}
          >
            <Feather name="heart" size={36} color={theme.primaryColor} />
          </View>
          <Text style={[styles.emptyTitle, { color: theme.textColor }]}>
            Nenhuma lista ainda
          </Text>
          <Text style={[styles.emptyDesc, { color: theme.secondaryText }]}>
            Crie sua primeira lista de desejos para organizar produtos por
            prioridade e avaliar o que cabe no orçamento.
          </Text>
          <TouchableOpacity
            style={[styles.emptyBtn, { backgroundColor: theme.primaryColor }]}
            onPress={() => { soundManager.play("pop"); setShowCreateModal(true); }}
            activeOpacity={0.7}
          >
            <Feather name="plus" size={16} color="#fff" />
            <Text style={styles.emptyBtnText}>Criar primeira lista</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlashList
          data={sortedLists}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          estimatedItemSize={100}
          renderItem={({ item }) => (
            <WishlistListCard
              list={item}
              items={getItemsByList(item.id)}
              theme={theme}
              onPress={(list) => {
                soundManager.play("tap");
                router.push(`/wishlist/${list.id}` as any);
              }}
            />
          )}
          ListHeaderComponent={
            <View style={styles.listHeader}>
              <Text
                style={[styles.listHeaderText, { color: theme.secondaryText }]}
              >
                {sortedLists.length}{" "}
                {sortedLists.length === 1 ? "lista" : "listas"}
              </Text>
            </View>
          }
        />
      )}

      <CreateListModal
        visible={showCreateModal}
        theme={theme}
        onConfirm={handleCreate}
        onCancel={() => setShowCreateModal(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 10,
  },
  backBtn: { padding: 4 },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontFamily: "DMSans_700Bold",
  },
  addBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: "center",
    alignItems: "center",
  },
  listContent: { paddingBottom: 40 },
  listHeader: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 8,
  },
  listHeaderText: {
    fontSize: 12,
    fontFamily: "DMSans_500Medium",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
    gap: 14,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 20,
    fontFamily: "DMSans_700Bold",
    textAlign: "center",
  },
  emptyDesc: {
    fontSize: 14,
    fontFamily: "DMSans_400Regular",
    textAlign: "center",
    lineHeight: 20,
  },
  emptyBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    marginTop: 8,
  },
  emptyBtnText: {
    color: "#fff",
    fontSize: 15,
    fontFamily: "DMSans_600SemiBold",
  },
});
