import React, { useState, useMemo, useCallback } from "react";
import {
  View,
  Pressable,
  StyleSheet,
  TextInput,
} from "react-native";
import Animated, {
  FadeIn,
  FadeOut,
  Layout,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withSequence
} from "react-native-reanimated";
import { Feather } from "@expo/vector-icons";
import type { ThemeColors } from "@packages/theme";
import { soundManager } from "@/src/services/SoundManager";
import * as Haptics from "expo-haptics";
import { useCategoryIntelligence } from "@/src/hooks/useCategoryIntelligence";
import type { TransactionType, CategoryGroup } from "@packages/events/src/types";
import { NCM_SUBCATEGORIES } from "@packages/parsers/src/classifier/ncmCategories";
import { GroupOverrideChip } from "./GroupOverrideChip";
import { TText } from "@/src/components/tamagui";

interface CategoryOption {
  id: string;
  name: string;
  group: "needs" | "wants" | "savings";
  allowGroupOverride?: boolean;
  parentId?: string;
}

interface CategorySelectorGridProps {
  categories: CategoryOption[];
  selectedId: string;
  selectedSubcategoryId?: string;
  theme: ThemeColors;
  type: TransactionType;
  onSelect: (id: string, subcategoryId?: string) => void;
  onGroupOverride?: (group: CategoryGroup) => void;
  groupOverride?: CategoryGroup;
}

const GROUP_LABELS = {
  needs: "Essencial (50%)",
  wants: "Estilo de Vida (30%)",
  savings: "Futuro (20%)",
};

const GROUP_COLORS = {
  needs: "#10B981",
  wants: "#F59E0B",
  savings: "#3B82F6",
};

