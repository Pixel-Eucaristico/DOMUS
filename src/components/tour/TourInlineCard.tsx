import React from "react";
import { StyleSheet, View, Text, Pressable, ScrollView } from "react-native";
import Animated, {
  FadeInDown,
  withTiming,
  useAnimatedStyle,
  useSharedValue,
} from "react-native-reanimated";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import type { ThemeColors } from "@packages/theme";
import type { TourStepDef } from "@/src/tour/tourStepConfig";
import { TOUR_TOTAL } from "@/src/tour/tourStepConfig";
import { TourArrow } from "./TourArrow";

const MAX_WIDTH = 340;

interface Props {
  step: TourStepDef;
  stepIndex: number;
  theme: ThemeColors;
  onNext: () => void;
  onPrev: () => void;
  onSkip: () => void;
  onMinimize: () => void;
  isLast: boolean;
  showArrow?: boolean;
  onLayout?: (e: any) => void;
}

export function TourInlineCard({
  step,
  stepIndex,
  theme,
  onNext,
  onPrev,
  onSkip,
  onMinimize,
  isLast,
  showArrow = true,
  onLayout,
}: Props) {
  const progress = (stepIndex + 1) / TOUR_TOTAL;

  const IconComponent =
    step.iconSet === "MaterialCommunityIcons"
      ? MaterialCommunityIcons
      : Feather;

  const progressAnim = useSharedValue(progress);
  React.useEffect(() => {
    progressAnim.value = withTiming(progress, { duration: 300 });
  }, [progress]);
  const progressStyle = useAnimatedStyle(() => ({
    width: `${Math.round(progressAnim.value * 100)}%` as any,
  }));

  return (
    <Animated.View
      key={stepIndex}
      entering={FadeInDown.duration(300).springify().damping(20)}
      style={[
        s.card, 
        { backgroundColor: theme.cardBackground },
        step.arrowAlign === "right" ? { alignSelf: "flex-end" } : {}
      ]}
      onLayout={onLayout}
    >
      {showArrow && (
        <View style={[
          step.arrowDirection === "up" ? s.arrowContainerUp : s.arrowContainerDown,
          step.arrowAlign === "right" 
            ? { left: undefined, right: step.arrowOffset ?? 28 } 
            : step.arrowAlign === "center"
              ? { alignSelf: "center", left: undefined, right: undefined }
              : { left: step.arrowOffset ?? 24, right: undefined }
        ]}>
          <TourArrow direction={step.arrowDirection || "up"} color={theme.cardBackground} />
        </View>
      )}

      {/* Tag + minimizar */}
      <View style={s.topRow}>
        <View style={[s.tag, { backgroundColor: `${theme.primaryColor}15` }]}>
          <Text style={[s.tagText, { color: theme.primaryColor }]}>
            {step.tag}
          </Text>
        </View>
        <Pressable onPress={onMinimize} hitSlop={10} style={s.minimizeBtn}>
          <Feather name="minus" size={16} color={theme.secondaryText} />
        </Pressable>
      </View>

      {/* Icone + Titulo */}
      <View style={s.header}>
        <View
          style={[s.iconCircle, { backgroundColor: `${theme.primaryColor}18` }]}
        >
          <IconComponent
            name={step.icon as any}
            size={22}
            color={theme.primaryColor}
          />
        </View>
        <Text style={[s.title, { color: theme.textColor }]}>{step.title}</Text>
      </View>

      {/* Descricao */}
      <ScrollView
        style={s.descScroll}
        showsVerticalScrollIndicator={false}
        scrollEnabled={false}
      >
        <Text style={[s.desc, { color: theme.secondaryText }]}>
          {step.description}
        </Text>
      </ScrollView>

      {/* Barra de progresso */}
      <View
        style={[s.progressTrack, { backgroundColor: `${theme.primaryColor}20` }]}
      >
        <Animated.View
          style={[
            s.progressFill,
            { backgroundColor: theme.primaryColor },
            progressStyle,
          ]}
        />
      </View>

      {/* Rodape */}
      <View style={s.footer}>
        <Pressable
          onPress={onPrev}
          hitSlop={12}
          style={[s.navBtn, { opacity: stepIndex === 0 ? 0.25 : 1 }]}
          disabled={stepIndex === 0}
        >
          <Feather name="chevron-left" size={22} color={theme.secondaryText} />
        </Pressable>

        <Text style={[s.counter, { color: theme.secondaryText }]}>
          {stepIndex + 1} de {TOUR_TOTAL}
        </Text>

        <Pressable
          onPress={onNext}
          style={[s.nextBtn, { backgroundColor: theme.primaryColor }]}
        >
          <Text style={s.nextText}>{isLast ? "Próxima Tela" : "Próximo"}</Text>
          <Feather
            name={isLast ? "check" : "arrow-right"}
            size={15}
            color="#FFF"
          />
        </Pressable>
      </View>

      <Pressable onPress={onSkip} hitSlop={12} style={s.skipBtn}>
        <Text style={[s.skipText, { color: theme.secondaryText }]}>
          Pular tour
        </Text>
      </Pressable>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  card: {
    marginTop: 4,
    borderRadius: 20,
    padding: 18,
    maxWidth: MAX_WIDTH,
    alignSelf: "center",
    width: "100%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 12,
  },
  arrowContainerUp: {
    position: "absolute",
    top: -10,
  },
  arrowContainerDown: {
    position: "absolute",
    bottom: -10,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  tag: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
  },
  tagText: {
    fontFamily: "DMSans_600SemiBold",
    fontSize: 11,
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  minimizeBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 10,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0,
  },
  title: {
    fontFamily: "DMSans_700Bold",
    fontSize: 17,
    flex: 1,
    flexWrap: "wrap",
  },
  descScroll: {
    marginBottom: 14,
    maxHeight: 64,
  },
  desc: {
    fontFamily: "DMSans_400Regular",
    fontSize: 13,
    lineHeight: 20,
  },
  progressTrack: {
    height: 4,
    borderRadius: 2,
    marginBottom: 16,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 2,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  navBtn: {
    width: 36,
    height: 36,
    justifyContent: "center",
    alignItems: "center",
  },
  counter: {
    fontFamily: "DMSans_500Medium",
    fontSize: 12,
  },
  nextBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 12,
    gap: 5,
  },
  nextText: {
    fontFamily: "DMSans_700Bold",
    fontSize: 13,
    color: "#FFF",
  },
  skipBtn: {
    marginTop: 10,
    alignSelf: "center",
    padding: 4,
  },
  skipText: {
    fontFamily: "DMSans_400Regular",
    fontSize: 12,
    textDecorationLine: "underline",
  },
});
