import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  WISHLIST_LINK_PLACEHOLDER,
  getWishlistDisplayTitle,
  isWishlistItemValid,
  isWishlistTrashDisabled,
} from "../wishlistUiHelpers";

const ROOT_DIR = path.resolve(__dirname, "../../../..");

function collectCodeFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    if (entry.name === "node_modules" || entry.name === "__tests__") continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectCodeFiles(fullPath));
    } else if (/\.(ts|tsx|js|jsx)$/.test(entry.name)) {
      files.push(fullPath);
    }
  }
  return files;
}

describe("wishlistUiHelpers", () => {
  it("desabilita a lixeira quando há 0 (ou menos) itens ou contagem não finita", () => {
    expect(isWishlistTrashDisabled(0)).toBe(true);
    expect(isWishlistTrashDisabled(-1)).toBe(true);
    expect(isWishlistTrashDisabled(Number.NaN)).toBe(true);
    expect(isWishlistTrashDisabled(Number.POSITIVE_INFINITY)).toBe(true);
    expect(isWishlistTrashDisabled(1)).toBe(false);
    expect(isWishlistTrashDisabled(3)).toBe(false);
  });

  it("valida o nome do item exigindo string com ao menos 2 caracteres úteis", () => {
    expect(isWishlistItemValid("")).toBe(false);
    expect(isWishlistItemValid("   ")).toBe(false);
    expect(isWishlistItemValid("a")).toBe(false);
    expect(isWishlistItemValid("  ab  ")).toBe(true);
    expect(isWishlistItemValid(null as unknown as string)).toBe(false);
    expect(isWishlistItemValid(undefined as unknown as string)).toBe(false);
  });

  it("retorna o título da lista com fallback 'Desejos' para valores vazios", () => {
    expect(getWishlistDisplayTitle("")).toBe("Desejos");
    expect(getWishlistDisplayTitle("   ")).toBe("Desejos");
    expect(getWishlistDisplayTitle(undefined)).toBe("Desejos");
    expect(getWishlistDisplayTitle(null)).toBe("Desejos");
    expect(getWishlistDisplayTitle("  Viagem  ")).toBe("Viagem");
  });

  it("define placeholder de link conciso com até 30 caracteres", () => {
    expect(WISHLIST_LINK_PLACEHOLDER).toBe("Cole o link ou toque na lupa");
    expect(WISHLIST_LINK_PLACEHOLDER.length).toBeLessThanOrEqual(30);
  });

  it("não contém a grafia incorreta 'Dedejo' em app/, src/ ou packages/", () => {
    const dirs = ["app", "src", "packages"].map((d) => path.join(ROOT_DIR, d));
    const matches: string[] = [];
    for (const dir of dirs) {
      for (const file of collectCodeFiles(dir)) {
        const content = fs.readFileSync(file, "utf8");
        if (/dedejo/i.test(content)) {
          matches.push(path.relative(ROOT_DIR, file));
        }
      }
    }
    expect(matches).toEqual([]);
  });

  it("mantém footer sempre visível, grade 2x2, numberOfLines={1} e placeholder curto em AddItemModal.tsx", () => {
    const modalPath = path.join(ROOT_DIR, "src/components/wishlist/AddItemModal.tsx");
    const source = fs.readFileSync(modalPath, "utf8");

    expect(source).not.toContain("footerVisible={isValid}");
    expect(source).toContain("disabled={!isValid}");
    expect(source).toContain("opacity={isValid ? 1 : 0.45}");
    expect(source).toContain("placeholder={WISHLIST_LINK_PLACEHOLDER}");
    expect(source).toContain("fontSize={13}");
    expect(source).toContain("paddingHorizontal={12}");
    expect(source).toContain('flexBasis: "48%"');
    expect(source).toContain("flexGrow: 1");
    expect(source).toContain("numberOfLines={1}");
  });

  it("desabilita lixeira com 0 itens, usa getWishlistDisplayTitle e acessibilidade em app/wishlist/[listId].tsx", () => {
    const screenPath = path.join(ROOT_DIR, "app/wishlist/[listId].tsx");
    const source = fs.readFileSync(screenPath, "utf8");

    expect(source).toContain("getWishlistDisplayTitle(list.name)");
    expect(source).toContain("isWishlistTrashDisabled(rawItems.length)");
    expect(source).toContain("disabled={trashDisabled}");
    expect(source).toContain("opacity: 0.35");
    expect(source).toContain("theme.secondaryText");
    expect(source).toContain("getContrastTextColor(theme.primaryColor)");
    expect(source).toContain('accessibilityLabel="Excluir lista"');
    expect(source).toContain('accessibilityLabel="Adicionar item"');
  });
});