export function CategorySelectorGrid({
  categories,
  selectedId,
  selectedSubcategoryId,
  theme,
  type,
  onSelect,
  onGroupOverride,
  groupOverride,
}: CategorySelectorGridProps) {
  const [search, setSearch] = useState("");
  const [expandedParent, setExpandedParent] = useState<string | null>(null);
  const { suggestedCategories } = useCategoryIntelligence(type);

  const subcategoriesByParent = useMemo(() => {
    const map = new Map<string, CategoryOption[]>();
    for (const sub of NCM_SUBCATEGORIES) {
      const list = map.get(sub.parentId) ?? [];
      list.push({
        id: sub.id,
        name: sub.name,
        group: sub.group,
        allowGroupOverride: sub.allowGroupOverride,
        parentId: sub.parentId,
      });
      map.set(sub.parentId, list);
    }
    return map;
  }, []);

  const searchMatchesSubcategory = useMemo(() => {
    if (!search.trim()) return new Map<string, CategoryOption[]>();
    const term = search.toLowerCase();
    const matches = new Map<string, CategoryOption[]>();
    for (const [parentId, subs] of subcategoriesByParent) {
      const matched = subs.filter((s) => s.name.toLowerCase().includes(term));
      if (matched.length > 0) matches.set(parentId, matched);
    }
    return matches;
  }, [search, subcategoriesByParent]);

  const filteredCategories = useMemo(() => {
    if (!search.trim()) return categories;
    const term = search.toLowerCase();
    return categories.filter((c) =>
      c.name.toLowerCase().includes(term) ||
      GROUP_LABELS[c.group as keyof typeof GROUP_LABELS].toLowerCase().includes(term) ||
      searchMatchesSubcategory.has(c.id)
    );
  }, [categories, search, searchMatchesSubcategory]);

  const grouped = useMemo(() => {
    const res: Record<string, CategoryOption[]> = { needs: [], wants: [], savings: [] };
    filteredCategories.forEach((c) => {
      if (res[c.group]) res[c.group].push(c);
    });
    return res;
  }, [filteredCategories]);

  const handleCategoryPress = useCallback((catId: string) => {
    const hasSubs = subcategoriesByParent.has(catId);

    if (hasSubs && expandedParent !== catId) {
      setExpandedParent(catId);
    } else if (hasSubs && expandedParent === catId) {
      setExpandedParent(null);
    }
    onSelect(catId, undefined);
  }, [expandedParent, subcategoriesByParent, onSelect]);

  const handleSubcategoryPress = useCallback((parentId: string, subId: string) => {
    onSelect(parentId, subId);
  }, [onSelect]);

  const selectedCategory = useMemo(() => {
    return categories.find((c) => c.id === selectedId);
  }, [categories, selectedId]);

  const selectedSub = useMemo(() => {
    if (!selectedSubcategoryId) return null;
    return NCM_SUBCATEGORIES.find((s) => s.id === selectedSubcategoryId) ?? null;
  }, [selectedSubcategoryId]);

  // Sempre permite corrigir o grupo em despesas — a classificação automática
  // pode errar (ex.: salgadinho cai em "alimentacao"/needs mas é desejo).
  const showGroupOverride =
    !!onGroupOverride && type === "expense" && !!(selectedSub || selectedCategory);

  return (
    <View style={s.container}>
      {/* Search Bar */}
      <View style={[s.searchBar, { backgroundColor: theme.background, borderColor: theme.border }]}>
        <Feather name="search" size={16} color={theme.secondaryText} style={s.searchIcon} />
        <TextInput
          style={[s.searchInput, { color: theme.textColor }]}
          placeholder="Buscar categoria ou subcategoria..."
          placeholderTextColor={theme.secondaryText}
          value={search}
          onChangeText={(t) => {
            setSearch(t);
            if (t.trim()) setExpandedParent(null);
          }}
        />
        {search.length > 0 && (
          <Pressable onPress={() => {
            setSearch("");
            setExpandedParent(null);
            soundManager.play("pop");
          }}>
            <Feather name="x-circle" size={16} color={theme.secondaryText} />
          </Pressable>
        )}
      </View>

      {/* Selected subcategory label + Group Override */}
      {(selectedSubcategoryId || showGroupOverride) && (
        <Animated.View entering={FadeIn} exiting={FadeOut} style={s.selectionRow}>
          {selectedSubcategoryId && selectedSub && (
            <View style={[s.selectedSubBadge, { backgroundColor: `${GROUP_COLORS[selectedSub.group]}15`, borderColor: `${GROUP_COLORS[selectedSub.group]}40` }]}>
              <TText variant="caption" color={GROUP_COLORS[selectedSub.group]} fontWeight="500">
                {selectedSub.name}
              </TText>
              <Pressable onPress={() => onSelect(selectedId, undefined)}>
                <Feather name="x" size={12} color={GROUP_COLORS[selectedSub.group]} />
              </Pressable>
            </View>
          )}
          {showGroupOverride && (
            <View style={s.overrideRow}>
              <GroupOverrideChip
                currentGroup={groupOverride ?? selectedSub?.group ?? selectedCategory?.group ?? "needs"}
                onChange={onGroupOverride!}
                theme={theme}
              />
            </View>
          )}
        </Animated.View>
      )}

      {/* Sugestoes Inteligentes */}
      {!search && suggestedCategories.length > 0 && (
        <Animated.View entering={FadeIn} exiting={FadeOut} style={s.groupSection}>
          <TText
            variant="caption"
            bold
            color={theme.primaryColor}
            fontSize={11}
            textTransform="uppercase"
            letterSpacing={0.8}
            marginBottom={10}
            marginLeft={4}
            opacity={0.8}
          >
            Sugeridas p/ voce
          </TText>
          <View style={s.grid}>
            {suggestedCategories.map((cat) => (
              <CategoryItem
                key={`sug-${cat.id}`}
                cat={cat}
                selected={selectedId === cat.id && !selectedSubcategoryId}
                color={theme.primaryColor}
                theme={theme}
                onSelect={() => handleCategoryPress(cat.id)}
                hasChildren={subcategoriesByParent.has(cat.id)}
                isExpanded={expandedParent === cat.id}
              />
            ))}
          </View>
        </Animated.View>
      )}

      {/* Grid Principal Agrupado 50/30/20 */}
      {Object.entries(grouped).map(([group, items], groupIdx) => {
        if (items.length === 0) return null;
        const color = GROUP_COLORS[group as keyof typeof GROUP_COLORS];

        return (
          <Animated.View
            key={group}
            layout={Layout.duration(180)}
            entering={FadeIn.delay(groupIdx * 100)}
            style={s.groupSection}
          >
            <TText
              variant="caption"
              bold
              color={color}
              fontSize={11}
              textTransform="uppercase"
              letterSpacing={0.8}
              marginBottom={10}
              marginLeft={4}
              opacity={0.8}
            >
              {GROUP_LABELS[group as keyof typeof GROUP_LABELS]}
            </TText>
            <View style={s.grid}>
              {items.map((cat) => (
                <React.Fragment key={cat.id}>
                  <CategoryItem
                    cat={cat}
                    selected={selectedId === cat.id}
                    color={color}
                    theme={theme}
                    onSelect={() => handleCategoryPress(cat.id)}
                    hasChildren={subcategoriesByParent.has(cat.id)}
                    isExpanded={expandedParent === cat.id || (!!search.trim() && searchMatchesSubcategory.has(cat.id))}
                  />
                </React.Fragment>
              ))}
            </View>

            {/* Expanded / Search-matched Subcategories */}
            {items.map((cat) => {
              const isSearchMatch = !!search.trim() && searchMatchesSubcategory.has(cat.id);
              const isExpanded = expandedParent === cat.id || isSearchMatch;
              if (!isExpanded) return null;

              const subs = isSearchMatch
                ? searchMatchesSubcategory.get(cat.id) ?? []
                : subcategoriesByParent.get(cat.id) ?? [];
              if (subs.length === 0) return null;

              return (
                <Animated.View
                  key={`subs-${cat.id}`}
                  entering={FadeIn}
                  exiting={FadeOut}
                  style={s.subcategorySection}
                >
                  <TText variant="caption" fontWeight="500" color={theme.secondaryText} fontSize={11} marginBottom={6}>
                    {cat.name} — Subcategorias
                  </TText>
                  <View style={s.subGrid}>
                    {subs.map((sub) => (
                      <SubcategoryChip
                        key={sub.id}
                        sub={sub}
                        selected={selectedSubcategoryId === sub.id}
                        parentColor={color}
                        theme={theme}
                        onPress={() => handleSubcategoryPress(cat.id, sub.id)}
                      />
                    ))}
                  </View>
                </Animated.View>
              );
            })}
          </Animated.View>
        );
      })}
    </View>
  );
}

