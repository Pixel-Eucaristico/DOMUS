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
