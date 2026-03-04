import React, { createContext, useContext, useState, useCallback, useMemo } from "react";
import type { AppState } from "@packages/domain/src/state";
import { createInitialState } from "@packages/domain/src/state";

interface DemoModeContextValue {
  isDemoActive: boolean;
  startDemo: () => void;
  stopDemo: () => void;
  demoState: AppState | null;
}

const DemoModeContext = createContext<DemoModeContextValue | null>(null);

/**
 * Gerenciador de Sandboxing para o Tur Guiado.
 * Permite que o usuário explore o app sem afetar seu saldo real.
 */
export function DemoModeProvider({ children }: { children: React.ReactNode }) {
  const [isDemoActive, setIsDemoActive] = useState(false);
  const [demoState, setDemoState] = useState<AppState | null>(null);

  const startDemo = useCallback(() => {
    // Cria um estado inicial limpo para o tour
    const fakeState = createInitialState();
    
    // Dados de exemplo para o tour ser visualmente rico
    fakeState.accounts["demo-wallet"] = {
      id: "demo-wallet",
      name: "Carteira de Teste",
      type: "wallet",
      balance: 2500.00,
      color: "#10B981",
    };

    fakeState.accounts["demo-card"] = {
      id: "demo-card",
      name: "Cartão de Crédito",
      type: "credit_card",
      balance: 0,
      creditLimit: 5000,
      color: "#3B82F6",
    };

    fakeState.categories["alimentacao"] = { id: "alimentacao", name: "Alimentação", group: "needs" };
    fakeState.categories["lazer"] = { id: "lazer", name: "Lazer", group: "wants" };

    setDemoState(fakeState);
    setIsDemoActive(true);
  }, []);

  const stopDemo = useCallback(() => {
    setIsDemoActive(false);
    setDemoState(null); // Cleanup automático: dados voláteis morrem aqui
  }, []);

  const value = useMemo(() => ({
    isDemoActive,
    startDemo,
    stopDemo,
    demoState,
  }), [isDemoActive, demoState, startDemo, stopDemo]);

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
