import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  ActivityIndicator,
  ScrollView,
  Animated,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAppState } from "@/src/context/AppStateProvider";
import { useWishlist } from "@/src/hooks/useWishlist";
import { wishlistScraperService } from "@packages/wishlist";

interface Props {
  visible: boolean;
  url: string;
  onClose: () => void;
}

/**
 * Modal acionado quando o usuário compartilha um produto (Amazon/ML) com o app.
 * Raspa os dados automaticamente e deixa o usuário escolher em qual lista adicionar.
 */
export function ShareToWishlistModal({ visible, url, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const { theme } = useAppState();
  const { lists, addItem } = useWishlist();

  const [scraped, setScraped] = useState<Awaited<ReturnType<typeof wishlistScraperService.scrape>> | null>(null);
  const [scraping, setScraping] = useState(false);
  const [selectedListId, setSelectedListId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);

  const slideAnim = React.useRef(new Animated.Value(500)).current;
  const fadeAnim = React.useRef(new Animated.Value(0)).current;

  // Anima entrada ao abrir
  useEffect(() => {
    if (visible) {
      setAdded(false);
      setAdding(false);
      setScraped(null);
      setSelectedListId(lists[0]?.id ?? null);

      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.spring(slideAnim, { toValue: 0, damping: 22, stiffness: 260, useNativeDriver: true }),
      ]).start();

      // Raspa o produto automaticamente
      if (url) {
        setScraping(true);
        wishlistScraperService
          .scrape(url)
          .then((data) => setScraped(data))
          .catch(() => {})
          .finally(() => setScraping(false));
      }
    } else {
      slideAnim.setValue(500);
      fadeAnim.setValue(0);
    }
  }, [visible, url]);

  // Seleciona a primeira lista disponível automaticamente
  useEffect(() => {
    if (visible && !selectedListId && lists.length > 0) {
      setSelectedListId(lists[0].id);
    }
  }, [visible, lists, selectedListId]);

  const animateClose = useCallback(
    (callback: () => void) => {
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 0, duration: 160, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 500, duration: 180, useNativeDriver: true }),
      ]).start(() => {
        callback();
      });
    },
    [fadeAnim, slideAnim],
  );

  const handleAdd = useCallback(() => {
    if (!selectedListId) return;
    setAdding(true);

    const productName =
      scraped?.name ?? url.replace(/^https?:\/\//, "").split("/")[0];

    addItem({
      listId: selectedListId,
      name: productName ?? "Produto",
      urgencyLevel: "PLANNED",
      orderIndex: -1,
      price: scraped?.price,
      originalUrl: url,
      affiliateUrl: scraped?.affiliateUrl,
      category: scraped?.category,
      ean: scraped?.ean,
      ncm: scraped?.ncm,
      canBuyThisMonth: false,
    });

    setAdded(true);
    setTimeout(() => animateClose(onClose), 900);
  }, [selectedListId, scraped, url, addItem, animateClose, onClose]);

  const handleClose = useCallback(() => {
    animateClose(onClose);
  }, [animateClose, onClose]);

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={handleClose}>
      <View style={styles.container}>
        <Animated.View
          style={[
            styles.backdrop,
            { opacity: fadeAnim },
          ]}
        >
          <TouchableWithoutFeedback onPress={handleClose}>
            <View style={styles.flex} />
          </TouchableWithoutFeedback>
        </Animated.View>

        <Animated.View
          style={[
            styles.card,
            {
              backgroundColor: theme.background,
              transform: [{ translateY: slideAnim }],
              paddingBottom: Math.max(insets.bottom, 20),
            },
          ]}
        >
          {/* Cabeçalho */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={[styles.appIcon, { backgroundColor: theme.primaryColor + "20" }]}>
                <Feather name="heart" size={18} color={theme.primaryColor} />
              </View>
              <View>
                <Text style={[styles.headerTitle, { color: theme.textColor }]}>
                  Adicionar à Lista
                </Text>
                <Text style={[styles.headerSub, { color: theme.secondaryText }]}>
                  DOMUS
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={handleClose} activeOpacity={0.7}>
              <Feather name="x" size={22} color={theme.secondaryText} />
            </TouchableOpacity>
          </View>

          {/* Card do produto */}
          <View style={[styles.productCard, { backgroundColor: theme.cardBackground }]}>
            {scraping ? (
              <View style={styles.productLoading}>
                <ActivityIndicator size="small" color={theme.primaryColor} />
                <Text style={[styles.loadingText, { color: theme.secondaryText }]}>
                  Carregando produto...
                </Text>
              </View>
            ) : (
              <View style={styles.productInfo}>
                <View style={styles.productTextBlock}>
                  <Text
                    style={[styles.productName, { color: theme.textColor }]}
                    numberOfLines={2}
                  >
                    {scraped?.name ?? url.split("/").filter(Boolean).pop() ?? "Produto"}
                  </Text>
                  {scraped?.price !== undefined && (
                    <Text style={[styles.productPrice, { color: theme.primaryColor }]}>
                      R${" "}
                      {scraped.price.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </Text>
                  )}
                  {scraped?.category && (
                    <Text style={[styles.productCategory, { color: theme.secondaryText }]}>
                      {scraped.category}
                    </Text>
                  )}
                </View>
                <View
                  style={[
                    styles.sourceTag,
                    {
                      backgroundColor: url.includes("amazon")
                        ? "#FF990020"
                        : "#FFE60020",
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.sourceTagText,
                      {
                        color: url.includes("amazon") ? "#FF9900" : "#F5A623",
                      },
                    ]}
                  >
                    {url.includes("amazon") ? "Amazon" : "Mercado Livre"}
                  </Text>
                </View>
              </View>
            )}
          </View>

          {/* Seletor de lista */}
          <Text style={[styles.label, { color: theme.secondaryText }]}>
            Escolha a lista
          </Text>

          {lists.length === 0 ? (
            <View style={[styles.emptyLists, { borderColor: theme.cardBackground }]}>
              <Feather name="inbox" size={20} color={theme.secondaryText} />
              <Text style={[styles.emptyListsText, { color: theme.secondaryText }]}>
                Nenhuma lista criada. Abra o app e crie uma lista primeiro.
              </Text>
            </View>
          ) : (
            <ScrollView
              style={styles.listPicker}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {lists.map((list) => {
                const selected = selectedListId === list.id;
                return (
                  <TouchableOpacity
                    key={list.id}
                    style={[
                      styles.listOption,
                      {
                        backgroundColor: selected
                          ? theme.primaryColor + "15"
                          : theme.cardBackground,
                        borderColor: selected
                          ? theme.primaryColor
                          : "transparent",
                      },
                    ]}
                    onPress={() => setSelectedListId(list.id)}
                    activeOpacity={0.7}
                  >
                    <Feather
                      name={selected ? "check-circle" : "circle"}
                      size={18}
                      color={selected ? theme.primaryColor : theme.secondaryText}
                    />
                    <Text
                      style={[
                        styles.listOptionText,
                        {
                          color: selected ? theme.primaryColor : theme.textColor,
                          fontFamily: selected
                            ? "DMSans_700Bold"
                            : "DMSans_400Regular",
                        },
                      ]}
                      numberOfLines={1}
                    >
                      {list.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}

          {/* Botões */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.btn, { borderColor: theme.cardBackground }]}
              onPress={handleClose}
              activeOpacity={0.7}
            >
              <Text style={[styles.btnText, { color: theme.secondaryText }]}>
                Cancelar
              </Text>
            </TouchableOpacity>

            {lists.length > 0 && !added && (
              <TouchableOpacity
                style={[
                  styles.btn,
                  styles.btnPrimary,
                  { backgroundColor: theme.primaryColor },
                  (!selectedListId || adding) && styles.btnDisabled,
                ]}
                onPress={handleAdd}
                disabled={!selectedListId || adding}
                activeOpacity={0.7}
              >
                {adding ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Feather name="plus" size={16} color="#fff" />
                    <Text style={styles.btnTextPrimary}>Adicionar</Text>
                  </>
                )}
              </TouchableOpacity>
            )}

            {added && (
              <View
                style={[styles.btn, styles.btnPrimary, { backgroundColor: "#16A34A" }]}
              >
                <Feather name="check" size={16} color="#fff" />
                <Text style={styles.btnTextPrimary}>Adicionado!</Text>
              </View>
            )}
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.55)",
  },
  container: {
    flex: 1,
    justifyContent: "flex-end",
  },
  flex: { flex: 1 },
  card: {
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 24,
    maxHeight: "85%",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  appIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 17,
    fontFamily: "DMSans_700Bold",
  },
  headerSub: {
    fontSize: 11,
    fontFamily: "DMSans_400Regular",
    marginTop: 1,
  },
  productCard: {
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  productLoading: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 4,
  },
  loadingText: {
    fontSize: 13,
    fontFamily: "DMSans_400Regular",
  },
  productInfo: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 8,
  },
  productTextBlock: {
    flex: 1,
    gap: 3,
  },
  productName: {
    fontSize: 14,
    fontFamily: "DMSans_600SemiBold",
    lineHeight: 19,
  },
  productPrice: {
    fontSize: 15,
    fontFamily: "DMSans_700Bold",
  },
  productCategory: {
    fontSize: 11,
    fontFamily: "DMSans_400Regular",
  },
  sourceTag: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignSelf: "flex-start",
  },
  sourceTagText: {
    fontSize: 11,
    fontFamily: "DMSans_700Bold",
  },
  label: {
    fontSize: 11,
    fontFamily: "DMSans_500Medium",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  emptyLists: {
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    gap: 8,
    marginBottom: 16,
  },
  emptyListsText: {
    fontSize: 13,
    fontFamily: "DMSans_400Regular",
    textAlign: "center",
  },
  listPicker: {
    maxHeight: 200,
    marginBottom: 16,
  },
  listOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 6,
  },
  listOptionText: {
    fontSize: 14,
    flex: 1,
  },
  actions: {
    flexDirection: "row",
    gap: 10,
  },
  btn: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    borderWidth: 1.5,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  btnPrimary: { borderWidth: 0 },
  btnDisabled: { opacity: 0.5 },
  btnText: {
    fontSize: 14,
    fontFamily: "DMSans_600SemiBold",
  },
  btnTextPrimary: {
    fontSize: 14,
    fontFamily: "DMSans_600SemiBold",
    color: "#fff",
  },
});
