import { describe, it, expect, vi } from "vitest";
import {
  executePlainExportFlow,
  runIfConfirmed,
  PLAIN_EXPORT_WARNING,
} from "../confirmedExport";
import type { BackupStatus } from "@/src/modules/backup/domain/BackupMetadata";

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

describe("executePlainExportFlow", () => {
  it("cancela sem exportar e retorna status para idle", async () => {
    const busyRef = { current: false };
    const statuses: BackupStatus[] = [];
    const confirmingStates: boolean[] = [];
    const exportPlain = vi.fn().mockResolvedValue(5);

    const res = await executePlainExportFlow({
      busyRef,
      askConfirmation: async () => false,
      exportPlain,
      setStatus: (s) => statuses.push(s),
      setConfirming: (v) => confirmingStates.push(v),
    });

    expect(res).toBe("cancelled");
    expect(exportPlain).not.toHaveBeenCalled();
    expect(statuses.at(-1)).toEqual({ type: "idle" });
    expect(confirmingStates).toEqual([true, false]);
    expect(busyRef.current).toBe(false);
  });

  it("bloqueia toque duplo enquanto confirmação está pendente", async () => {
    const busyRef = { current: false };
    let resolveConfirm!: (v: boolean) => void;
    const askConfirmation = vi.fn(
      () =>
        new Promise<boolean>((resolve) => {
          resolveConfirm = resolve;
        }),
    );
    const exportPlain = vi.fn().mockResolvedValue(3);

    const first = executePlainExportFlow({
      busyRef,
      askConfirmation,
      exportPlain,
      setStatus: () => {},
    });
    const second = executePlainExportFlow({
      busyRef,
      askConfirmation,
      exportPlain,
      setStatus: () => {},
    });

    expect(await second).toBe("busy");
    resolveConfirm(true);
    expect(await first).toBe("done");
    expect(askConfirmation).toHaveBeenCalledTimes(1);
    expect(exportPlain).toHaveBeenCalledTimes(1);
    expect(busyRef.current).toBe(false);
  });
});

describe("PLAIN_EXPORT_WARNING", () => {
  it("cita o salário e o empregador dos holerites (Story 11.5, decisão 1a)", () => {
    expect(PLAIN_EXPORT_WARNING.message).toContain("inclusive o salário e o empregador dos holerites");
  });
});
