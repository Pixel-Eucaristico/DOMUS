import { useEffect } from "react";
import { Platform } from "react-native";
import { useAppState } from "@/src/context/AppStateProvider";
import { initFirebase } from "@/src/modules/analytics/infrastructure/AnalyticsService";

/**
 * Hook que inicializa o Firebase Analytics/Performance na inicialização do app.
 * Respeita as preferências de consentimento do usuário.
 */
export function useAnalyticsInit() {
  const { loading } = useAppState();

  useEffect(() => {
    if (loading || Platform.OS === "web") return;
    initFirebase();
  }, [loading]);
}
