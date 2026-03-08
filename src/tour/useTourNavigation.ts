import { useEffect, useRef } from "react";
import { useRouter, usePathname } from "expo-router";
import { useDemoMode } from "@/src/context/DemoModeProvider";
import { TOUR_STEPS } from "./tourStepConfig";

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
    const timer = setTimeout(() => {
      router.navigate(step.route as any);
    }, 100);

    return () => clearTimeout(timer);
  }, [isDemoActive, currentTourStep, router, pathname]);
}
