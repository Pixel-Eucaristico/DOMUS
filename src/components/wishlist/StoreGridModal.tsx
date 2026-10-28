import React, { useState, useMemo, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  Image,
  Dimensions,
} from "react-native";
import { FlashList } from "@shopify/flash-list";
import { Feather } from "@expo/vector-icons";
import type { ThemeColors } from "@packages/theme";
import { ScraperRegistry } from "@packages/wishlist/src/scrapers/ScraperRegistry";
import type { IScraperStrategy } from "@packages/wishlist/src/scrapers/IScraperStrategy";
import { soundManager } from "@/src/services/SoundManager";
import { useExternalLookups } from "@/src/hooks/useExternalLookups";
import { resolveStoreIconUrl } from "./storeIcon";
import { KeyboardListSheet } from "@/src/components/shared/KeyboardListSheet";
import { useSheetBackdropPress } from "@/src/components/shared/KeyboardSheet";

const NUM_COLS = 5;
const SCREEN_W = Dimensions.get("window").width;
const H_PAD = 16 * 2; // paddingHorizontal do sheet
const CARD_MARGIN = 4 * 2; // margin de cada lado
const CARD_SIZE = Math.floor((SCREEN_W - H_PAD - CARD_MARGIN * NUM_COLS) / NUM_COLS);

interface StoreIconProps {
  store: IScraperStrategy;
  remoteEnabled: boolean;
  color: string;
}

/** Favicon da loja com a flag ligada; ícone genérico sem flag ou se a imagem falhar. */
function StoreIcon({ store, remoteEnabled, color }: StoreIconProps) {
  const [failed, setFailed] = useState(false);
  const uri = resolveStoreIconUrl(store.id, store.baseUrls, remoteEnabled, failed);

  if (!uri) {
    return <Feather name="shopping-bag" size={Math.round(CARD_SIZE * 0.4)} color={color} />;
  }

  return (
    <Image
      source={{ uri }}
      style={styles.iconImage}
      resizeMode="contain"
      onError={() => setFailed(true)}
    />
  );
}

// Cores de fundo para cada loja (estilo card Android)
const STORE_BG: Record<string, string> = {
  amazon: "#FF9900",
  mercadolivre: "#FFE600",
};

interface Props {
  visible: boolean;
  theme: ThemeColors;
  /** Termo de busca pré-preenchido — usado para montar a URL de pesquisa da loja */
  searchQuery?: string;
  onSelectStore: (searchUrl: string) => void;
  onCancel: () => void;
}

