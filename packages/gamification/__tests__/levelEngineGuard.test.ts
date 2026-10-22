import { describe, it, expect } from "vitest";
import { getLevelInfo, calculateLevel } from "../src/levelEngine";

describe("levelEngine com XP inválido (Story 3.2)", () => {
  it.each([Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY, -50])(
    "getLevelInfo(%s) termina e trata como 0",
    (xp) => {
      expect(getLevelInfo(xp)).toEqual(getLevelInfo(0));
      expect(calculateLevel(xp)).toBe(1);
    },
  );

  it("XP válido não muda", () => {
    expect(getLevelInfo(250).level).toBe(calculateLevel(250));
    expect(getLevelInfo(0)).toEqual({ level: 1, currentXp: 0, xpForCurrentLevel: 0, xpForNextLevel: 100, progress: 0 });
  });
});
