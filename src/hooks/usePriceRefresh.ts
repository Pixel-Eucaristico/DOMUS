import { useState, useEffect, useRef, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { WishlistItem } from "@packages/wishlist";
import { wishlistScraperService } from "@packages/wishlist";

const STORAGE_KEY = "@price_refresh_timestamps";
const REFRESH_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 horas

/** Delay aleatório entre 1.2s e 4.0s para simular uso humano */
function randomDelay(): number {
  return 1200 + Math.floor(Math.random() * 2800);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function loadTimestamps(): Promise<Record<string, number>> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

async function saveTimestamp(
  cache: Record<string, number>,
  itemId: string,
): Promise<void> {
  cache[itemId] = Date.now();
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(cache));
  } catch {
    // Ignora falhas de persistência silenciosamente
  }
}

function needsRefresh(timestamps: Record<string, number>, itemId: string): boolean {
  const last = timestamps[itemId];
  if (!last) return true;
  return Date.now() - last > REFRESH_INTERVAL_MS;
}

interface Options {
  items: WishlistItem[];
  updateItem: (id: string, listId: string, changes: Partial<WishlistItem>) => void;
}

interface Result {
  /** ID do item sendo raspado no momento, ou null */
  refreshingId: string | null;
  /** Enfileira os IDs visíveis para atualização de preço */
  enqueueVisible: (visibleIds: string[]) => void;
}

/**
 * Atualiza preços de itens visíveis de forma sequencial com delay aleatório.
 * Cada item é atualizado no máximo uma vez a cada 24 horas (persiste entre sessões).
 */
export function usePriceRefresh({ items, updateItem }: Options): Result {
  const [refreshingId, setRefreshingId] = useState<string | null>(null);

  // Fila de IDs aguardando scraping
  const queueRef = useRef<string[]>([]);
  // IDs que já foram enfileirados nesta sessão (evita enfileirar duas vezes)
  const seenRef = useRef<Set<string>>(new Set());
  // Evita iniciar dois processamentos paralelos
  const processingRef = useRef(false);
  // Flag de desmontagem
  const activeRef = useRef(true);
  // Cache de timestamps carregado do AsyncStorage
  const timestampsRef = useRef<Record<string, number>>({});
  // Indica se os timestamps já foram carregados
  const timestampsLoadedRef = useRef(false);

  // Mapa id→item sempre atualizado (evita closure stale)
  const itemsRef = useRef<Map<string, WishlistItem>>(new Map());
  useEffect(() => {
    const map = new Map<string, WishlistItem>();
    items.forEach((i) => map.set(i.id, i));
    itemsRef.current = map;
  }, [items]);

  // updateItem ref para evitar closure stale
  const updateItemRef = useRef(updateItem);
  useEffect(() => { updateItemRef.current = updateItem; }, [updateItem]);

  // Carrega timestamps salvos ao montar
  useEffect(() => {
    activeRef.current = true;
    loadTimestamps().then((ts) => {
      if (!activeRef.current) return;
      timestampsRef.current = ts;
      timestampsLoadedRef.current = true;
    });
    return () => { activeRef.current = false; };
  }, []);

  const processNext = useCallback(async () => {
    if (!activeRef.current || queueRef.current.length === 0) {
      processingRef.current = false;
      return;
    }
    processingRef.current = true;

    const itemId = queueRef.current.shift()!;
    const item = itemsRef.current.get(itemId);

    const isBundleItem = (item?.bundleItems?.length ?? 0) > 0;

    // Item sem URL e sem filhos: pula para o próximo imediatamente
    if (!item?.originalUrl && !isBundleItem) {
      processNext();
      return;
    }

    setRefreshingId(itemId);

    try {
      if (isBundleItem && item) {
        // Kit: raspa cada peça que tem URL, recalcula total
        const updatedBundleItems = [...item.bundleItems!];
        let changed = false;

        for (let i = 0; i < updatedBundleItems.length; i++) {
          const bItem = updatedBundleItems[i];
          if (!bItem.originalUrl) continue;

          await sleep(randomDelay());
          if (!activeRef.current) return;

          try {
            const data = await wishlistScraperService.scrape(bItem.originalUrl);
            if (data.price !== undefined && data.price !== bItem.price) {
              updatedBundleItems[i] = { ...bItem, price: data.price };
              changed = true;
            }
          } catch {
            // Peça com erro: mantém preço anterior
          }
        }

        if (!activeRef.current) return;
        await saveTimestamp(timestampsRef.current, itemId);

        if (changed) {
          const newTotal = updatedBundleItems.reduce((acc, b) => acc + (b.price ?? 0), 0);
          updateItemRef.current(itemId, item.listId, {
            bundleItems: updatedBundleItems,
            price: newTotal > 0 ? newTotal : item.price,
          });
        }
      } else if (item?.originalUrl) {
        // Item simples: delay + scrape
        await sleep(randomDelay());
        if (!activeRef.current) return;

        const data = await wishlistScraperService.scrape(item.originalUrl);
        if (!activeRef.current) return;

        await saveTimestamp(timestampsRef.current, itemId);

        if (data.price !== undefined) {
          const current = itemsRef.current.get(itemId);
          if (current && data.price !== current.price) {
            updateItemRef.current(itemId, item.listId, { price: data.price });
          }
        }
      }
    } catch {
      // Em caso de erro não salva timestamp — permitirá nova tentativa amanhã
    } finally {
      if (activeRef.current) setRefreshingId(null);
    }

    if (activeRef.current) processNext();
  }, []);

  const enqueueVisible = useCallback(
    (visibleIds: string[]) => {
      // Aguarda o carregamento inicial dos timestamps antes de enfileirar
      if (!timestampsLoadedRef.current) return;

      let added = false;
      for (const id of visibleIds) {
        // Já enfileirado nesta sessão
        if (seenRef.current.has(id)) continue;
        const item = itemsRef.current.get(id);
        // Sem URL e sem bundle: pula
        const hasUrl = !!item?.originalUrl;
        const hasBundle = (item?.bundleItems?.length ?? 0) > 0;
        if (!hasUrl && !hasBundle) continue;
        // Atualizado nas últimas 24h — pula
        if (!needsRefresh(timestampsRef.current, id)) {
          seenRef.current.add(id); // marca como visto para não checar de novo
          continue;
        }

        seenRef.current.add(id);
        queueRef.current.push(id);
        added = true;
      }
      if (added && !processingRef.current) {
        processNext();
      }
    },
    [processNext],
  );

  return { refreshingId, enqueueVisible };
}
