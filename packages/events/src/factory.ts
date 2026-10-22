import type { DomainEvent, EventType } from "./types";

/**
 * Contador monotônico do milissegundo atual (Story 3.4): ids criados neste
 * aparelho no mesmo milissegundo ficam na ordem de criação quando comparados
 * como texto (`compareEvents` desempata por `id`). Largura fixa de
 * `COUNTER_WIDTH` dígitos base36; zera quando o milissegundo muda.
 */
const COUNTER_WIDTH = 4;
const COUNTER_MAX = 36 ** COUNTER_WIDTH - 1; // 1.679.615 ids por milissegundo
let lastMs = -1;
let counter = 0;

/**
 * `Date.now()` em base36 + contador de largura fixa + sufixo aleatório.
 * Ids antigos (sem contador) continuam válidos; só os novos ganham a ordem.
 */
export function generateId(now: number = Date.now()): string {
  if (now !== lastMs) {
    lastMs = now;
    counter = 0;
  } else if (counter < COUNTER_MAX) {
    counter += 1;
  }
  // Acima de COUNTER_MAX no mesmo ms o contador fica no máximo: o id segue
  // único pelo sufixo aleatório, só a ordem de criação deixa de ser garantida.
  return (
    now.toString(36) +
    counter.toString(36).padStart(COUNTER_WIDTH, "0") +
    Math.random().toString(36).substring(2, 11)
  );
}

export function createEvent<T extends DomainEvent>(
  type: T["type"],
  payload: T["payload"],
  deviceId: string = "local",
): T {
  // Mesmo instante no id e no timestamp: o desempate por id segue a criação.
  const now = Date.now();
  return {
    id: generateId(now),
    type: type as EventType,
    payload,
    timestamp: now,
    deviceId,
    signature: "",
  } as T;
}
