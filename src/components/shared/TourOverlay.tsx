import React, { useState } from "react";
import { StyleSheet, View, Text, Pressable, Dimensions } from "react-native";
import Animated, { FadeIn, FadeOut, SlideInUp } from "react-native-reanimated";
import { Feather } from "@expo/vector-icons";
import { useDemoMode } from "@/src/context/DemoModeProvider";
import type { ThemeColors } from "@packages/theme";
import { soundManager } from "@/src/services/SoundManager";

const { width, height } = Dimensions.get("window");

interface TourStep {
  title: string;
  description: string;
  icon: string;
}

const TOUR_STEPS: TourStep[] = [
  {
    title: "Bem-vindo ao DOMUS!",
    description: "Sua nova jornada para a liberdade financeira começa aqui. Vamos conhecer os comandos principais?",
    icon: "award",
  },
  {
    title: "O Poder do 50/30/20",
    description: "Dividimos seus gastos automaticamente entre Essencial, Estilo de Vida e Futuro. A IA te ajuda a manter o equilíbrio.",
    icon: "pie-chart",
  },
  {
    title: "Registro Ultra-Rápido",
    description: "No botão '+' você registra gastos manualmente ou via QR Code. Cada registro te dá XP para subir de nível!",
    icon: "plus-circle",
  },
  {
    title: "Sandbox Ativado",
    description: "Tudo o que você fizer agora é apenas um teste. Seus dados reais estão seguros e nada será salvo ao sair do tour.",
    icon: "shield",
  },
];

export function TourOverlay({ theme }: { theme: ThemeColors }) {
  const { isDemoActive, stopDemo } = useDemoMode();
  const [currentStep, setCurrentStep] = useState(0);

  if (!isDemoActive) return null;

  const step = TOUR_STEPS[currentStep];

  const handleNext = () => {
    soundManager.play("tap");
    if (currentStep < TOUR_STEPS.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      stopDemo();
      soundManager.play("success");
    }
  };

  return (
    <Animated.View entering={FadeIn} exiting={FadeOut} style={s.container}>
      <View style={s.backdrop} />
      
      <Animated.View 
        entering={SlideInUp.springify().damping(15)} 
        style={[s.card, { backgroundColor: theme.cardBackground }]}
      >
        <View style={[s.iconCircle, { backgroundColor: `${theme.primaryColor}15` }]}>
          <Feather name={step.icon as any} size={32} color={theme.primaryColor} />
        </View>
        
        <Text style={[s.title, { color: theme.textColor }]}>{step.title}</Text>
        <Text style={[s.desc, { color: theme.secondaryText }]}>{step.description}</Text>
        
        <View style={s.footer}>
          <Text style={[s.progress, { color: theme.secondaryText }]}>
            {currentStep + 1} de {TOUR_STEPS.length}
          </Text>
          
          <Pressable 
            onPress={handleNext}
            style={[s.button, { backgroundColor: theme.primaryColor }]}
          >
            <Text style={s.buttonText}>
              {currentStep === TOUR_STEPS.length - 1 ? "Começar Agora!" : "Próximo"}
            </Text>
            <Feather name="arrow-right" size={16} color="#FFF" />
          </Pressable>
        </View>

        <Pressable onPress={stopDemo} style={s.skipBtn}>
          <Text style={[s.skipText, { color: theme.secondaryText }]}>Pular tour</Text>
        </Pressable>
      </Animated.View>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 10000,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.7)",
  },
  card: {
    width: "100%",
    borderRadius: 24,
    padding: 24,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  title: {
    fontFamily: "DMSans_700Bold",
    fontSize: 22,
    textAlign: "center",
    marginBottom: 12,
  },
  desc: {
    fontFamily: "DMSans_400Regular",
    fontSize: 16,
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 32,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
  },
  progress: {
    fontFamily: "DMSans_500Medium",
    fontSize: 14,
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  buttonText: {
    fontFamily: "DMSans_700Bold",
    fontSize: 16,
    color: "#FFF",
  },
  skipBtn: {
    marginTop: 24,
    padding: 8,
  },
  skipText: {
    fontFamily: "DMSans_500Medium",
    fontSize: 14,
    textDecorationLine: "underline",
  },
});
