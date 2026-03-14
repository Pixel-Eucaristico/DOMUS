import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useMemo,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { SyncEvent } from "@packages/storage/src/eventStore";
import { DEMO_SEED_EVENTS } from "@/src/constants/mockDemoEvents";
import { PAGE_GROUPS, TOTAL_PAGE_GROUPS } from "@/src/tour/tourPageGroups";
import type { TourStepDef } from "@/src/tour/tourStepConfig";

const TOUR_SHOWN_KEY = "domus_tour_shown_v1";
const TOUR_GROUP_KEY = "domus_tour_group_v2";
const TOUR_PHASE_KEY = "domus_tour_phase_v2";
const TOUR_MODAL_KEY = "domus_tour_modal_v2";
const TOUR_MIN_KEY = "domus_tour_minimized_v1";
const WELCOME_KEY = "domus_welcome_done_v1";

export type GroupPhase = "pre" | "guide" | "post";

interface DemoModeContextValue {
  isDemoActive: boolean;
  startDemo: () => void;
  stopDemo: () => void;
  demoEvents: SyncEvent[];
  dispatchDemoEvent: (event: { id: string; type: string; payload?: object; timestamp: number }) => void;

  /** Current page group index (0 – TOTAL_PAGE_GROUPS-1) */
  currentPageGroup: number;
  /** Phase within the current group */
  groupPhase: GroupPhase;
  /** Which modal within pre/post phase is active (0-based) */
  groupModalIndex: number;
  /**
   * The TourStepDef currently active for TourModalCard rendering.
   * Null when groupPhase === 'guide'.
   */
  activeModalStep: TourStepDef | null;

  /**
   * Advance to the next modal within the current phase, or to the next phase.
   * Called by TourModalCard's "Next" button.
   */
  nextGroupPhase: () => void;

  /**
   * Called by TourTooltip's last-step "Next" button (when TourGuide finishes).
   * Advances from 'guide' phase to 'post' (if any) or to the next group.
   */
  nextPageGroup: () => void;

  /**
   * Called by TourTooltip's first-step "Prev" button.
   * Goes back to the previous group's last guide step.
   */
  prevPageGroup: () => void;

  isTourMinimized: boolean;
  /** Zone order to resume from when restoring after minimize (1-based) */
  minimizedAtGuideStep: number | null;
  setTourMinimized: (minimized: boolean, guideStep?: number) => void;

  showWelcomeCarousel: boolean;
  completeWelcomeCarousel: () => void;
  restartWithCarousel: () => void;
}

const DemoModeContext = createContext<DemoModeContextValue | null>(null);

