// Re-export engine (types, helpers, selection logic)
export type { SeasonalTier, SeasonalTrophyProgress, SeasonalTrophy } from "./trophyEngine";
export {
  getSeasonalXp,
  getTierLabel,
  getTierColor,
  pickSeasonalTrophy,
  getSeasonalTier,
} from "./trophyEngine";

// Re-export data
export { ALL_SEASONAL_TROPHIES } from "./trophyData";
