import AsyncStorage from "@react-native-async-storage/async-storage";

export type SupportMode = "links" | "banners" | "daily_ad" | "native_ad" | "app_open";

const STORAGE_KEY_SUPPORT_MODES = "domus_support_modes_v2";
const STORAGE_KEY_DAILY_AD_LAST = "domus_daily_ad_last_v1";
const STORAGE_KEY_SUPPORT_MODE_LEGACY = "domus_support_mode_v1";

const DEFAULT_SUPPORT_MODE: SupportMode = "links";

export const ALL_SUPPORT_MODES: SupportMode[] = ["links", "banners", "daily_ad", "native_ad", "app_open"];

// ─── Fonte única dos modos: cache em memória + assinantes ───────────────────
//
// O seletor (Sobre, boas-vindas) e os anúncios (`MonetizationHosts`) leem a
// mesma escolha: gravar publica na hora, sem reiniciar o app.

let cachedModes: SupportMode[] | null = null;
let pendingLoad: Promise<SupportMode[]> | null = null;
const modeListeners = new Set<(modes: SupportMode[]) => void>();

function publishSupportModes(next: SupportMode[]): void {
  cachedModes = next;
  modeListeners.forEach((l) => l(next));
}

export function subscribeSupportModes(listener: (modes: SupportMode[]) => void): () => void {
  modeListeners.add(listener);
  return () => {
    modeListeners.delete(listener);
  };
}

/** Último valor lido ou gravado nesta sessão, ou null se ainda não carregou. */
export function getCachedSupportModes(): SupportMode[] | null {
  return cachedModes;
}

/** Só para testes: esquece o cache e os assinantes. */
export function resetSupportModesCache(): void {
  cachedModes = null;
  pendingLoad = null;
  modeListeners.clear();
}

async function readSupportModes(): Promise<SupportMode[]> {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEY_SUPPORT_MODES);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        return parsed.filter((m) => ALL_SUPPORT_MODES.includes(m)) as SupportMode[];
      }
    }
    const legacy = await AsyncStorage.getItem(STORAGE_KEY_SUPPORT_MODE_LEGACY);
    if (legacy && ALL_SUPPORT_MODES.includes(legacy as SupportMode)) {
      return [legacy as SupportMode];
    }
    return [DEFAULT_SUPPORT_MODE];
  } catch {
    return [DEFAULT_SUPPORT_MODE];
  }
}

export async function loadSupportModes(): Promise<SupportMode[]> {
  if (cachedModes !== null) return cachedModes;
  if (!pendingLoad) {
    pendingLoad = readSupportModes().then((v) => {
      // Uma gravação feita durante a leitura vence
      if (cachedModes === null) publishSupportModes(v);
      pendingLoad = null;
      return cachedModes ?? v;
    });
  }
  return pendingLoad;
}

/** Grava os modos. Vale na hora para todos os assinantes, mesmo se a gravação falhar. */
export async function saveSupportModes(modes: SupportMode[]): Promise<void> {
  publishSupportModes([...modes]);
  try {
    await AsyncStorage.setItem(STORAGE_KEY_SUPPORT_MODES, JSON.stringify(modes));
  } catch {
    // best-effort
  }
}

/** Dia local (AAAA-MM-DD) usado na frequência do intersticial diário. */
export function dailyAdDay(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Puro: o intersticial diário aparece se ainda não foi visto no dia `today`. */
export function shouldShowDailyAd(lastDate: string | null, today: string): boolean {
  return lastDate !== today;
}

export async function loadLastDailyAdDate(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(STORAGE_KEY_DAILY_AD_LAST);
  } catch {
    return null;
  }
}

export async function saveLastDailyAdDate(date: string): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY_DAILY_AD_LAST, date);
  } catch {
    // best-effort
  }
}