export function StoreGridModal({ visible, theme, searchQuery = "", onSelectStore, onCancel }: Props) {
  const [query, setQuery] = useState("");
  const { enabled: externalLookupsEnabled } = useExternalLookups();

  const allStores = ScraperRegistry.getAll();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return allStores;
    return allStores.filter((s) => s.name.toLowerCase().includes(q));
  }, [query, allStores]);

  const handleCancel = useCallback(() => {
    setQuery("");
    onCancel();
  }, [onCancel]);
  // Com o teclado aberto, o 1º toque no fundo só fecha o teclado (Story 13.4).
  const onBackdrop = useSheetBackdropPress(handleCancel);

  function handleSelect(store: IScraperStrategy) {
    soundManager.play("pop");
    setQuery("");
    // Usa o nome do produto para montar URL de busca direta na loja
    onSelectStore(store.buildSearchUrl(searchQuery));
  }

  function renderItem({ item }: { item: IScraperStrategy }) {
    const bg = STORE_BG[item.id] ?? theme.primaryColor + "22";

    return (
      <TouchableOpacity
        style={styles.storeCell}
        onPress={() => handleSelect(item)}
        activeOpacity={0.75}
      >
        <View style={[styles.iconSquare, { backgroundColor: bg }]}>
          <StoreIcon
            key={item.id}
            store={item}
            remoteEnabled={externalLookupsEnabled}
            color={theme.textColor}
          />
          {item.isSponsored && (
            <View style={styles.sponsoredBadge}>
              <Feather name="heart" size={7} color="#fff" />
            </View>
          )}
        </View>
        <Text style={[styles.storeName, { color: theme.textColor }]} numberOfLines={1}>
          {item.name}
        </Text>
      </TouchableOpacity>
    );
  }

  const searchBar = (
    <View style={[styles.searchBar, { backgroundColor: theme.cardBackground }]}>
      <Feather name="search" size={15} color={theme.secondaryText} />
      <TextInput
        style={[styles.searchInput, { color: theme.textColor }]}
        placeholder="Buscar loja..."
        placeholderTextColor={theme.secondaryText}
        value={query}
        onChangeText={setQuery}
        autoCorrect={false}
        autoCapitalize="none"
      />
      {query.length > 0 && (
        <TouchableOpacity onPress={() => setQuery("")}>
          <Feather name="x-circle" size={15} color={theme.secondaryText} />
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleCancel}
    >
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} onPress={onBackdrop} activeOpacity={1} />

        <KeyboardListSheet
          sheetStyle={[styles.sheet, { backgroundColor: theme.background }]}
          maxHeightRatio={0.75}
          basePaddingBottom={20}
          header={
            <>
              {/* Handle */}
              <View style={[styles.handle, { backgroundColor: theme.secondaryText + "40" }]} />

              {/* Header */}
              <View style={styles.headerRow}>
                <Text style={[styles.title, { color: theme.textColor }]}>Escolher loja</Text>
                <TouchableOpacity onPress={() => { soundManager.play("tap"); handleCancel(); }}>
                  <Feather name="x" size={20} color={theme.secondaryText} />
                </TouchableOpacity>
              </View>

              {/* Barra de busca */}
              {searchBar}
            </>
          }
          compactHeader={searchBar}
          list={
            // Grade de lojas; o aviso vai no rodapé da lista para rolar junto.
            <FlashList
              data={filtered}
              keyExtractor={(s) => s.id}
              renderItem={renderItem}
              extraData={externalLookupsEnabled}
              numColumns={5}
              contentContainerStyle={styles.grid}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              ListEmptyComponent={
                <Text style={[styles.empty, { color: theme.secondaryText }]}>
                  Nenhuma loja encontrada.
                </Text>
              }
              ListFooterComponent={
                <Text style={[styles.hint, { color: theme.secondaryText }]}>
                  Mais lojas serão adicionadas em breve.
                </Text>
              }
            />
          }
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1 },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.45)" },
  sheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  handle: { width: 40, height: 4, borderRadius: 2, alignSelf: "center", marginBottom: 16 },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  title: { fontSize: 17, fontFamily: "DMSans_700Bold" },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
    marginBottom: 12,
  },
  searchInput: { flex: 1, fontSize: 14, fontFamily: "DMSans_400Regular" },
  grid: { paddingBottom: 8 },
  storeCell: {
    width: CARD_SIZE,
    margin: 4,
    alignItems: "center",
    gap: 4,
  },
  iconSquare: {
    width: CARD_SIZE,
    height: CARD_SIZE,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  iconImage: { width: CARD_SIZE * 0.72, height: CARD_SIZE * 0.72 },
  storeName: { fontSize: 9, fontFamily: "DMSans_600SemiBold", textAlign: "center", width: CARD_SIZE },
  sponsoredBadge: {
    position: "absolute",
    bottom: 4,
    right: 4,
    backgroundColor: "#16A34A",
    borderRadius: 20,
    padding: 3,
  },
  sponsoredText: { fontSize: 9, fontFamily: "DMSans_600SemiBold", color: "#fff" },
  empty: { textAlign: "center", marginTop: 24, fontSize: 13, fontFamily: "DMSans_400Regular" },
  hint: { fontSize: 11, fontFamily: "DMSans_400Regular", textAlign: "center", marginTop: 12, paddingBottom: 4 },
});
