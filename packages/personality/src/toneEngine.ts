import { ARCHETYPES, type ArchetypeType, type ToneOutput } from "./types";

export function getTone(archetype: ArchetypeType): ToneOutput {
  const toneMap: Record<ArchetypeType, ToneOutput> = {
    [ARCHETYPES.EXPLORER]: {
      style: "motivational",
      messageTemplate: "Continue explorando! Cada registro te aproxima do controle financeiro. 🚀",
    },
    [ARCHETYPES.ORGANIZER]: {
      style: "motivational",
      messageTemplate: "Ótimo trabalho mantendo tudo organizado! Sua disciplina está fazendo a diferença. 💪",
    },
    [ARCHETYPES.PLANNER]: {
      style: "technical",
      messageTemplate: "Seu planejamento mensal está no caminho certo. Analise os dados e ajuste sua estratégia.",
    },
    [ARCHETYPES.STRATEGIST]: {
      style: "technical",
      messageTemplate: "Seus indicadores mostram evolução consistente. Revise suas metas e otimize seus resultados.",
    },
    [ARCHETYPES.INVESTOR]: {
      style: "strategic",
      messageTemplate: "Sua visão financeira é sólida. Considere diversificar e planejar seus próximos investimentos.",
    },
    [ARCHETYPES.INDEPENDENT]: {
      style: "strategic",
      messageTemplate: "Você alcançou a independência financeira comportamental. Mantenha o padrão e inspire outros.",
    },
  };

  return toneMap[archetype];
}
