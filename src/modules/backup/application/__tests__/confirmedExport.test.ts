import { describe, it, expect, vi } from "vitest";
import { runIfConfirmed } from "../confirmedExport";

describe("runIfConfirmed", () => {
  it("sem confirmação, nada é exportado", async () => {
    const run = vi.fn().mockResolvedValue(undefined);
    expect(await runIfConfirmed(async () => false, run)).toBe("cancelled");
    expect(run).not.toHaveBeenCalled();
  });

  it("com confirmação, exporta uma vez", async () => {
    const run = vi.fn().mockResolvedValue(undefined);
    expect(await runIfConfirmed(async () => true, run)).toBe("done");
    expect(run).toHaveBeenCalledTimes(1);
  });

  it("erro da exportação chega a quem chamou", async () => {
    await expect(runIfConfirmed(async () => true, () => Promise.reject(new Error("falhou")))).rejects.toThrow("falhou");
  });
});
