import { useState, useCallback, useRef, useEffect } from "react";
import { Animated, Platform } from "react-native";
import { wishlistScraperService, AFFILIATE_CONFIG } from "@packages/wishlist";
import type { UrgencyLevel, WishlistItem, SavingsGoalConfig } from "@packages/wishlist";

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
  const [webView, setWebView] = useState<{ visible: boolean; url: string }>({
    visible: false,
    url: "",
  });

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

  const openSearchWebView = useCallback((platform: "amazon" | "ml") => {
    if (Platform.OS === "web") {
      const url =
        platform === "amazon" ? "https://www.amazon.com.br" : "https://www.mercadolivre.com.br";
      window.open(url, "_blank", "noopener,noreferrer");
      return;
    }
    const url =
      platform === "amazon" ? "https://www.amazon.com.br" : "https://www.mercadolivre.com.br";
    setWebView({ visible: true, url });
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
    const priceVal = parseFloat(form.price.replace(",", "."));
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
    };
    animateClose(() => {
      onConfirm(item);
      setForm(INITIAL_FORM);
      setSavingsGoal({ enabled: false });
      setShowAdvanced(false);
    });
  }, [isValid, form, savingsGoal, listId, animateClose, onConfirm]);

  const handleCancel = useCallback(() => {
    animateClose(() => {
      setForm(INITIAL_FORM);
      setSavingsGoal({ enabled: false });
      setShowAdvanced(false);
      onCancel();
    });
  }, [animateClose, onCancel]);

  const handleProductSelected = useCallback(
    async (url: string) => {
      setWebView({ visible: false, url: "" });
      setForm((p) => ({ ...p, url }));
      setScraping(true);
      try {
        const data = await wishlistScraperService.scrape(url);
        applyScrapeData(data, url);
      } finally {
        setScraping(false);
      }
    },
    [applyScrapeData],
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
  };
}
