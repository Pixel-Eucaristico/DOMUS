import React, { useState, useMemo } from "react";
import {
  View,
  Text,
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
import type { TransactionType } from "@packages/events/src/types";

interface CategoryOption {
  id: string;
  name: string;
  group: "needs" | "wants" | "savings";
}

interface CategorySelectorGridProps {
  categories: CategoryOption[];
  selectedId: string;
  theme: ThemeColors;
  type: TransactionType;
  onSelect: (id: string) => void;
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
  theme,
  type,
  onSelect,
}: CategorySelectorGridProps) {
  const [search, setSearch] = useState("");
  const { suggestedCategories } = useCategoryIntelligence(type);

  const filteredCategories = useMemo(() => {
    if (!search.trim()) return categories;
    const term = search.toLowerCase();
    return categories.filter((c) => 
      c.name.toLowerCase().includes(term) || 
      GROUP_LABELS[c.group as keyof typeof GROUP_LABELS].toLowerCase().includes(term)
    );
  }, [categories, search]);

  const grouped = useMemo(() => {
    const res: Record<string, CategoryOption[]> = { needs: [], wants: [], savings: [] };
    filteredCategories.forEach((c) => {
      if (res[c.group]) res[c.group].push(c);
    });
    return res;
  }, [filteredCategories]);

  return (
    <View style={s.container}>
      {/* Search Bar com Feedback Sonoro */}
      <View style={[s.searchBar, { backgroundColor: theme.background, borderColor: theme.border }]}>
        <Feather name="search" size={16} color={theme.secondaryText} style={s.searchIcon} />
        <TextInput
          style={[s.searchInput, { color: theme.textColor }]}
          placeholder="Buscar categoria..."
          placeholderTextColor={theme.secondaryText}
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <Pressable onPress={() => {
            setSearch("");
            soundManager.play("pop");
          }}>
            <Feather name="x-circle" size={16} color={theme.secondaryText} />
          </Pressable>
        )}
      </View>

      {/* Sugestões Inteligentes (Só aparece sem busca ativa) */}
      {!search && suggestedCategories.length > 0 && (
        <Animated.View entering={FadeIn} exiting={FadeOut} style={s.groupSection}>
          <Text style={[s.groupTitle, { color: theme.primaryColor }]}>Sugeridas p/ você</Text>
          <View style={s.grid}>
            {suggestedCategories.map((cat) => (
              <CategoryItem
                key={`sug-${cat.id}`}
                cat={cat}
                selected={selectedId === cat.id}
                color={theme.primaryColor}
                theme={theme}
                onSelect={onSelect}
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
            layout={Layout.springify().damping(15)} 
            entering={FadeIn.delay(groupIdx * 100)} 
            style={s.groupSection}
          >
            <Text style={[s.groupTitle, { color }]}>{GROUP_LABELS[group as keyof typeof GROUP_LABELS]}</Text>
            <View style={s.grid}>
              {items.map((cat) => (
                <CategoryItem
                  key={cat.id}
                  cat={cat}
                  selected={selectedId === cat.id}
                  color={color}
                  theme={theme}
                  onSelect={onSelect}
                />
              ))}
            </View>
          </Animated.View>
        );
      })}
    </View>
  );
}

function CategoryItem({ cat, selected, color, theme, onSelect }: any) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePress = () => {
    // Motion Spring
    scale.value = withSequence(
      withSpring(0.9, { damping: 10, stiffness: 400 }),
      withSpring(1, { damping: 10, stiffness: 200 })
    );
    
    soundManager.play("tap");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSelect(cat.id);
  };

  return (
    <Animated.View style={animatedStyle} layout={Layout.springify()}>
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
        <Text
          numberOfLines={1}
          style={[
            s.chipText,
            {
              color: selected ? color : theme.textColor,
              fontFamily: selected ? "DMSans_700Bold" : "DMSans_400Regular",
            },
          ]}
        >
          {cat.name}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

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
  groupSection: { marginBottom: 8 },
  groupTitle: {
    fontFamily: "DMSans_700Bold",
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 10,
    marginLeft: 4,
    opacity: 0.8,
  },
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
    justifyContent: 'center',
  },
  chipText: { fontSize: 13 },
});
