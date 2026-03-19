import React, { useState } from "react";
import {
  StyleSheet,
  View,
  Text,
  Pressable,
  ScrollView,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { useAppState } from "@/src/context/AppStateProvider";
import {
  getMissionForDay,
  isOnboardingComplete,
  getDayProgress,
  getOverallProgress,
} from "@packages/onboarding/src/onboardingEngine";
import { getEncouragementMessage, evaluatePerformance } from "@packages/onboarding/src/adaptiveMissionEngine";
import { ONBOARDING_EVENTS, ONBOARDING_STEPS } from "@packages/onboarding/src/types";
import { generateId } from "@packages/events/src/factory";
import { TButton } from "@/src/components/tamagui";

const STEP_LABELS: Record<string, string> = {
  create_account: "Criar uma conta",
  set_income: "Registrar sua renda",
  log_expense: "Registrar um gasto",
  review_budget: "Revisar orcamento",
  set_goal: "Definir uma meta",
  log_3_transactions: "Registrar 3 transacoes",
  check_503020: "Verificar 50/30/20",
};

const STEP_ICONS: Record<string, string> = {
  create_account: "credit-card",
  set_income: "dollar-sign",
  log_expense: "shopping-cart",
  review_budget: "pie-chart",
  set_goal: "target",
  log_3_transactions: "list",
  check_503020: "bar-chart-2",
};

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { onboarding, theme, dispatch } = useAppState();
  const webTopInset = Platform.OS === "web" ? 67 : 0;

  const [viewDay, setViewDay] = useState(Math.max(onboarding.currentDay, 1));

  const started = onboarding.started;
  const completed = isOnboardingComplete(onboarding);
  const overallProgress = getOverallProgress(onboarding);
  const expectedDays = Math.max(onboarding.currentDay - 1, 0);
  const completionRate = expectedDays > 0 ? onboarding.completedDays.length / expectedDays : 1;
  const encouragement = getEncouragementMessage(completionRate, onboarding.difficulty);

  const handleStart = () => {
    const today = new Date().toISOString().split("T")[0]!;
    const event = {
      id: generateId(),
      type: ONBOARDING_EVENTS.ONBOARDING_STARTED,
      payload: { userId: "local", startDate: today, difficulty: "normal" as const },
      timestamp: Date.now(),
      deviceId: "local",
      signature: "",
    };
    dispatch(event as any);
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  };

  const handleCompleteStep = (step: string) => {
    if (onboarding.completedSteps.includes(step as any)) return;

    const today = new Date().toISOString().split("T")[0]!;
    const stepEvent = {
      id: generateId(),
      type: ONBOARDING_EVENTS.ONBOARDING_STEP_COMPLETED,
      payload: { step, day: viewDay, completedAt: today },
      timestamp: Date.now(),
      deviceId: "local",
      signature: "",
    };
    dispatch(stepEvent as any);

    const mission = getMissionForDay(viewDay, onboarding.difficulty);
    if (mission) {
      const allDone = mission.steps.every(
        (s) => onboarding.completedSteps.includes(s) || s === step,
      );
      if (allDone) {
        const dayEvent = {
          id: generateId(),
          type: ONBOARDING_EVENTS.ONBOARDING_DAY_COMPLETED,
          payload: {
            day: viewDay,
            completedAt: today,
            stepsCompleted: mission.steps.length,
            totalSteps: mission.steps.length,
          },
          timestamp: Date.now(),
          deviceId: "local",
          signature: "",
        };
        dispatch(dayEvent as any);

        const perf = evaluatePerformance({
          ...onboarding,
          completedDays: [...onboarding.completedDays, viewDay],
          currentDay: viewDay,
        });
        if (perf.shouldAdjust) {
          const adjustEvent = {
            id: generateId(),
            type: ONBOARDING_EVENTS.ONBOARDING_ADJUSTED,
            payload: {
              previousDifficulty: onboarding.difficulty,
              newDifficulty: perf.newDifficulty,
              reason: perf.reason,
              day: viewDay,
            },
            timestamp: Date.now(),
            deviceId: "local",
            signature: "",
          };
          dispatch(adjustEvent as any);
        }

        if (onboarding.completedDays.length + 1 >= 7) {
          const finishEvent = {
            id: generateId(),
            type: ONBOARDING_EVENTS.ONBOARDING_FINISHED,
            payload: {
              finishedAt: today,
              totalDays: 7,
              finalDifficulty: perf.shouldAdjust ? perf.newDifficulty : onboarding.difficulty,
            },
            timestamp: Date.now(),
            deviceId: "local",
            signature: "",
          };
          dispatch(finishEvent as any);
        }
      }
    }

    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const mission = getMissionForDay(viewDay, onboarding.difficulty);
  const dayProg = getDayProgress(onboarding, viewDay);

  if (!started) {
    return (
      <View style={[st.root, { backgroundColor: theme.background }]}>
        <View style={[st.welcomeContainer, { paddingTop: insets.top + webTopInset + 60 }]}>
          <View style={[st.welcomeIcon, { backgroundColor: `${theme.primaryColor}15` }]}>
            <Feather name="compass" size={48} color={theme.primaryColor} />
          </View>
          <Text style={[st.welcomeTitle, { color: theme.textColor }]}>
            Bem-vindo ao DOMUS
          </Text>
          <Text style={[st.welcomeSubtext, { color: theme.secondaryText }]}>
            Vamos comecar sua jornada financeira em 7 dias. Missoes simples, sem pressao.
          </Text>
          <View style={{ marginTop: 12 }}>
            <TButton variant="primary" backgroundColor={theme.primaryColor} icon={<Feather name="play" size={20} color="#FFF" />} onPress={handleStart}>
              Comecar
            </TButton>
          </View>
          <View style={{ marginTop: 8 }}>
            <TButton variant="ghost" color={theme.primaryColor} onPress={() => router.back()}>
              Pular onboarding
            </TButton>
          </View>
        </View>
      </View>
    );
  }

  if (completed) {
    return (
      <View style={[st.root, { backgroundColor: theme.background }]}>
        <View style={[st.welcomeContainer, { paddingTop: insets.top + webTopInset + 60 }]}>
          <View style={[st.welcomeIcon, { backgroundColor: `${theme.success}15` }]}>
            <Feather name="check-circle" size={48} color={theme.success} />
          </View>
          <Text style={[st.welcomeTitle, { color: theme.textColor }]}>
            Onboarding completo!
          </Text>
          <Text style={[st.welcomeSubtext, { color: theme.secondaryText }]}>
            Voce esta pronto para gerenciar suas financas. Continue registrando suas transacoes.
          </Text>
          <View style={{ marginTop: 12 }}>
            <TButton variant="primary" backgroundColor={theme.primaryColor} icon={<Feather name="arrow-left" size={20} color="#FFF" />} onPress={() => router.back()}>
              Voltar ao inicio
            </TButton>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={[st.root, { backgroundColor: theme.background }]}>
      <ScrollView
        contentContainerStyle={[
          st.content,
          {
            paddingTop: insets.top + webTopInset + 16,
            paddingBottom: insets.bottom + 32,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={st.topRow}>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <Feather name="arrow-left" size={22} color={theme.textColor} />
          </Pressable>
          <Text style={[st.pageTitle, { color: theme.textColor }]}>
            Dia {viewDay} de 7
          </Text>
          <View style={{ width: 22 }} />
        </View>

        <View style={[st.progressBar, { backgroundColor: theme.border }]}>
          <View
            style={[
              st.progressFill,
              { width: `${overallProgress}%` as any, backgroundColor: theme.accentColor },
            ]}
          />
        </View>

        <View style={st.daySelector}>
          {[1, 2, 3, 4, 5, 6, 7].map((d) => {
            const isDone = onboarding.completedDays.includes(d);
            const isCurrent = d === viewDay;
            return (
              <Pressable
                key={d}
                style={[
                  st.dayDot,
                  {
                    backgroundColor: isDone
                      ? theme.success
                      : isCurrent
                        ? theme.primaryColor
                        : theme.border,
                  },
                ]}
                onPress={() => setViewDay(d)}
              >
                <Text
                  style={[
                    st.dayDotText,
                    { color: isDone || isCurrent ? "#FFF" : theme.secondaryText },
                  ]}
                >
                  {d}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View style={[st.encourageCard, { backgroundColor: `${theme.primaryColor}08` }]}>
          <Feather name="heart" size={16} color={theme.primaryColor} />
          <Text style={[st.encourageText, { color: theme.textColor }]}>
            {encouragement}
          </Text>
        </View>

        {mission && (
          <View style={[st.missionCard, { backgroundColor: theme.cardBackground }]}>
            <Text style={[st.missionTitle, { color: theme.textColor }]}>
              {mission.description}
            </Text>
            <Text style={[st.missionProgress, { color: theme.secondaryText }]}>
              {dayProg.completed}/{dayProg.total} tarefas ({dayProg.percent}%)
            </Text>

            <View style={st.stepList}>
              {mission.steps.map((step, i) => {
                const done = onboarding.completedSteps.includes(step);
                return (
                  <Pressable
                    key={`${step}-${i}`}
                    style={[
                      st.stepRow,
                      {
                        backgroundColor: done
                          ? `${theme.success}10`
                          : theme.background,
                        borderColor: done ? theme.success : theme.border,
                      },
                    ]}
                    onPress={() => handleCompleteStep(step)}
                    disabled={done}
                  >
                    <View
                      style={[
                        st.stepCheckbox,
                        {
                          backgroundColor: done ? theme.success : "transparent",
                          borderColor: done ? theme.success : theme.border,
                        },
                      ]}
                    >
                      {done && (
                        <Feather name="check" size={12} color="#FFF" />
                      )}
                    </View>
                    <Feather
                      name={(STEP_ICONS[step] || "circle") as any}
                      size={18}
                      color={done ? theme.success : theme.primaryColor}
                    />
                    <Text
                      style={[
                        st.stepLabel,
                        {
                          color: done ? theme.success : theme.textColor,
                          textDecorationLine: done ? "line-through" : "none",
                        },
                      ]}
                    >
                      {STEP_LABELS[step] || step}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}

        <View style={[st.diffCard, { backgroundColor: theme.cardBackground }]}>
          <Text style={[st.diffLabel, { color: theme.secondaryText }]}>
            Dificuldade atual
          </Text>
          <Text style={[st.diffValue, { color: theme.textColor }]}>
            {onboarding.difficulty === "easy"
              ? "Facil"
              : onboarding.difficulty === "normal"
                ? "Normal"
                : "Desafiante"}
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const st = StyleSheet.create({
  root: { flex: 1 },
  content: { gap: 16, paddingHorizontal: 16 },
  welcomeContainer: { flex: 1, alignItems: "center", paddingHorizontal: 32, gap: 16 },
  welcomeIcon: { width: 100, height: 100, borderRadius: 50, justifyContent: "center", alignItems: "center" },
  welcomeTitle: { fontFamily: "DMSans_700Bold", fontSize: 26, textAlign: "center" as const },
  welcomeSubtext: {
    fontFamily: "DMSans_400Regular",
    fontSize: 15,
    textAlign: "center" as const,
    lineHeight: 22,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 4,
  },
  pageTitle: { fontFamily: "DMSans_600SemiBold", fontSize: 18 },
  progressBar: { height: 6, borderRadius: 3 },
  progressFill: { height: 6, borderRadius: 3, minWidth: 4 },
  daySelector: { flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 8 },
  dayDot: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  dayDotText: { fontFamily: "DMSans_600SemiBold", fontSize: 14 },
  encourageCard: {
    borderRadius: 14,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  encourageText: { fontFamily: "DMSans_400Regular", fontSize: 13, flex: 1 },
  missionCard: {
    borderRadius: 20,
    padding: 20,
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  missionTitle: { fontFamily: "DMSans_600SemiBold", fontSize: 16 },
  missionProgress: { fontFamily: "DMSans_400Regular", fontSize: 13 },
  stepList: { gap: 8 },
  stepRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  stepCheckbox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    justifyContent: "center",
    alignItems: "center",
  },
  stepLabel: { fontFamily: "DMSans_500Medium", fontSize: 14, flex: 1 },
  diffCard: { borderRadius: 16, padding: 16, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  diffLabel: { fontFamily: "DMSans_400Regular", fontSize: 13 },
  diffValue: { fontFamily: "DMSans_600SemiBold", fontSize: 14 },
});
