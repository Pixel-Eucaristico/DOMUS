import { useEffect, useRef } from "react";
import { useRouter, usePathname } from "expo-router";
import { useDemoMode } from "@/src/context/DemoModeProvider";
import { TOUR_STEPS } from "./tourStepConfig";

const TAB_PATHS = new Set(["/", "/accounts", "/wishlist", "/season"]);

function isTabRoute(path: string): boolean {
  return TAB_PATHS.has(path);
}

/**
 * Navega automaticamente para a aba correta quando o passo do tour muda.
 */
export function useTourNavigation() {
  const { isDemoActive, currentTourStep } = useDemoMode();
  const router = useRouter();
  const pathname = usePathname();
  const lastNavigatedStep = useRef(-1);

  useEffect(() => {
    if (!isDemoActive) {
      lastNavigatedStep.current = -1;
      return;
    }

    const step = TOUR_STEPS[currentTourStep];
    if (!step?.route) return;
    if (lastNavigatedStep.current === currentTourStep) return;

    const normalizedCurrent = pathname === "/" ? "/(tabs)" : `/(tabs)${pathname}`;
    if (normalizedCurrent === step.route) {
      lastNavigatedStep.current = currentTourStep;
      return;
    }

    lastNavigatedStep.current = currentTourStep;

    // Se estamos em tela stack (não-tab) e o destino é tab,
    // precisamos voltar antes de navegar para as tabs
    const onStackScreen = !isTabRoute(pathname);
    const targetIsTab = step.route.startsWith("/(tabs)");

    if (onStackScreen && targetIsTab) {
      // Dismiss stack screen(s) primeiro, depois navega para a tab correta
      const timer = setTimeout(() => {
        try { router.dismissAll(); } catch { /* ignore */ }
        setTimeout(() => {
          router.navigate(step.route as any);
        }, 50);
      }, 100);
      return () => clearTimeout(timer);
    }

    const timer = setTimeout(() => {
      router.navigate(step.route as any);
    }, 100);

    return () => clearTimeout(timer);
  }, [isDemoActive, currentTourStep, router, pathname]);
}
