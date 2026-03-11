import { useState, useCallback, useRef, useEffect } from "react";
import { Animated, Platform } from "react-native";
import { wishlistScraperService, AFFILIATE_CONFIG } from "@packages/wishlist";
import type { UrgencyLevel, WishlistItem, SavingsGoalConfig, BundleItem } from "@packages/wishlist";

export interface WishlistFormState {
  name: string;
  urgencyLevel: UrgencyLevel;
  price: string;
  url: string;
  category: string;
  ean: string;
  ncm: string;
  affiliateUrl: string;
  imageUrl: string;
}

const INITIAL_FORM: WishlistFormState = {
  name: "",
  urgencyLevel: "PLANNED",
  price: "",
  url: "",
  category: "",
  ean: "",
  ncm: "",
  affiliateUrl: "",
  imageUrl: "",
};

function applyAmazonAffiliate(url: string): string {
  if (!url.trim()) return url;
  try {
    const parsed = new URL(url.trim());
    if (
      parsed.hostname.includes("amazon.com.br") ||
      parsed.hostname.includes("amazon.com") ||
      parsed.hostname.includes("amzn.to")
    ) {
      parsed.searchParams.set("tag", AFFILIATE_CONFIG.amazon.tag);
      parsed.searchParams.set("linkCode", AFFILIATE_CONFIG.amazon.linkCode);
      return parsed.toString();
    }
  } catch {
    // not a valid URL
  }
  return url;
}

interface UseAddWishlistItemParams {
  visible: boolean;
  listId: string;
  editItem?: WishlistItem;
  onConfirm: (item: Omit<WishlistItem, "id">) => void;
  onCancel: () => void;
}

