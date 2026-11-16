export const HOME_HEADER_METRICS = {
  horizontalPadding: 16,
  buttonSize: 40,
  actionsGap: 6,
  actionCount: 4,
  brandActionsGap: 8,
} as const;

export interface HomeHeaderFit {
  actionsWidth: number;
  totalReservedWidth: number;
  availableBrandWidth: number;
}

/**
 * Computes horizontal space reserved by the Home header action buttons and
 * padding, returning the remaining width available for the brand block.
 */
export function computeHomeHeaderFit(screenWidth: number): HomeHeaderFit {
  const { horizontalPadding, buttonSize, actionsGap, actionCount, brandActionsGap } =
    HOME_HEADER_METRICS;

  const safeWidth = Number.isFinite(screenWidth) ? Math.max(0, screenWidth) : 0;
  const actionsWidth = actionCount * buttonSize + Math.max(0, actionCount - 1) * actionsGap;
  const totalReservedWidth = horizontalPadding * 2 + actionsWidth + brandActionsGap;
  const availableBrandWidth = Math.max(0, safeWidth - totalReservedWidth);

  return {
    actionsWidth,
    totalReservedWidth,
    availableBrandWidth,
  };
}