// ─── Category Item ───────────────────────────────────────────────────────────

function CategoryItem({ cat, selected, color, theme, onSelect, hasChildren, isExpanded }: {
  cat: CategoryOption;
  selected: boolean;
  color: string;
  theme: ThemeColors;
  onSelect: () => void;
  hasChildren?: boolean;
  isExpanded?: boolean;
}) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePress = () => {
    scale.value = withSequence(
      withSpring(0.9, { damping: 25, stiffness: 200 }),
      withSpring(1, { damping: 20, stiffness: 150 })
    );
    soundManager.play("tap");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSelect();
  };

  return (
    <Animated.View style={animatedStyle} layout={Layout.duration(180)}>
      <Pressable
        onPress={handlePress}
        style={[
          s.chip,
          {
            borderColor: selected ? color : theme.border,
            backgroundColor: selected ? `${color}15` : theme.cardBackground,
          },
        ]}
      >
        <TText
          variant="label"
          numberOfLines={1}
          color={selected ? color : theme.textColor}
          fontWeight={selected ? "700" : "400"}
        >
          {cat.name}
        </TText>
        {hasChildren && (
          <Feather
            name={isExpanded ? "chevron-up" : "chevron-down"}
            size={12}
            color={selected ? color : theme.secondaryText}
            style={s.chevron}
          />
        )}
      </Pressable>
    </Animated.View>
  );
}

// ─── Subcategory Chip ────────────────────────────────────────────────────────

function SubcategoryChip({ sub, selected, parentColor, theme, onPress }: {
  sub: CategoryOption;
  selected: boolean;
  parentColor: string;
  theme: ThemeColors;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={() => {
        soundManager.play("tap");
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
      style={[
        s.subChip,
        {
          borderColor: selected ? parentColor : `${parentColor}40`,
          backgroundColor: selected ? `${parentColor}20` : `${parentColor}08`,
        },
      ]}
    >
      <TText
        variant="caption"
        numberOfLines={1}
        color={selected ? parentColor : theme.textColor}
        fontWeight={selected ? "700" : "400"}
      >
        {sub.name}
      </TText>
      {sub.allowGroupOverride && (
        <View style={[s.overrideDot, { backgroundColor: "#F59E0B" }]} />
      )}
    </Pressable>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  container: { gap: 12 },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 4,
  },
  searchIcon: { marginRight: 8 },
  searchInput: {
    flex: 1,
    fontFamily: "DMSans_400Regular",
    fontSize: 14,
  },
  selectionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
    paddingHorizontal: 4,
  },
  selectedSubBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
  },
  overrideRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  groupSection: { marginBottom: 8 },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    minWidth: 90,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },
  chevron: { marginLeft: 4 },
  subcategorySection: {
    marginTop: 8,
    marginLeft: 8,
    marginBottom: 4,
  },
  subGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  subChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  overrideDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginLeft: 4,
  },
});