export function useAddWishlistItem({
  visible,
  listId,
  editItem,
  onConfirm,
  onCancel,
}: UseAddWishlistItemParams) {
  const [form, setForm] = useState<WishlistFormState>(INITIAL_FORM);
  const [savingsGoal, setSavingsGoal] = useState<SavingsGoalConfig>({ enabled: false });
  const [scraping, setScraping] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [searchModalVisible, setSearchModalVisible] = useState(false);
  const [webView, setWebView] = useState<{
    visible: boolean;
    url: string;
    /** Se definido, o produto selecionado preenche este índice do bundle */
    bundleIndex?: number;
  }>({ visible: false, url: "" });

  // Bundle / Kit
  const [bundleItems, setBundleItems] = useState<BundleItem[]>([]);
  const [isBundleMode, setIsBundleMode] = useState(false);

  const slideAnim = useRef(new Animated.Value(600)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
        Animated.spring(slideAnim, {
          toValue: 0,
          damping: 25,
          stiffness: 280,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const animateClose = useCallback(
    (callback: () => void) => {
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 600, duration: 250, useNativeDriver: true }),
      ]).start(() => {
        callback();
        slideAnim.setValue(600);
        fadeAnim.setValue(0);
      });
    },
    [fadeAnim, slideAnim],
  );

  useEffect(() => {
    if (visible && editItem) {
      setForm({
        name: editItem.name,
        urgencyLevel: editItem.urgencyLevel,
        price: editItem.price !== undefined ? editItem.price.toFixed(2).replace(".", ",") : "",
        url: editItem.originalUrl ?? "",
        category: editItem.category ?? "",
        ean: editItem.ean ?? "",
        ncm: editItem.ncm ?? "",
        affiliateUrl: editItem.affiliateUrl ?? "",
        imageUrl: editItem.imageUrl ?? "",
      });
      if (editItem.savingsGoal) {
        setSavingsGoal(editItem.savingsGoal);
      }
    }
  }, [visible, editItem]);

  const isValid = form.name.trim().length >= 2;
  const hasUrl = form.url.trim().length > 0;

  const handleUrlBlur = useCallback(() => {
    const affiliated = applyAmazonAffiliate(form.url);
    if (affiliated !== form.url) {
      setForm((p) => ({ ...p, url: affiliated }));
    }
  }, [form.url]);

  const applyScrapeData = useCallback(
    (data: any, url?: string) => {
      setForm((prev) => ({
        ...prev,
        ...(url !== undefined ? { url } : {}),
        name: data.name ?? prev.name,
        price: data.price !== undefined ? data.price.toFixed(2).replace(".", ",") : prev.price,
        ean: data.ean ?? prev.ean,
        ncm: data.ncm ?? prev.ncm,
        category: data.category ?? prev.category,
        affiliateUrl: data.affiliateUrl ?? prev.affiliateUrl,
        imageUrl: data.imageUrl ?? prev.imageUrl,
      }));
    },
    [],
  );

  const handleScrapeUrl = useCallback(async () => {
    if (!form.url.trim()) return;
    if (Platform.OS === "web") {
      // CORS impede scraping no web — apenas aplica URL de afiliado
      const data = { affiliateUrl: wishlistScraperService.buildAffiliateUrl(form.url.trim()) };
      if (data.affiliateUrl) applyScrapeData(data);
      return;
    }
    setScraping(true);
    try {
      const data = await wishlistScraperService.scrape(form.url.trim());
      applyScrapeData(data);
    } finally {
      setScraping(false);
    }
  }, [form.url, applyScrapeData]);

  const openSearchWebView = useCallback((storeUrl: string, bundleIndex?: number) => {
    if (Platform.OS === "web") {
      window.open(storeUrl, "_blank", "noopener,noreferrer");
      return;
    }
    setWebView({ visible: true, url: storeUrl, bundleIndex });
  }, []);

  // ─── Bundle helpers ──────────────────────────────────────────────────────────
  const addBundleItem = useCallback(() => {
    setBundleItems((prev) => [
      ...prev,
      { id: Date.now().toString(), name: "", purchased: false },
    ]);
  }, []);

  const updateBundleItem = useCallback((index: number, changes: Partial<BundleItem>) => {
    setBundleItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, ...changes } : item)),
    );
  }, []);

  const removeBundleItem = useCallback((index: number) => {
    setBundleItems((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleSearchOrImport = useCallback(() => {
    if (hasUrl) {
      handleScrapeUrl();
      return;
    }
    setSearchModalVisible(true);
  }, [hasUrl, handleScrapeUrl]);

  const handleConfirm = useCallback(() => {
    if (!isValid) return;
    let priceVal = parseFloat(form.price.replace(",", "."));

    // Se bundle e sem preço manual, calcula soma das peças
    if (isBundleMode && isNaN(priceVal) && bundleItems.length > 0) {
      const sum = bundleItems.reduce((acc, b) => acc + (b.price ?? 0), 0);
      if (sum > 0) priceVal = sum;
    }

    const item = {
      listId,
      name: form.name.trim(),
      urgencyLevel: form.urgencyLevel,
      orderIndex: -1,
      price: isNaN(priceVal) ? undefined : priceVal,
      originalUrl: form.url.trim() || undefined,
      affiliateUrl: form.affiliateUrl.trim() || undefined,
      category: form.category.trim() || undefined,
      ean: form.ean.trim() || undefined,
      ncm: form.ncm.trim() || undefined,
      imageUrl: form.imageUrl.trim() || undefined,
      canBuyThisMonth: false,
      savingsGoal: savingsGoal.enabled ? savingsGoal : undefined,
      bundleItems: isBundleMode && bundleItems.length > 0 ? bundleItems : undefined,
    };
    animateClose(() => {
      onConfirm(item);
      setForm(INITIAL_FORM);
      setSavingsGoal({ enabled: false });
      setShowAdvanced(false);
      setBundleItems([]);
      setIsBundleMode(false);
    });
  }, [isValid, form, savingsGoal, listId, isBundleMode, bundleItems, animateClose, onConfirm]);

  const handleCancel = useCallback(() => {
    animateClose(() => {
      setForm(INITIAL_FORM);
      setSavingsGoal({ enabled: false });
      setShowAdvanced(false);
      setBundleItems([]);
      setIsBundleMode(false);
      onCancel();
    });
  }, [animateClose, onCancel]);

  const handleProductSelected = useCallback(
    async (url: string) => {
      const { bundleIndex } = webView;
      setWebView({ visible: false, url: "" });

      if (bundleIndex !== undefined) {
        // Produto vai para um item do bundle
        setScraping(true);
        try {
          const data = await wishlistScraperService.scrape(url);
          updateBundleItem(bundleIndex, {
            originalUrl: url,
            affiliateUrl: data.affiliateUrl ?? url,
            name: data.name ?? bundleItems[bundleIndex]?.name ?? "",
            price: data.price,
            imageUrl: data.imageUrl,
            storeId: wishlistScraperService.isAmazonUrl(url) ? "amazon"
              : wishlistScraperService.isMercadoLivreUrl(url) ? "mercadolivre"
              : undefined,
          });
        } finally {
          setScraping(false);
        }
        return;
      }

      // Produto vai para o item principal
      setForm((p) => ({ ...p, url }));
      setScraping(true);
      try {
        const data = await wishlistScraperService.scrape(url);
        applyScrapeData(data, url);
      } finally {
        setScraping(false);
      }
    },
    [webView, applyScrapeData, updateBundleItem, bundleItems],
  );

  const updateField = useCallback(<K extends keyof WishlistFormState>(key: K, value: WishlistFormState[K]) => {
    setForm((p) => ({ ...p, [key]: value }));
  }, []);

  const clearUrl = useCallback(() => {
    setForm((p) => ({ ...p, url: "" }));
  }, []);

  return {
    form,
    updateField,
    clearUrl,
    savingsGoal,
    setSavingsGoal,
    scraping,
    showAdvanced,
    setShowAdvanced,
    searchModalVisible,
    setSearchModalVisible,
    webView,
    setWebView,
    slideAnim,
    fadeAnim,
    isValid,
    hasUrl,
    handleUrlBlur,
    handleScrapeUrl,
    openSearchWebView,
    handleSearchOrImport,
    handleConfirm,
    handleCancel,
    handleProductSelected,
    // Bundle
    isBundleMode,
    setIsBundleMode,
    bundleItems,
    addBundleItem,
    updateBundleItem,
    removeBundleItem,
  };
}
