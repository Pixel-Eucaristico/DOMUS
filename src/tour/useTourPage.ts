/**
 * useTourPage — hook for pages that participate in the guided tour.
 *
 * Each page calls this with its groupId. When that group becomes active
 * and the phase is "guide", the page should start its TourGuideProvider.
 * When TourGuide finishes (last step's Next clicked), call onGuideFinish().
 */

import { useDemoMode } from "@/src/context/DemoModeProvider";
import { PAGE_GROUPS, GRAND_TOTAL_STEPS, globalStepIndex } from "./tourPageGroups";
import type { TourStepDef } from "./tourStepConfig";

export interface UseTourPageResult {
  /** True when this group's guide phase is active (TourGuide should run) */
  isGuideActive: boolean;
  /** True when there's a modal step to show (pre or post phase) */
  isModalActive: boolean;
  /** The guide steps for this page (in zone order 1, 2, 3...) */
  guideSteps: TourStepDef[];
  /** The current modal step to show (when isModalActive is true) */
  activeModalStep: TourStepDef | null;
  /** Global 0-based index for the current modal step (for progress display) */
  activeModalStepIndex: number;
  /** The global progress (0–1) for the current guide step */
  globalProgressForZone: (zoneOrder: number) => number;
  /** Global step number (1-based) for display in tooltip */
  globalStepNumberForZone: (zoneOrder: number) => number;
  /** Total steps across all groups (for progress display) */
  grandTotal: number;
  /** Called by TourTooltip's last-step "Next" or skip button */
  onGuideFinish: () => void;
  /** Called by TourModalCard's "Next" button */
  onModalNext: () => void;
  /** Called by any skip action */
  onSkip: () => void;
  /** Called when user clicks minimize */
  onMinimize: (currentGuideStep?: number) => void;
}

export function useTourPage(groupId: number): UseTourPageResult {
  const {
    isDemoActive,
    isTourMinimized,
    currentPageGroup,
    groupPhase,
    groupModalIndex,
    activeModalStep,
    nextGroupPhase,
    nextPageGroup,
    stopDemo,
    setTourMinimized,
  } = useDemoMode();

  const group = PAGE_GROUPS[groupId];
  const isMyGroup = isDemoActive && !isTourMinimized && currentPageGroup === groupId;
  const isGuideActive = isMyGroup && groupPhase === "guide";
  const isModalActive = isMyGroup && (groupPhase === "pre" || groupPhase === "post");

  const activeModalStepIndex = isModalActive
    ? globalStepIndex(groupId, groupPhase as "pre" | "post", groupModalIndex)
    : 0;

  const globalProgressForZone = (zoneOrder: number): number => {
    const idx = globalStepIndex(groupId, "guide", zoneOrder - 1);
    return (idx + 1) / GRAND_TOTAL_STEPS;
  };

  const globalStepNumberForZone = (zoneOrder: number): number => {
    return globalStepIndex(groupId, "guide", zoneOrder - 1) + 1;
  };

  return {
    isGuideActive,
    isModalActive,
    guideSteps: group?.guideSteps ?? [],
    activeModalStep: isModalActive ? activeModalStep : null,
    activeModalStepIndex,
    globalProgressForZone,
    globalStepNumberForZone,
    grandTotal: GRAND_TOTAL_STEPS,
    onGuideFinish: nextPageGroup,
    onModalNext: nextGroupPhase,
    onSkip: stopDemo,
    onMinimize: (currentGuideStep?: number) => setTourMinimized(true, currentGuideStep),
  };
}
