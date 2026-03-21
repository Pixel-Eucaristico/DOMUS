import React from "react";
import { View, Text, StyleSheet, Pressable, TouchableOpacity, Modal } from "react-native";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { TCard } from "@/src/components/tamagui";
import { AnimatedSeasonalTrophy } from "./AnimatedSeasonalTrophy";
import { getSeasonalXp } from "@packages/gamification/src/seasonalTrophies";
import { soundManager } from "@/src/services/SoundManager";
import type { SeasonalTier } from "@packages/gamification/src/seasonalTrophies";
import type { AlbumTrophySelection } from "./TrophyAlbumView";

interface TrophyDetailModalProps {
  selection: AlbumTrophySelection | null;
  onClose: () => void;
  theme: any;
  completionCount?: number;
}

export function TrophyDetailModal({ selection, onClose, theme, completionCount }: TrophyDetailModalProps) {
  if (!selection) return null;

  const { trophy, tier, tierColor, tierLabel, isCompleted, isLiturgical } = selection;

  return (
    <Modal visible={!!selection} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={s.modalOverlay} onPress={onClose}>
        <TCard borderRadius={28} padding={24} gap={16} width="100%" maxWidth={360} borderWidth={0} backgroundColor={theme.cardBackground} borderColor={theme.border} onPress={() => {}}>
          <LinearGradient
            colors={[tierColor + "20", "transparent"]}
            style={[StyleSheet.absoluteFill, { borderRadius: 28 }]}
          />
          <View style={s.modalHeader}>
            <View style={[s.tierBadge, { backgroundColor: tierColor + "22" }]}>
              <Text style={[s.tierBadgeText, { color: tierColor }]}>{tierLabel}</Text>
            </View>
            <TouchableOpacity
              onPress={() => { soundManager.play("tap"); onClose(); }}
              style={[s.closeModalBtn, { backgroundColor: theme.border + "44" }]}
            >
              <Feather name="x" size={18} color={theme.secondaryText} />
            </TouchableOpacity>
          </View>

          <View style={s.modalAnimatedWrapper}>
            <AnimatedSeasonalTrophy
              icon={trophy?.icon}
              id={trophy?.id}
              size={140}
              color={tierColor}
              isLiturgical={isLiturgical}
            />
          </View>

          <View style={s.modalContent}>
            <View style={s.trophyNameRow}>
              <Text style={[s.modalTrophyName, { color: theme.textColor }]}>{trophy?.name}</Text>
              {(completionCount ?? 0) > 1 && (
                <View style={[s.completionCountBadge, { backgroundColor: theme.primaryColor + "20" }]}>
                  <Text style={[s.completionCountText, { color: theme.primaryColor }]}>
                    ×{completionCount}
                  </Text>
                </View>
              )}
            </View>
            <Text style={[s.modalEventSummary, { color: theme.secondaryText }]}>
              {trophy?.eventSummary}
            </Text>

            <View
              style={[
                s.modalGoalBox,
                { borderColor: theme.border, backgroundColor: theme.primaryColor + "08" },
              ]}
            >
              <Feather name="target" size={14} color={tierColor} />
              <Text style={[s.modalGoalText, { color: theme.textColor }]}>
                {trophy?.description}
              </Text>
            </View>

            <View style={s.modalFooter}>
              <View style={[s.xpBadge, { backgroundColor: tierColor + "15" }]}>
                <Feather name="zap" size={14} color={tierColor} />
                <Text style={[s.xpText, { color: tierColor }]}>
                  +{getSeasonalXp(trophy?.baseXp ?? 0, tier as SeasonalTier)} XP
                </Text>
              </View>
              {isCompleted && (
                <View style={[s.completedBadgeModal, { backgroundColor: theme.success + "15" }]}>
                  <Feather name="check-circle" size={14} color={theme.success} />
                  <Text style={[s.completedText, { color: theme.success }]}>Conquistado</Text>
                </View>
              )}
            </View>
          </View>
        </TCard>
      </Pressable>
    </Modal>
  );
}

const s = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.8)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  tierBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "transparent",
  },
  tierBadgeText: {
    fontFamily: "DMSans_700Bold",
    fontSize: 10,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  closeModalBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  modalAnimatedWrapper: {
    alignItems: "center",
    paddingVertical: 10,
  },
  modalContent: {
    gap: 12,
  },
  trophyNameRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  completionCountBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  completionCountText: {
    fontFamily: "DMSans_700Bold",
    fontSize: 14,
  },
  modalTrophyName: {
    fontFamily: "DMSans_700Bold",
    fontSize: 22,
    textAlign: "center",
    letterSpacing: -0.5,
  },
  modalEventSummary: {
    fontFamily: "DMSans_400Regular",
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
    opacity: 0.8,
  },
  modalGoalBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
  },
  modalGoalText: {
    fontFamily: "DMSans_500Medium",
    fontSize: 13,
    flex: 1,
    lineHeight: 18,
  },
  modalFooter: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 12,
    marginTop: 8,
  },
  xpBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  xpText: {
    fontFamily: "DMSans_700Bold",
    fontSize: 13,
  },
  completedBadgeModal: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  completedText: {
    fontFamily: "DMSans_700Bold",
    fontSize: 12,
  },
});
