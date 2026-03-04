import React, { useState, useEffect } from "react";
import { StyleSheet, View, Text, Pressable, ScrollView } from "react-native";
import Animated, { FadeIn, FadeOut, FadeInDown } from "react-native-reanimated";
import { Feather } from "@expo/vector-icons";
import { useDemoMode } from "@/src/context/DemoModeProvider";
import type { ThemeColors } from "@packages/theme";
import { soundManager } from "@/src/services/SoundManager";

interface TourStep {
  tag: string;
  title: string;
  description: string;
  icon: string;
}

const TOUR_STEPS: TourStep[] = [
  {
    tag: "Boas-vindas",
    title: "Bem-vindo ao DOMUS!",
    description:
      "Tudo o que você fizer agora é apenas um teste — ambiente sandbox seguro. " +
      "Seus dados reais estão protegidos e nada será salvo ao encerrar o tour.",
    icon: "award",
  },
  {
    tag: "Aba: Início",
    title: "Dashboard & Saldo Total",
    description:
      "A tela inicial exibe seu saldo consolidado de todas as contas, " +
      "evolução mensal e resumo das finanças do mês atual.",
    icon: "home",
  },
  {
    tag: "Aba: Início",
    title: "Regra 50 / 30 / 20",
    description:
      "Suas despesas são classificadas automaticamente: 50% Essencial (moradia, saúde), " +
      "30% Estilo de Vida (lazer, vestuário) e 20% Futuro (investimentos, poupança).",
    icon: "pie-chart",
  },
  {
    tag: "Aba: Contas",
    title: "Contas & Cartões",
    description:
      "Cadastre carteiras, contas bancárias, cartões de crédito e contas poupança. " +
      "Cada conta tem cor, limite e saldo atualizados automaticamente a cada transação.",
    icon: "credit-card",
  },
  {
    tag: "Função: Transação",
    title: "Registrar Transação",
    description:
      "Toque em '+' para lançar receita, despesa ou transferência. " +
      "Defina categoria, status (pendente/confirmado), recorrência e até parcelas.",
    icon: "plus-circle",
  },
  {
    tag: "Função: Importação",
    title: "Importar Nota Fiscal",
    description:
      "Escaneie o QR Code da NF-e com a câmera, fotografe via OCR (múltiplas fotos) " +
      "ou digite a chave de acesso. O DOMUS preenche tudo automaticamente.",
    icon: "camera",
  },
  {
    tag: "Função: Dízimo",
    title: "Calculadora de Dízimo",
    description:
      "Ao selecionar «Dízimo / Oferta» como categoria, um painel aparece para calcular " +
      "o percentual sobre a renda bruta ou líquida. O valor é preenchido automaticamente.",
    icon: "percent",
  },
  {
    tag: "Aba: Desejos",
    title: "Lista de Desejos",
    description:
      "Organize compras futuras em listas com prioridades (Urgente → Baixa). " +
      "Arraste para reordenar, vincule links da Amazon / Mercado Livre e veja links de afiliado.",
    icon: "heart",
  },
  {
    tag: "Função: Poupança",
    title: "Objetivo de Poupança",
    description:
      "Vincule uma conta poupança a itens da lista de desejos. " +
      "O saldo vira barra de progresso no item — você vê exatamente quanto falta.",
    icon: "target",
  },
  {
    tag: "Aba: Temporada",
    title: "Conquistas & XP",
    description:
      "Cada transação gera XP e mantém sua sequência diária (streak). " +
      "Suba de nível e desbloqueie 8 conquistas: Prata, Ouro e Diamante.",
    icon: "star",
  },
  {
    tag: "Aba: Temporada",
    title: "Troféu do Mês",
    description:
      "Todo mês um troféu único é sorteado — secular ou litúrgico (para usuários católicos). " +
      "Repetindo em anos seguintes, o nível sobe: Bronze, Prata e Ouro.",
    icon: "gift",
  },
  {
    tag: "Recurso: IA",
    title: "Assistente Financeiro IA",
    description:
      "Converse com o assistente de IA sobre suas finanças. Ele analisa seu histórico, " +
      "sugere metas e responde dúvidas com base nos seus dados reais.",
    icon: "cpu",
  },
  {
    tag: "Recurso: Segurança",
    title: "Bloqueio por PIN ou Biometria",
    description:
      "Ative a tela de bloqueio em Configurações → Segurança. " +
      "O app trava ao ir para segundo plano e exige PIN ou digital para entrar.",
    icon: "lock",
  },
  {
    tag: "Recurso: Backup",
    title: "Backup Criptografado",
    description:
      "Exporte todos os dados em um arquivo .domusbackup protegido por senha (AES-256). " +
      "Restaure em qualquer dispositivo — nenhum dado vai para a nuvem.",
    icon: "database",
  },
  {
    tag: "Recurso: Sync",
    title: "Sincronização Multi-Dispositivo",
    description:
      "Compartilhe sua base de eventos com outros dispositivos via Sync. " +
      "A arquitetura Event Sourcing garante que nenhum dado seja sobrescrito — tudo é mesclado.",
    icon: "refresh-cw",
  },
  {
    tag: "Pronto!",
    title: "Tudo Configurado!",
    description:
      "Você conheceu todas as funções do DOMUS. " +
      "Comece registrando sua primeira transação real — cada passo conta para sua liberdade financeira!",
    icon: "zap",
  },
];

const TOTAL = TOUR_STEPS.length;

