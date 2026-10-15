import AsyncStorage from "@react-native-async-storage/async-storage";
import { getSiscomexCache, restoreSiscomexCache } from "@packages/parsers";

const CACHE_KEY = "@domus/siscomex_ncm_cache";
const LAST_UPDATED_KEY = "@domus/siscomex_ncm_updated";
const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Restore SISCOMEX NCM cache from AsyncStorage on app startup.
 * This avoids re-downloading the ~2MB JSON every session.
 */
export async function restoreSiscomexCacheFromStorage(): Promise<boolean> {
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    if (!raw) return false;

    const data = JSON.parse(raw) as { Codigo: string; Descricao: string }[];
    if (!Array.isArray(data) || data.length === 0) return false;

    restoreSiscomexCache(data);
    return true;
  } catch {
    return false;
  }
}

/**
 * Persist the current in-memory SISCOMEX cache to AsyncStorage.
 * Call this after a successful SISCOMEX fetch.
 */
export async function persistSiscomexCache(): Promise<void> {
  try {
    const data = getSiscomexCache();
    if (!data || data.length === 0) return;

    // Store only Codigo and Descricao to save space
    const slim = data.map((e) => ({ Codigo: e.Codigo, Descricao: e.Descricao }));
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(slim));
    await AsyncStorage.setItem(LAST_UPDATED_KEY, String(Date.now()));
  } catch {
    // Ignore storage errors
  }
}

/**
 * Check if the cache is stale (older than 1 week) and should be refreshed.
 */
export async function isSiscomexCacheStale(): Promise<boolean> {
  try {
    const ts = await AsyncStorage.getItem(LAST_UPDATED_KEY);
    if (!ts) return true;
    return Date.now() - Number(ts) > ONE_WEEK_MS;
  } catch {
    return true;
  }
}
