import { useEffect, useRef } from "react";
import { useRouter, usePathname } from "expo-router";
import { useDemoMode } from "@/src/context/DemoModeProvider";
import { PAGE_GROUPS } from "./tourPageGroups";

const TAB_PATHS = new Set(["/", "/accounts", "/wishlist", "/season"]);

function isTabRoute(path: string): boolean {
  return TAB_PATHS.has(path);
}

/**
 * Watches currentPageGroup and navigates to the correct route when it changes.
 * Also handles restoring navigation after tour is un-minimized.
 */
export function useTourGroupNavigation() {
  const { isDemoActive, isTourMinimized, currentPageGroup } = useDemoMode();
  const router = useRouter();
  const pathname = usePathname();
  const lastNavigatedGroup = useRef(-1);
  const wasMiniRef = useRef(false);
  // Store pending navigate target so pathname changes don't cancel it mid-flight
  const pendingNavigateRef = useRef<string | null>(null);
  const pendingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!isDemoActive) return;

    if (isTourMinimized) {
      wasMiniRef.current = true;
      return;
    }

    // Just restored from minimize — force re-navigation to current group's page
    if (wasMiniRef.current) {
      wasMiniRef.current = false;
      lastNavigatedGroup.current = -1;
    }

    const group = PAGE_GROUPS[currentPageGroup];
    if (!group) return;

    const targetRoute = group.route;
    const normalizedCurrent = isTabRoute(pathname)
      ? (pathname === "/" ? "/(tabs)" : `/(tabs)${pathname}`)
      : pathname;

    if (normalizedCurrent === targetRoute) {
      lastNavigatedGroup.current = currentPageGroup;
      return;
    }

    // If a delayed navigate for this route is already scheduled, don't re-schedule
    if (pendingNavigateRef.current === targetRoute) return;

    if (lastNavigatedGroup.current === currentPageGroup) return;
    lastNavigatedGroup.current = currentPageGroup;

    const onStack = !isTabRoute(pathname);
    const targetIsStack = !targetRoute.startsWith("/(tabs)");

    if (onStack) {
      // Stack → anywhere: dismiss current stack screens first, then navigate
      if (pendingTimerRef.current) clearTimeout(pendingTimerRef.current);
      pendingNavigateRef.current = targetRoute;

      const timer = setTimeout(() => {
        try { router.dismissAll(); } catch { /* ignore */ }
        pendingTimerRef.current = setTimeout(() => {
          pendingNavigateRef.current = null;
          pendingTimerRef.current = null;
          try { router.navigate(targetRoute as any); } catch { /* ignore */ }
        }, targetIsStack ? 400 : 300);
      }, 150);

      return () => clearTimeout(timer);
    }

    // Tab → anywhere: just navigate (no stack to dismiss)
    const timer = setTimeout(() => {
      try { router.navigate(targetRoute as any); } catch { /* ignore */ }
    }, 100);
    return () => clearTimeout(timer);
  }, [isDemoActive, isTourMinimized, currentPageGroup, router, pathname]);
}
