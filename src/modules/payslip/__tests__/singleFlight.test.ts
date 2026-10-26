import { describe, it, expect, vi } from "vitest";
import { createSingleFlight } from "../singleFlight";

// R5: toque duplo em Salvar não roda o salvar (nem lança a receita) duas vezes.
describe("createSingleFlight", () => {
  it("o segundo toque, com o primeiro em andamento, é ignorado", async () => {
    const flight = createSingleFlight();
    let release!: () => void;
    const save = vi.fn(() => new Promise<string>((r) => (release = () => r("ok"))));
    const first = flight.run(save);
    const second = flight.run(save);
    expect(flight.busy).toBe(true);
    release();
    expect(await first).toBe("ok");
    expect(await second).toBeUndefined();
    expect(save).toHaveBeenCalledTimes(1);
  });

  it("libera depois de terminar, inclusive com erro", async () => {
    const flight = createSingleFlight();
    await expect(flight.run(() => Promise.reject(new Error("x")))).rejects.toThrow("x");
    expect(flight.busy).toBe(false);
    expect(await flight.run(async () => 1)).toBe(1);
  });
});
