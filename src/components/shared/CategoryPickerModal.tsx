import React, { useState, useMemo } from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  Pressable,
  FlatList,
  StyleSheet,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import type { ThemeColors } from "@packages/theme";
import { EXPENSE_CATEGORIES } from "@/src/constants/transactionCategories";
import { NCM_SUBCATEGORIES } from "@packages/parsers/src/classifier/ncmCategories";
import { GROUP_COLORS } from "@/src/constants/invoiceCategories";
import { soundManager } from "@/src/services/SoundManager";
import * as Haptics from "expo-haptics";

interface PickerItem {
  id: string;
  name: string;
  group: "needs" | "wants" | "savings";
  parentName?: string;
  isSubcategory: boolean;
}

interface CategoryPickerModalProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (categoryId: string, subcategoryId?: string) => void;
  theme: ThemeColors;
  selectedId?: string;
}

const GROUP_LABELS = {
  needs: "Essencial",
  wants: "Estilo de Vida",
  savings: "Futuro",
};

function buildAllItems(): PickerItem[] {
  const items: PickerItem[] = [];

  for (const cat of EXPENSE_CATEGORIES) {
    // Add parent category
    items.push({
      id: cat.id,
      name: cat.name,
      group: cat.group,
      isSubcategory: false,
    });

    // Add its subcategories
    const subs = NCM_SUBCATEGORIES.filter((s) => s.parentId === cat.id);
    for (const sub of subs) {
      items.push({
        id: `${cat.id}::${sub.id}`,
        name: sub.name,
        group: sub.group,
        parentName: cat.name,
        isSubcategory: true,
      });
    }
  }

  return items;
}

const ALL_ITEMS = buildAllItems();

export function CategoryPickerModal({
  visible,
  onClose,
  onSelect,
  theme,
  selectedId,
}: CategoryPickerModalProps) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!search.trim()) return ALL_ITEMS;
    const term = search.toLowerCase();
    return ALL_ITEMS.filter(
      (item) =>
        item.name.toLowerCase().includes(term) ||
        (item.parentName && item.parentName.toLowerCase().includes(term)) ||
        GROUP_LABELS[item.group].toLowerCase().includes(term)
    );
  }, [search]);

  const handleSelect = (item: PickerItem) => {
    soundManager.play("tap");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (item.isSubcategory) {
      const [parentId, subId] = item.id.split("::");
      onSelect(parentId!, subId);
    } else {
      onSelect(item.id);
    }
    setSearch("");
    onClose();
  };

  const renderItem = ({ item }: { item: PickerItem }) => {
    const color = GROUP_COLORS[item.group] ?? theme.primaryColor;
    const isSelected = selectedId === item.id || selectedId === item.id.split("::")[0];

    return (
      <Pressable
        onPress={() => handleSelect(item)}
        style={[
          s.row,
          {
            borderBottomColor: theme.border,
            backgroundColor: isSelected ? `${color}10` : undefined,
          },
        ]}
      >
        <View style={[s.dot, { backgroundColor: color }]} />
        <View style={{ flex: 1 }}>
          <Text style={[s.name, { color: theme.textColor }]}>
            {item.isSubcategory ? `  ${item.name}` : item.name}
          </Text>
          {item.isSubcategory && item.parentName && (
            <Text style={[s.parentLabel, { color: theme.secondaryText }]}>
              {item.parentName} • {GROUP_LABELS[item.group]}
            </Text>
          )}
        </View>
        <Text style={[s.groupTag, { color, backgroundColor: `${color}15` }]}>
          {GROUP_LABELS[item.group]}
        </Text>
      </Pressable>
    );
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={[s.overlay]}>
        <View style={[s.container, { backgroundColor: theme.cardBackground }]}>
          {/* Header */}
          <View style={s.header}>
            <Text style={[s.title, { color: theme.textColor }]}>Selecionar Categoria</Text>
            <Pressable onPress={onClose} hitSlop={12}>
              <Feather name="x" size={22} color={theme.secondaryText} />
            </Pressable>
          </View>

          {/* Search */}
          <View style={[s.searchBar, { backgroundColor: theme.background, borderColor: theme.border }]}>
            <Feather name="search" size={16} color={theme.secondaryText} />
            <TextInput
              style={[s.searchInput, { color: theme.textColor }]}
              placeholder="Buscar categoria ou subcategoria..."
              placeholderTextColor={theme.secondaryText}
              value={search}
              onChangeText={setSearch}
              autoFocus
            />
            {search.length > 0 && (
              <Pressable onPress={() => setSearch("")}>
                <Feather name="x-circle" size={16} color={theme.secondaryText} />
              </Pressable>
            )}
          </View>

          {/* List */}
          <FlatList
            data={filtered}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            style={s.list}
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={
              <Text style={[s.empty, { color: theme.secondaryText }]}>
                Nenhuma categoria encontrada
              </Text>
            }
          />
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  container: {
    maxHeight: "80%",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 16,
    paddingBottom: 30,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  title: {
    fontFamily: "DMSans_700Bold",
    fontSize: 16,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    paddingHorizontal: 12,
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
    marginBottom: 8,
  },
  searchInput: {
    flex: 1,
    fontFamily: "DMSans_400Regular",
    fontSize: 14,
  },
  list: {
    paddingHorizontal: 16,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 0.5,
    gap: 10,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  name: {
    fontFamily: "DMSans_500Medium",
    fontSize: 14,
  },
  parentLabel: {
    fontFamily: "DMSans_400Regular",
    fontSize: 11,
    marginTop: 1,
  },
  groupTag: {
    fontFamily: "DMSans_500Medium",
    fontSize: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: "hidden",
  },
  empty: {
    textAlign: "center",
    marginTop: 30,
    fontSize: 14,
  },
});
