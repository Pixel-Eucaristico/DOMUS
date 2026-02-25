import { ARCHETYPES, type ArchetypeScores, type ArchetypeType } from "./types";
import { detectArchetype } from "./profileDetector";

export function shouldEvolve(current: ArchetypeType, scores: ArchetypeScores): boolean {
  return detectArchetype(scores) !== current;
}

export function evolveArchetype(
  current: ArchetypeType,
  scores: ArchetypeScores,
): { newArchetype: ArchetypeType; reason: string } {
  const newArchetype = detectArchetype(scores);
  const descriptions: Record<ArchetypeType, string> = {
    [ARCHETYPES.EXPLORER]: "Você está começando sua jornada financeira",
    [ARCHETYPES.ORGANIZER]: "Você demonstrou consistência e controle orçamentário",
    [ARCHETYPES.PLANNER]: "Seu planejamento mensal está evoluindo",
    [ARCHETYPES.STRATEGIST]: "Você domina planejamento e controle de desejos",
    [ARCHETYPES.INVESTOR]: "Sua aderência ao orçamento e planejamento são exemplares",
    [ARCHETYPES.INDEPENDENT]: "Você atingiu excelência em todas as dimensões financeiras",
  };

  return {
    newArchetype,
    reason: descriptions[newArchetype],
  };
}

export function getArchetypeDescription(
  archetype: ArchetypeType,
): { name: string; description: string } {
  const map: Record<ArchetypeType, { name: string; description: string }> = {
    [ARCHETYPES.EXPLORER]: {
      name: "Explorador",
      description: "Está descobrindo o mundo das finanças pessoais. Cada passo é uma nova aventura!",
    },
    [ARCHETYPES.ORGANIZER]: {
      name: "Organizador",
      description: "Mantém suas finanças em ordem com consistência e disciplina orçamentária.",
    },
    [ARCHETYPES.PLANNER]: {
      name: "Planejador",
      description: "Planeja seus meses com antecedência e mantém o foco nos objetivos.",
    },
    [ARCHETYPES.STRATEGIST]: {
      name: "Estrategista",
      description: "Combina planejamento avançado com controle emocional sobre gastos.",
    },
    [ARCHETYPES.INVESTOR]: {
      name: "Investidor",
      description: "Domina o orçamento e planeja o futuro com maestria financeira.",
    },
    [ARCHETYPES.INDEPENDENT]: {
      name: "Independente",
      description: "Alcançou a maestria financeira em todas as dimensões. Referência de disciplina!",
    },
  };

  return map[archetype];
}