export function DemoModeProvider({ children }: { children: React.ReactNode }) {
  const [isDemoActive, setIsDemoActive] = useState(false);
  const [demoEvents, setDemoEvents] = useState<SyncEvent[]>([]);
  const [currentPageGroup, setCurrentPageGroup] = useState(0);
  const [groupPhase, setGroupPhase] = useState<GroupPhase>("pre");
  const [groupModalIndex, setGroupModalIndex] = useState(0);
  const [isTourMinimized, setTourMinimizedState] = useState(false);
  const [minimizedAtGuideStep, setMinimizedAtGuideStep] = useState<number | null>(null);
  const [showWelcomeCarousel, setShowWelcomeCarousel] = useState(false);

  // ─── Computed: current step for modal display ───────────────────────────────
  const activeModalStep = useMemo<TourStepDef | null>(() => {
    if (!isDemoActive || isTourMinimized) return null;
    const group = PAGE_GROUPS[currentPageGroup];
    if (!group) return null;
    if (groupPhase === "pre") return group.modalsBefore[groupModalIndex] ?? null;
    if (groupPhase === "post") return group.modalsAfter[groupModalIndex] ?? null;
    return null;
  }, [isDemoActive, isTourMinimized, currentPageGroup, groupPhase, groupModalIndex]);

  // ─── Helpers to persist state ────────────────────────────────────────────────
  const persist = useCallback((group: number, phase: GroupPhase, modalIdx: number) => {
    AsyncStorage.multiSet([
      [TOUR_GROUP_KEY, String(group)],
      [TOUR_PHASE_KEY, phase],
      [TOUR_MODAL_KEY, String(modalIdx)],
    ]).catch(() => {});
  }, []);

  // ─── Enter first non-empty phase for a group ─────────────────────────────────
  const enterGroup = useCallback(
    (groupId: number) => {
      const group = PAGE_GROUPS[groupId];
      if (!group) return;
      // Skip groups with no steps at all
      const isEmpty =
        group.modalsBefore.length === 0 &&
        group.guideSteps.length === 0 &&
        group.modalsAfter.length === 0;
      if (isEmpty) {
        const next = groupId + 1;
        if (next < TOTAL_PAGE_GROUPS) {
          enterGroup(next);
        } else {
          stopDemoInternal();
        }
        return;
      }
      let phase: GroupPhase = "pre";
      let modalIdx = 0;
      if (group.modalsBefore.length === 0) {
        if (group.guideSteps.length === 0) {
          // Only post modals
          phase = "post";
        } else {
          phase = "guide";
        }
      }
      setCurrentPageGroup(groupId);
      setGroupPhase(phase);
      setGroupModalIndex(modalIdx);
      persist(groupId, phase, modalIdx);
    },
    [persist],
  );

  // ─── nextGroupPhase: advance modal or phase ──────────────────────────────────
  const nextGroupPhase = useCallback(() => {
    const group = PAGE_GROUPS[currentPageGroup];
    if (!group) return;

    if (groupPhase === "pre") {
      const nextModalIdx = groupModalIndex + 1;
      if (nextModalIdx < group.modalsBefore.length) {
        setGroupModalIndex(nextModalIdx);
        persist(currentPageGroup, "pre", nextModalIdx);
        return;
      }
      // Advance to guide or post
      if (group.guideSteps.length > 0) {
        setGroupPhase("guide");
        setGroupModalIndex(0);
        persist(currentPageGroup, "guide", 0);
      } else if (group.modalsAfter.length > 0) {
        setGroupPhase("post");
        setGroupModalIndex(0);
        persist(currentPageGroup, "post", 0);
      } else {
        // Empty group — advance to next
        const nextGroup = currentPageGroup + 1;
        if (nextGroup < TOTAL_PAGE_GROUPS) {
          enterGroup(nextGroup);
        } else {
          stopDemoInternal();
        }
      }
      return;
    }

    if (groupPhase === "post") {
      const nextModalIdx = groupModalIndex + 1;
      if (nextModalIdx < group.modalsAfter.length) {
        setGroupModalIndex(nextModalIdx);
        persist(currentPageGroup, "post", nextModalIdx);
        return;
      }
      // Done with this group
      const nextGroup = currentPageGroup + 1;
      if (nextGroup < TOTAL_PAGE_GROUPS) {
        enterGroup(nextGroup);
      } else {
        stopDemoInternal();
      }
    }
  }, [currentPageGroup, groupPhase, groupModalIndex, enterGroup, persist]);

  // ─── prevPageGroup: called by TourGuide's first step prev button ─────────────
  const prevPageGroup = useCallback(() => {
    let prevGroup = currentPageGroup - 1;
    while (prevGroup >= 0) {
      const g = PAGE_GROUPS[prevGroup];
      if (g && g.guideSteps.length > 0) break;
      prevGroup--;
    }
    if (prevGroup < 0) return;
    const group = PAGE_GROUPS[prevGroup];
    const lastStepOrder = group.guideSteps.length;
    setCurrentPageGroup(prevGroup);
    setGroupPhase("guide");
    setGroupModalIndex(0);
    setMinimizedAtGuideStep(lastStepOrder);
    persist(prevGroup, "guide", 0);
  }, [currentPageGroup, persist]);

  // ─── nextPageGroup: called by TourGuide's last step ──────────────────────────
  const nextPageGroup = useCallback(() => {
    const group = PAGE_GROUPS[currentPageGroup];
    if (!group) return;

    if (group.modalsAfter.length > 0) {
      setGroupPhase("post");
      setGroupModalIndex(0);
      persist(currentPageGroup, "post", 0);
    } else {
      const nextGroup = currentPageGroup + 1;
      if (nextGroup < TOTAL_PAGE_GROUPS) {
        enterGroup(nextGroup);
      } else {
        stopDemoInternal();
      }
    }
  }, [currentPageGroup, enterGroup, persist]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  function stopDemoInternal() {
    setIsDemoActive(false);
    setDemoEvents([]);
    setTourMinimizedState(false);
    setMinimizedAtGuideStep(null);
    AsyncStorage.multiRemove([TOUR_GROUP_KEY, TOUR_PHASE_KEY, TOUR_MODAL_KEY, TOUR_MIN_KEY]).catch(() => {});
  }

  const startDemo = useCallback(() => {
    setDemoEvents(DEMO_SEED_EVENTS);
    setIsDemoActive(true);
    setTourMinimizedState(false);
    setMinimizedAtGuideStep(null);
    enterGroup(0);
    AsyncStorage.setItem(TOUR_MIN_KEY, "0").catch(() => {});
  }, [enterGroup]);

  const stopDemo = useCallback(() => {
    stopDemoInternal();
  }, []);

  const setTourMinimized = useCallback((minimized: boolean, guideStep?: number) => {
    setTourMinimizedState(minimized);
    if (minimized) {
      setMinimizedAtGuideStep(guideStep ?? null);
    } else {
      setMinimizedAtGuideStep(null);
    }
    AsyncStorage.setItem(TOUR_MIN_KEY, minimized ? "1" : "0").catch(() => {});
  }, []);

  const completeWelcomeCarousel = useCallback(() => {
    AsyncStorage.setItem(WELCOME_KEY, "done").catch(() => {});
    AsyncStorage.setItem(TOUR_SHOWN_KEY, "shown").catch(() => {});
    setShowWelcomeCarousel(false);
  }, []);

  const restartWithCarousel = useCallback(() => {
    stopDemoInternal();
    AsyncStorage.multiRemove([WELCOME_KEY, TOUR_SHOWN_KEY]).catch(() => {});
    setShowWelcomeCarousel(true);
  }, []);

  const dispatchDemoEvent = useCallback(
    (event: { id: string; type: string; payload?: object; timestamp: number }) => {
      const syncEvt: SyncEvent = {
        id: event.id,
        type: event.type,
        payload: event.payload ?? {},
        timestamp: event.timestamp,
        deviceId: "demo",
        signature: "",
      };
      setDemoEvents((prev) => [...prev, syncEvt]);
    },
    [],
  );

  // ─── Restore from AsyncStorage ────────────────────────────────────────────────
  useEffect(() => {
    Promise.all([
      AsyncStorage.getItem(TOUR_SHOWN_KEY),
      AsyncStorage.getItem(TOUR_GROUP_KEY),
      AsyncStorage.getItem(TOUR_PHASE_KEY),
      AsyncStorage.getItem(TOUR_MODAL_KEY),
      AsyncStorage.getItem(TOUR_MIN_KEY),
      AsyncStorage.getItem(WELCOME_KEY),
    ]).then(([shown, savedGroup, savedPhase, savedModal, savedMin, welcomeDone]) => {
      if (shown === null) {
        if (welcomeDone === null) {
          setShowWelcomeCarousel(true);
        } else {
          AsyncStorage.setItem(TOUR_SHOWN_KEY, "shown").catch(() => {});
          startDemo();
        }
      } else if (savedGroup !== null) {
        const group = parseInt(savedGroup, 10);
        const phase = (savedPhase as GroupPhase) ?? "pre";
        const modalIdx = parseInt(savedModal ?? "0", 10);
        if (!isNaN(group) && group >= 0 && group < TOTAL_PAGE_GROUPS) {
          setCurrentPageGroup(group);
          setGroupPhase(phase);
          setGroupModalIndex(isNaN(modalIdx) ? 0 : modalIdx);
          setDemoEvents(DEMO_SEED_EVENTS);
          setIsDemoActive(true);
          if (savedMin === "1") setTourMinimizedState(true);
        }
      }
    });
  }, [startDemo]);

  const value = useMemo(
    () => ({
      isDemoActive,
      startDemo,
      stopDemo,
      demoEvents,
      dispatchDemoEvent,
      currentPageGroup,
      groupPhase,
      groupModalIndex,
      activeModalStep,
      nextGroupPhase,
      nextPageGroup,
      prevPageGroup,
      isTourMinimized,
      minimizedAtGuideStep,
      setTourMinimized,
      showWelcomeCarousel,
      completeWelcomeCarousel,
      restartWithCarousel,
    }),
    [
      isDemoActive, startDemo, stopDemo, demoEvents, dispatchDemoEvent,
      currentPageGroup, groupPhase, groupModalIndex, activeModalStep,
      nextGroupPhase, nextPageGroup, prevPageGroup,
      isTourMinimized, minimizedAtGuideStep, setTourMinimized,
      showWelcomeCarousel, completeWelcomeCarousel, restartWithCarousel,
    ],
  );

  return (
    <DemoModeContext.Provider value={value}>
      {children}
    </DemoModeContext.Provider>
  );
}

export function useDemoMode() {
  const ctx = useContext(DemoModeContext);
  if (!ctx) throw new Error("useDemoMode must be used within DemoModeProvider");
  return ctx;
}
