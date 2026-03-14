/**
 * Tour page groups — define which steps belong to each page visit.
 *
 * Replaces the old step-by-step navigation with a per-page approach:
 * each page runs its own rn-tourguide TourGuideProvider, and when
 * that page's steps are done the global tour advances to the next group.
 *
 * Groups with only modal steps (no targetId) are handled by TourOverlay
 * via TourModalCard — no TourGuide runs on those pages.
 */

import { TOUR_STEPS, type TourStepDef } from "./tourStepConfig";

// Re-export for convenience
export type { TourStepDef };

export interface PageGroupDef {
  groupId: number;
  route: string;
  /** Steps shown as TourModalCard BEFORE the TourGuide starts on this page */
  modalsBefore: TourStepDef[];
  /** Steps with targetId — handled by rn-tourguide TourGuideZone */
  guideSteps: TourStepDef[];
  /** Steps shown as TourModalCard AFTER the TourGuide finishes on this page */
  modalsAfter: TourStepDef[];
}

export const PAGE_GROUPS: PageGroupDef[] = [
  {
    groupId: 0,
    route: "/(tabs)",
    modalsBefore: [TOUR_STEPS[0]],  // Boas-vindas
    guideSteps: [
      TOUR_STEPS[1],  // dashboard-balance
      TOUR_STEPS[2],  // budget-section
      TOUR_STEPS[4],  // fab-add
      TOUR_STEPS[12], // ai-chat-btn
      TOUR_STEPS[14], // dashboard-settings
      TOUR_STEPS[17], // sync-btn
    ],
    modalsAfter: [TOUR_STEPS[7]], // Dízimo
  },
  {
    groupId: 1,
    route: "/(tabs)/accounts",
    modalsBefore: [],
    guideSteps: [TOUR_STEPS[3]], // accounts-add
    modalsAfter: [],
  },
  {
    groupId: 2,
    route: "/import-invoice",
    modalsBefore: [],
    guideSteps: [
      TOUR_STEPS[5], // import-qr
      TOUR_STEPS[6], // import-manual
    ],
    modalsAfter: [],
  },
  {
    groupId: 3,
    route: "/(tabs)/wishlist",
    modalsBefore: [],
    guideSteps: [
      TOUR_STEPS[8], // wishlist-header
      TOUR_STEPS[9], // wishlist-add
    ],
    modalsAfter: [],
  },
  {
    groupId: 4,
    route: "/(tabs)/season",
    modalsBefore: [],
    guideSteps: [
      TOUR_STEPS[10], // xp-section
      TOUR_STEPS[11], // trophy-section
    ],
    modalsAfter: [],
  },
  {
    groupId: 5,
    route: "/ai-chat",
    modalsBefore: [],
    guideSteps: [TOUR_STEPS[13]], // ai-config-btn
    modalsAfter: [],
  },
  {
    groupId: 6,
    route: "/about",
    modalsBefore: [],
    guideSteps: [
      TOUR_STEPS[15], // notifications-btn
      TOUR_STEPS[16], // security-btn
    ],
    modalsAfter: [],
  },
  {
    groupId: 7,
    route: "/sync",
    modalsBefore: [],
    guideSteps: [
      TOUR_STEPS[18], // sync-actions
      TOUR_STEPS[19], // sync-backup-link
    ],
    modalsAfter: [],
  },
  {
    groupId: 8,
    route: "/backup",
    modalsBefore: [],
    guideSteps: [],
    modalsAfter: [TOUR_STEPS[20]], // Backup Criptografado
  },
  {
    groupId: 9,
    route: "/(tabs)/accounts",
    modalsBefore: [],
    guideSteps: [],
    modalsAfter: [TOUR_STEPS[21]], // Tudo Configurado!
  },
];

export const TOTAL_PAGE_GROUPS = PAGE_GROUPS.length;

/** Total steps across ALL groups (for global progress bar) */
export const GRAND_TOTAL_STEPS = PAGE_GROUPS.reduce(
  (sum, g) => sum + g.modalsBefore.length + g.guideSteps.length + g.modalsAfter.length,
  0,
);

/**
 * Compute the 0-based global step index for a given group + phase + local index.
 * phase: "pre" | "guide" | "post"
 */
export function globalStepIndex(
  groupId: number,
  phase: "pre" | "guide" | "post",
  localIndex: number,
): number {
  let idx = 0;
  for (let g = 0; g < groupId; g++) {
    const gr = PAGE_GROUPS[g];
    idx += gr.modalsBefore.length + gr.guideSteps.length + gr.modalsAfter.length;
  }
  const group = PAGE_GROUPS[groupId];
  if (phase === "pre") return idx + localIndex;
  if (phase === "guide") return idx + group.modalsBefore.length + localIndex;
  return idx + group.modalsBefore.length + group.guideSteps.length + localIndex;
}

/** Build a map from targetId → PageGroupDef for fast lookup */
export const TARGET_TO_GROUP: Record<string, { groupId: number; zoneOrder: number }> =
  Object.fromEntries(
    PAGE_GROUPS.flatMap((g) =>
      g.guideSteps.map((step, i) => [step.targetId!, { groupId: g.groupId, zoneOrder: i + 1 }]),
    ),
  );
