export interface LevelInfo {
  level: number;
  currentXp: number;
  xpForCurrentLevel: number;
  xpForNextLevel: number;
  progress: number;
}

/**
 * Progressão suave e sustentável:
 * - Níveis 1 a 5: 100 XP por nível (500 XP total para chegar ao nível 5)
 * - Níveis 6 a 10: 150 XP por nível (750 XP adicional para chegar ao nível 10)
 * - Níveis 11 a 20: 200 XP por nível (2000 XP adicional para chegar ao nível 20)
 * - Níveis 21 a 50: 300 XP por nível (9000 XP adicional para chegar ao nível 50)
 * - Nível 51+: 500 XP por nível
 */
function xpRequiredForLevel(level: number): number {
  if (level <= 5) return 100;
  if (level <= 10) return 150;
  if (level <= 20) return 200;
  if (level <= 50) return 300;
  return 500;
}

export function calculateLevel(totalXp: number): number {
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

export function getLevelInfo(totalXp: number): LevelInfo {
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
