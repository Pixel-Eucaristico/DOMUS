import React, { useCallback, useState } from "react";
import { Pressable, StyleSheet, View, TouchableOpacity } from "react-native";
import { Feather } from "@expo/vector-icons";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  interpolate,
} from "react-native-reanimated";
import { TourGuideZone } from "rn-tourguide";
import { TText } from "@/src/components/tamagui";

// ─── Types ──────────────────────────────────────────────────────────────────

type IconName = React.ComponentProps<typeof Feather>["name"];

interface FabAction {
  id: string;
  icon: IconName;
  label: string;
  color: string;
  onPress: () => void;
}

interface HomeFabProps {
  bottom: number;
  primaryColor: string;
  disabled?: boolean;
  actions: FabAction[];
  onMainPress?: () => void;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const SPRING = { damping: 14, stiffness: 150, mass: 0.8 };
const ITEM_SIZE = 46;
const RADIUS = 135;
const PAGE_SIZE = 3;
const ARC_START = 180;
const ARC_END = 270;

const ITEM_ANGLE_GAP = 30;

function getArcPositions(count: number) {
  const positions: { x: number; y: number }[] = [];
  const totalSpan = (count - 1) * ITEM_ANGLE_GAP;
  const midAngle = (ARC_START + ARC_END) / 2;
  const startDeg = midAngle - totalSpan / 2;

  for (let i = 0; i < count; i++) {
    const deg = startDeg + i * ITEM_ANGLE_GAP;
    const rad = (deg * Math.PI) / 180;
    positions.push({
      x: Math.cos(rad) * RADIUS,
      y: Math.sin(rad) * RADIUS,
    });
  }
  return positions;
}

// ─── Component ──────────────────────────────────────────────────────────────

export function HomeFab({
  bottom,
  primaryColor,
  disabled = false,
  actions,
  onMainPress,
}: HomeFabProps) {
  const progress = useSharedValue(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [page, setPage] = useState(0);

  const totalPages = Math.ceil(actions.length / PAGE_SIZE);
  const pageActions = actions.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const hasPages = totalPages > 1;

  const toggle = useCallback(() => {
    const next = !menuOpen;
    setMenuOpen(next);
    progress.value = withSpring(next ? 1 : 0, SPRING);
    if (!next) setPage(0);
  }, [menuOpen, progress]);

  const handleAction = useCallback(
    (action: FabAction) => {
      setMenuOpen(false);
      progress.value = withSpring(0, SPRING);
      setPage(0);
      setTimeout(() => action.onPress(), 100);
    },
    [progress],
  );

  const handleRotate = useCallback(() => {
    setPage((p) => (p + 1) % totalPages);
  }, [totalPages]);

  const mainIconStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${interpolate(progress.value, [0, 1], [0, 45])}deg` }],
  }));

  const arcSlotCount = hasPages ? pageActions.length + 1 : pageActions.length;
  const positions = getArcPositions(arcSlotCount);

  return (
    <>
      {menuOpen && (
        <Pressable style={[s.backdrop, { bottom: 0 }]} onPress={toggle} />
      )}

      {menuOpen && (
        <View style={[s.arcContainer, { bottom: bottom + 7, right: 31 }]} pointerEvents="box-none">
          {pageActions.map((action, i) => {
            const pos = positions[i]!;
            return (
              <TouchableOpacity
                key={action.id}
                activeOpacity={0.7}
                onPress={() => handleAction(action)}
                style={[
                  s.arcItem,
                  { left: pos.x - ITEM_SIZE / 2, top: pos.y - ITEM_SIZE / 2 },
                ]}
              >
                <View style={[s.arcButton, { backgroundColor: action.color }]}>
                  <Feather name={action.icon} size={20} color="#FFF" />
                </View>
                <TText
                  variant="caption"
                  fontWeight="600"
                  color="#FFF"
                  fontSize={9}
                  textAlign="center"
                  marginTop={3}
                  textShadowColor="rgba(0,0,0,0.9)"
                  textShadowOffset={{ width: 0, height: 1 }}
                  textShadowRadius={4}
                >
                  {action.label}
                </TText>
              </TouchableOpacity>
            );
          })}

          {hasPages && (() => {
            const pos = positions[pageActions.length]!;
            return (
              <TouchableOpacity
                key="__rotate__"
                activeOpacity={0.7}
                onPress={handleRotate}
                style={[
                  s.arcItem,
                  { left: pos.x - 18, top: pos.y - 18 },
                ]}
              >
                <View style={s.rotateButton}>
                  <Feather name="chevrons-right" size={16} color="#FFF" />
                </View>
                <TText
                  variant="caption"
                  fontWeight="600"
                  color="#FFF"
                  fontSize={9}
                  textAlign="center"
                  marginTop={3}
                  textShadowColor="rgba(0,0,0,0.9)"
                  textShadowOffset={{ width: 0, height: 1 }}
                  textShadowRadius={4}
                >
                  {page + 1}/{totalPages}
                </TText>
              </TouchableOpacity>
            );
          })()}
        </View>
      )}

      <View style={[s.fabContainer, { bottom }]}>
        <TourGuideZone zone={3} text="4" isTourGuide borderRadius={40} maskOffset={0} tooltipBottomOffset={80}>
          <Pressable
            collapsable={false}
            style={({ pressed }) => [s.fab, { backgroundColor: primaryColor }, pressed && s.fabPressed]}
            onPress={disabled ? undefined : (onMainPress ?? toggle)}
          >
            <Animated.View style={mainIconStyle}>
              <Feather name="plus" size={28} color="#FFF" />
            </Animated.View>
          </Pressable>
        </TourGuideZone>
      </View>
    </>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.35)",
    zIndex: 90,
  },
  arcContainer: {
    position: "absolute",
    width: 0,
    height: 0,
    zIndex: 100,
  },
  arcItem: {
    position: "absolute",
    alignItems: "center",
    zIndex: 101,
  },
  arcButton: {
    width: ITEM_SIZE,
    height: ITEM_SIZE,
    borderRadius: ITEM_SIZE / 2,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  rotateButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(80,80,80,0.85)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 6,
  },
  fabContainer: {
    position: "absolute",
    right: 24,
    alignItems: "flex-end",
    zIndex: 95,
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
  },
  fabPressed: {
    transform: [{ scale: 0.92 }],
    opacity: 0.9,
  },
});
