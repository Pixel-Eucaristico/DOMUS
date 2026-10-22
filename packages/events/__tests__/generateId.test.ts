import { describe, it, expect } from "vitest";
import { createEvent, generateId } from "../src/factory";
import { compareEvents, sortEvents } from "../../storage/src/eventOrder";
import { createDefaultCategories } from "../../domain/src/categories";
import { replayAllEvents } from "@/src/context/replay";
import type { SyncEvent } from "../../storage/src/eventStore";

/** Story 3.4: ids criados no mesmo milissegundo ordenam na ordem de criação. */
describe("generateId — contador monotônico", () => {
  it("prefixo do tempo + contador de 4 dígitos base36 + sufixo aleatório", () => {
    const now = 1_792_627_200_000;
    const a = generateId(now);
    const b = generateId(now);
    const prefix = now.toString(36);
    expect(a.startsWith(prefix + "0000")).toBe(true);
    expect(b.startsWith(prefix + "0001")).toBe(true);
    expect(a < b).toBe(true);
    // Novo milissegundo zera o contador.
    expect(generateId(now + 1).startsWith((now + 1).toString(36) + "0000")).toBe(true);
  });

  it("10.000 createEvent seguidos: compareEvents preserva a ordem de criação", () => {
    const created = Array.from({ length: 10_000 }, (_, i) => createEvent("X" as never, { i } as never, "dev") as unknown as SyncEvent);
    const sameMsPairs = created.filter((e, i) => i > 0 && e.timestamp === created[i - 1]!.timestamp).length;
    expect(sameMsPairs).toBeGreaterThan(0); // o cenário realmente tem empates de milissegundo
    for (let i = 1; i < created.length; i++) {
      expect(compareEvents(created[i - 1], created[i])).toBe(-1);
    }
    const shuffled = [...created].reverse();
    expect(sortEvents(shuffled).map((e) => e.id)).toEqual(created.map((e) => e.id));
    expect(new Set(created.map((e) => e.id)).size).toBe(created.length);
  });

  it("categorias padrão são aplicadas na ordem de criação", () => {
    const cats = createDefaultCategories() as unknown as SyncEvent[];
    const order = cats.map((c) => (c.payload as { id: string }).id);
    expect(sortEvents([...cats].reverse()).map((c) => (c.payload as { id: string }).id)).toEqual(order);
    expect(Object.keys(replayAllEvents([...cats].reverse()).domain.categories)).toEqual(order);
  });
});
