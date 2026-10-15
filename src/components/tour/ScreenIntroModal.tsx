import React from "react";
import { Modal, StyleSheet, Dimensions , Pressable } from "react-native";
import { View, Text, XStack, YStack } from "tamagui";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAppState } from "@/src/context/AppStateProvider";
import type { ScreenIntroDef } from "@/src/tour/screenIntroContent";

interface Props {
  visible: boolean;
  intro: ScreenIntroDef;
  onDismiss: () => void;
}

const { width: SCREEN_W } = Dimensions.get("window");

export function ScreenIntroModal({ visible, intro, onDismiss }: Props) {
  const { theme } = useAppState();
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onDismiss}
    >
      <View style={styles.backdrop}>
        <YStack
          style={[
            styles.card,
            {
              backgroundColor: theme.cardBackground,
              borderColor: theme.border,
              marginBottom: insets.bottom + 16,
            },
          ]}
        >
          {/* Header */}
          <YStack
            style={[styles.header, { borderBottomColor: theme.border }]}
          >
            <Text
              style={[styles.screenTitle, { color: theme.textColor }]}
            >
              {intro.screenTitle}
            </Text>
          </YStack>

          {/* Items */}
          <YStack style={styles.itemsContainer}>
            {intro.items.map((item, idx) => (
              <XStack key={idx} style={styles.item}>
                <View
                  style={[
                    styles.iconBadge,
                    { backgroundColor: theme.primaryColor + "22" },
                  ]}
                >
                  {item.iconSet === "MaterialCommunityIcons" ? (
                    <MaterialCommunityIcons
                      name={item.icon as any}
                      size={18}
                      color={theme.primaryColor}
                    />
                  ) : (
                    <Feather
                      name={item.icon as any}
                      size={18}
                      color={theme.primaryColor}
                    />
                  )}
                </View>
                <YStack style={styles.itemText}>
                  <Text style={[styles.itemTitle, { color: theme.textColor }]}>
                    {item.title}
                  </Text>
                  <Text
                    style={[styles.itemDesc, { color: theme.secondaryText }]}
                  >
                    {item.description}
                  </Text>
                </YStack>
              </XStack>
            ))}
          </YStack>

          {/* Button */}
          <Pressable
            style={({ pressed }) => [
              styles.btn,
              { backgroundColor: theme.primaryColor, opacity: pressed ? 0.8 : 1 },
            ]}
            onPress={onDismiss}
          >
            <Text style={styles.btnText}>Entendi!</Text>
          </Pressable>
        </YStack>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end",
    alignItems: "center",
  },
  card: {
    width: Math.min(SCREEN_W - 32, 480),
    borderRadius: 20,
    borderWidth: 1,
    overflow: "hidden",
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  screenTitle: {
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  itemsContainer: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 4,
    gap: 14,
  },
  item: {
    alignItems: "flex-start",
    gap: 12,
  },
  iconBadge: {
    width: 38,
    height: 38,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0,
    marginTop: 1,
  },
  itemText: {
    flex: 1,
    gap: 2,
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: "600",
  },
  itemDesc: {
    fontSize: 13,
    lineHeight: 18,
  },
  btn: {
    marginHorizontal: 16,
    marginTop: 18,
    marginBottom: 16,
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: "center",
  },
  btnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 15,
  },
});