export function TourOverlay({ theme }: { theme: ThemeColors }) {
  const { isDemoActive, stopDemo } = useDemoMode();
  const [currentStep, setCurrentStep] = useState(0);

  // Reseta para o passo 0 sempre que o tour for (re)ativado.
  useEffect(() => {
    if (isDemoActive) setCurrentStep(0);
  }, [isDemoActive]);

  if (!isDemoActive) return null;

  const step = TOUR_STEPS[currentStep]!;
  const isLast = currentStep === TOTAL - 1;
  const progress = (currentStep + 1) / TOTAL; // 0..1

  const handleNext = () => {
    soundManager.play("tap");
    if (!isLast) {
      setCurrentStep((prev) => prev + 1);
    } else {
      stopDemo();
      soundManager.play("success");
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      soundManager.play("tap");
      setCurrentStep((prev) => prev - 1);
    }
  };

  return (
    // Outer: full-screen. Backdrop cobrindo apenas a metade superior (app visível ao fundo).
    <Animated.View entering={FadeIn} exiting={FadeOut} style={s.container} pointerEvents="box-none">
      {/* Gradiente escurecendo do topo para baixo — app visível, mas com foco no card */}
      <View style={s.backdrop} pointerEvents="none" />

      {/* Card fixado na base da tela — bottom sheet */}
      <Animated.View
        key={currentStep}
        entering={FadeInDown.springify().damping(20).stiffness(200)}
        style={[s.card, { backgroundColor: theme.cardBackground }]}
      >
        {/* Handle bar decorativo */}
        <View style={[s.handle, { backgroundColor: `${theme.primaryColor}30` }]} />

        {/* Tag de categoria */}
        <View style={[s.tag, { backgroundColor: `${theme.primaryColor}15` }]}>
          <Text style={[s.tagText, { color: theme.primaryColor }]}>{step.tag}</Text>
        </View>

        {/* Linha: ícone + título */}
        <View style={s.header}>
          <View style={[s.iconCircle, { backgroundColor: `${theme.primaryColor}18` }]}>
            <Feather name={step.icon as any} size={22} color={theme.primaryColor} />
          </View>
          <Text style={[s.title, { color: theme.textColor }]}>{step.title}</Text>
        </View>

        {/* Descrição */}
        <ScrollView
          style={s.descScroll}
          showsVerticalScrollIndicator={false}
          scrollEnabled={false}
        >
          <Text style={[s.desc, { color: theme.secondaryText }]}>{step.description}</Text>
        </ScrollView>

        {/* Barra de progresso */}
        <View style={[s.progressTrack, { backgroundColor: `${theme.primaryColor}20` }]}>
          <Animated.View
            style={[
              s.progressFill,
              {
                backgroundColor: theme.primaryColor,
                width: `${Math.round(progress * 100)}%` as any,
              },
            ]}
          />
        </View>

        {/* Rodapé: Anterior / contador / Próximo */}
        <View style={s.footer}>
          <Pressable
            onPress={handlePrev}
            hitSlop={12}
            style={[s.navBtn, { opacity: currentStep === 0 ? 0.25 : 1 }]}
            disabled={currentStep === 0}
          >
            <Feather name="chevron-left" size={22} color={theme.secondaryText} />
          </Pressable>

          <Text style={[s.counter, { color: theme.secondaryText }]}>
            {currentStep + 1} de {TOTAL}
          </Text>

          <Pressable
            onPress={handleNext}
            style={[s.nextBtn, { backgroundColor: theme.primaryColor }]}
          >
            <Text style={s.nextText}>{isLast ? "Começar!" : "Próximo"}</Text>
            <Feather name={isLast ? "check" : "arrow-right"} size={15} color="#FFF" />
          </Pressable>
        </View>

        <Pressable onPress={stopDemo} hitSlop={12} style={s.skipBtn}>
          <Text style={[s.skipText, { color: theme.secondaryText }]}>Pular tour</Text>
        </Pressable>
      </Animated.View>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  // Cobre a tela toda mas com pointerEvents="box-none" — taps passam para o app acima do card
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9998,
    justifyContent: "flex-end",
  },
  // Sombra suave no topo para escurecer o app sem bloquear completamente a visão
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  // Card fixado na base — bottom sheet
  card: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 12,
    paddingHorizontal: 24,
    paddingBottom: 32,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 12,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    marginBottom: 16,
  },
  tag: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    marginBottom: 14,
  },
  tagText: {
    fontFamily: "DMSans_600SemiBold",
    fontSize: 11,
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    width: "100%",
    marginBottom: 12,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0,
  },
  title: {
    fontFamily: "DMSans_700Bold",
    fontSize: 18,
    flex: 1,
    flexWrap: "wrap",
  },
  descScroll: {
    width: "100%",
    marginBottom: 18,
    maxHeight: 68,
  },
  desc: {
    fontFamily: "DMSans_400Regular",
    fontSize: 14,
    lineHeight: 22,
  },
  progressTrack: {
    width: "100%",
    height: 4,
    borderRadius: 2,
    marginBottom: 20,
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
    width: "100%",
  },
  navBtn: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  counter: {
    fontFamily: "DMSans_500Medium",
    fontSize: 13,
  },
  nextBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 14,
    gap: 6,
  },
  nextText: {
    fontFamily: "DMSans_700Bold",
    fontSize: 14,
    color: "#FFF",
  },
  skipBtn: {
    marginTop: 14,
    padding: 6,
  },
  skipText: {
    fontFamily: "DMSans_400Regular",
    fontSize: 13,
    textDecorationLine: "underline",
  },
});
