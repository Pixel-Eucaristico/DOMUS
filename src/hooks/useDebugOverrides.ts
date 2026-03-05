import { useState } from "react";
import type { ArchetypeType } from "@packages/personality/src/types";

export interface DebugOverrides {
  debugArchetype: ArchetypeType | null;
  setDebugArchetype: (type: ArchetypeType | null) => void;
  debugXp: number | null;
  setDebugXp: (xp: number | null) => void;
  debugBalance: number | null;
  setDebugBalance: (balance: number | null) => void;
}

export function useDebugOverrides(): DebugOverrides {
  const [debugArchetype, setDebugArchetype] = useState<ArchetypeType | null>(null);
  const [debugXp, setDebugXp] = useState<number | null>(null);
  const [debugBalance, setDebugBalance] = useState<number | null>(null);

  return {
    debugArchetype,
    setDebugArchetype,
    debugXp,
    setDebugXp,
    debugBalance,
    setDebugBalance,
  };
}
