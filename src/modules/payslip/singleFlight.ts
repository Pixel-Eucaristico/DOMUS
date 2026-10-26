/**
 * Story 11.5 (R5 da revisão): trava para ação assíncrona que não pode rodar duas
 * vezes ao mesmo tempo, como o toque duplo em "Salvar holerite" (que lançaria a
 * receita duas vezes). A trava é síncrona: o segundo toque, no mesmo quadro,
 * já a encontra fechada, ao contrário de um `useState`.
 */
export interface SingleFlight {
  readonly busy: boolean;
  /** Roda `fn` se nada estiver rodando; senão devolve `undefined` sem chamar. */
  run<T>(fn: () => Promise<T>): Promise<T | undefined>;
}

export function createSingleFlight(): SingleFlight {
  let busy = false;
  return {
    get busy() {
      return busy;
    },
    async run<T>(fn: () => Promise<T>): Promise<T | undefined> {
      if (busy) return undefined;
      busy = true;
      try {
        return await fn();
      } finally {
        busy = false;
      }
    },
  };
}
