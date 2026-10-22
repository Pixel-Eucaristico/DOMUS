export interface LevelInfo {
  level: number;
  currentXp: number;
  xpForCurrentLevel: number;
  xpForNextLevel: number;
  progress: number;
}

function xpRequiredForLevel(level: number): number {
  return Math.floor(100 * Math.pow(1.5, level - 1));
}

/** XP não finito (NaN/Infinity) ou negativo vira 0 — evita laço infinito no cálculo de nível. */
function sanitizeXp(totalXp: number): number {
  return typeof totalXp === "number" && Number.isFinite(totalXp) && totalXp > 0 ? totalXp : 0;
}

export function calculateLevel(rawTotalXp: number): number {
  const totalXp = sanitizeXp(rawTotalXp);
  let level = 1;
  let accumulated = 0;

  while (true) {
    const required = xpRequiredForLevel(level);
    if (accumulated + required > totalXp) break;
    accumulated += required;
    level++;
  }

  return level;
}

export function getLevelInfo(rawTotalXp: number): LevelInfo {
  const totalXp = sanitizeXp(rawTotalXp);
  let level = 1;
  let accumulated = 0;

  while (true) {
    const required = xpRequiredForLevel(level);
    if (accumulated + required > totalXp) {
      return {
        level,
        currentXp: totalXp - accumulated,
        xpForCurrentLevel: accumulated,
        xpForNextLevel: required,
        progress: (totalXp - accumulated) / required,
      };
    }
    accumulated += required;
    level++;
  }
}

export function shouldLevelUp(
  previousXp: number,
  newXp: number,
): { leveledUp: boolean; previousLevel: number; newLevel: number } {
  const previousLevel = calculateLevel(previousXp);
  const newLevel = calculateLevel(newXp);

  return {
    leveledUp: newLevel > previousLevel,
    previousLevel,
    newLevel,
  };
}

export function getXpForLevel(level: number): number {
  return xpRequiredForLevel(level);
}
