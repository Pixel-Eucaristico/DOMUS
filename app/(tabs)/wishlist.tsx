import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { Platform, Pressable } from "react-native";
import { useAppState } from "@/src/context/AppStateProvider";
import { soundManager } from "@/src/services/SoundManager";
import { useWishlist } from "@/src/hooks/useWishlist";
import { WishlistListCard } from "@/src/components/wishlist/WishlistListCard";
import { CreateListModal } from "@/src/components/wishlist/CreateListModal";
import { TourGuideZone } from "rn-tourguide";
import { TourPageHost } from "@/src/components/tour/TourPageHost";


export default function WishlistTab() {
  const { theme } = useAppState();
  const router = useRouter();
  const { lists, getItemsByList, createList } = useWishlist();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const insets = useSafeAreaInsets();
  const webBottomInset = Platform.OS === "web" ? 34 : 0;

  const sortedLists = useMemo(
    () => [...lists].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [lists],
  );

  const handleCreate = (name: string) => {
    createList(name);
    setShowCreateModal(false);
  };

  return (
    <TourPageHost groupId={3}>
    <SafeAreaView
      style={[styles.safe, { backgroundColor: theme.background }]}
    >
      <TourGuideZone zone={1} text="8" isTourGuide borderRadius={8}>
      <View collapsable={false}>
        <Text style={[styles.title, { color: theme.textColor }]}>
          Lista de Desejos
        </Text>
      </View>
      </TourGuideZone>

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
            Crie listas para organizar seus desejos por urgência, acompanhe
            preços e avalie o que cabe no seu orçamento.
          </Text>
          <TouchableOpacity
            style={[styles.emptyBtn, { backgroundColor: theme.primaryColor }]}
            onPress={() => {
              soundManager.play("pop");
              setShowCreateModal(true);
            }}
            activeOpacity={0.7}
          >
            <Feather name="plus" size={16} color="#fff" />
            <Text style={styles.emptyBtnText}>Criar primeira lista</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={sortedLists}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <WishlistListCard
              list={item}
              items={getItemsByList(item.id)}
              theme={theme}
              onPress={(list) =>
                router.push(`/wishlist/${list.id}` as any)
              }
            />
          )}
          ListHeaderComponent={
            <View style={styles.listHeader}>
              <Text
                style={[
                  styles.listHeaderText,
                  { color: theme.secondaryText },
                ]}
              >
                {sortedLists.length}{" "}
                {sortedLists.length === 1 ? "lista" : "listas"}
              </Text>
            </View>
          }
        />
      )}

      {/* ── FAB ──────────────────────────────────────────────────────────── */}
      <View
        style={[
          {
            position: "absolute",
            right: 24,
            bottom: insets.bottom + webBottomInset + 80,
            alignItems: "flex-end",
          },
          { zIndex: 1 },
        ]}
      >
        <TourGuideZone zone={2} text="9" isTourGuide borderRadius={40}>
        <Pressable
          collapsable={false}
          style={({ pressed }) => [
            styles.fab,
            { backgroundColor: theme.primaryColor },
            pressed && { opacity: 0.8, transform: [{ scale: 0.95 }] },
          ]}
          onPress={() => {
            soundManager.play("pop");
            setShowCreateModal(true);
          }}
        >
          <Feather name="plus" size={28} color="#FFFFFF" />
        </Pressable>
        </TourGuideZone>
      </View>

      <CreateListModal
        visible={showCreateModal}
        theme={theme}
        onConfirm={handleCreate}
        onCancel={() => setShowCreateModal(false)}
      />
    </SafeAreaView>
    </TourPageHost>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  title: {
    fontSize: 22,
    fontFamily: "DMSans_700Bold",
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 8,
  },
  fab: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
    position: "relative",
    marginTop: 12,
  },
  listContent: { paddingBottom: 100 },
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
