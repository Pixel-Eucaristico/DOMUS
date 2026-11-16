import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { formatDatePtBr } from "../formatDate";

const ROOT = path.resolve(__dirname, "../../..");

describe("formatDatePtBr", () => {
  it("formata data ISO padrão YYYY-MM-DD para DD/MM/AAAA e aceita espaços nas pontas", () => {
    expect(formatDatePtBr("2026-11-16")).toBe("16/11/2026");
    expect(formatDatePtBr("  2026-11-16  ")).toBe("16/11/2026");
    expect(formatDatePtBr("2024-02-29")).toBe("29/02/2024");
  });

  it("formata data ISO com horário (T ou espaço) sem deslocamento de fuso", () => {
    expect(formatDatePtBr("2026-11-16T14:30:00Z")).toBe("16/11/2026");
    expect(formatDatePtBr("2026-11-16 14:30:00")).toBe("16/11/2026");
    expect(formatDatePtBr("2026-01-01T00:00:00Z")).toBe("01/01/2026");
    expect(formatDatePtBr("2026-03-01T23:59:59-03:00")).toBe("01/03/2026");
  });

  it("retorna entrada original para datas de calendário inválidas", () => {
    expect(formatDatePtBr("2026-13-45")).toBe("2026-13-45");
    expect(formatDatePtBr("2026-02-30")).toBe("2026-02-30");
    expect(formatDatePtBr("2025-02-29")).toBe("2025-02-29");
  });

  it("mantém fallback seguro para não-string, já formatada, vazia ou inválida", () => {
    expect(formatDatePtBr(null as unknown as string)).toBe("");
    expect(formatDatePtBr(undefined as unknown as string)).toBe("");
    expect(formatDatePtBr("16/11/2026")).toBe("16/11/2026");
    expect(formatDatePtBr("")).toBe("");
    expect(formatDatePtBr("invalida")).toBe("invalida");
  });
});

describe("Story 14.2 — verificação estrutural de layout e formatação", () => {
  it("app/transactions.tsx previne colisão e não duplica conta de origem em transferências", () => {
    const src = fs.readFileSync(path.join(ROOT, "app/transactions.tsx"), "utf8");
    expect(src).toMatch(/txMain:\s*\{[^}]*minWidth:\s*0/);
    expect(src).toMatch(/txSub:\s*\{[^}]*flexWrap:\s*"wrap"/);
    expect(src).toMatch(/txRight:\s*\{[^}]*flexShrink:\s*0/);
    expect(src).toContain("!accountId && tx.type !== \"transfer\"");
    expect(src).toContain("flexShrink={1}");
    expect(src).toContain("formatDatePtBr(tx.date)");
  });

  it("app/(tabs)/index.tsx mantém paddingBottom acima do topo do HomeFab (+140)", () => {
    const src = fs.readFileSync(path.join(ROOT, "app/(tabs)/index.tsx"), "utf8");
    expect(src).toContain("paddingBottom: insets.bottom + webBottomInset + 164");
    expect(src).toContain("bottom={insets.bottom + webBottomInset + 80}");
  });

  it("RecentTransactionsList.tsx formata tx.date e evita colisão entre descrição e valor", () => {
    const src = fs.readFileSync(
      path.join(ROOT, "src/components/transaction/RecentTransactionsList.tsx"),
      "utf8",
    );
    expect(src).toContain("formatDatePtBr(tx.date)");
    expect(src).toMatch(/txInfo:\s*\{[^}]*minWidth:\s*0/);
    expect(src).toMatch(/txDescRow:\s*\{[^}]*flexWrap:\s*"wrap"/);
    expect(src).toContain("flexShrink={1}");
    expect(src).toContain("flexShrink={0}");
  });

  it("GamificationWidget.tsx remove width: 42 e usa minWidth: 0 e numberOfLines={2}", () => {
    const src = fs.readFileSync(
      path.join(ROOT, "src/components/gamification/GamificationWidget.tsx"),
      "utf8",
    );
    expect(src).not.toContain("width: 42");
    expect(src).toMatch(/recentAchsColumn:\s*\{[^}]*minWidth:\s*0/);
    expect(src).toContain("flex: 1, minWidth: 0");
    expect(src).toContain("numberOfLines={2}");
  });
});
