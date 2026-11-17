import { useState, useEffect, useRef, useCallback } from "react";
import type { WishlistItem } from "@packages/wishlist";
import { PriceRefreshController } from "@/src/modules/wishlist/application/priceRefreshQueue";

interface Options {
  items: WishlistItem[];
  updateItem: (id: string, listId: string, changes: Partial<WishlistItem>) => void;
  /**
   * Flag "Consultas de itens, preços e ícones". Falsa: nada é enfileirado nem
   * raspado — a lista mostra o último preço salvo.
   */
  enabled: boolean;
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
 * Só roda com a flag de consultas ligada (`enabled`).
 */
export function usePriceRefresh({ items, updateItem, enabled }: Options): Result {
  const [refreshingId, setRefreshingId] = useState<string | null>(null);
  const updateItemRef = useRef(updateItem);
  updateItemRef.current = updateItem;

  const controllerRef = useRef<PriceRefreshController | null>(null);
  if (!controllerRef.current) {
    controllerRef.current = new PriceRefreshController(
      {
        onRefreshingIdChange: setRefreshingId,
        onUpdateItem: (id, listId, changes) => updateItemRef.current(id, listId, changes),
      },
      enabled,
    );
  }

  // Sincroniza items no mesmo commit para evitar perda em enqueueVisible inicial
  controllerRef.current.setItems(items);

  useEffect(() => {
    const ctrl = controllerRef.current!;
    void ctrl.init();
    return () => {
      ctrl.dispose();
    };
  }, []);

  useEffect(() => {
    controllerRef.current?.setEnabled(enabled);
  }, [enabled]);

  const enqueueVisible = useCallback((visibleIds: string[]) => {
    controllerRef.current?.enqueueVisible(visibleIds);
  }, []);

  return { refreshingId, enqueueVisible };
}
