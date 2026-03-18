// ─── EAN/GTIN product lookup via external APIs ──────────────────────────────
// Fallback chain: Open Food Facts → Cosmos (Bluesoft) → null

export interface EANLookupResult {
  name?: string;
  ncm?: string;
  category?: string;
  brand?: string;
}

// ─── Open Food Facts (free, no auth, global) ────────────────────────────────

async function lookupOpenFoodFacts(ean: string): Promise<EANLookupResult | null> {
  try {
    const res = await fetch(
      `https://world.openfoodfacts.net/api/v2/product/${ean}?fields=product_name,categories_tags,brands`,
      { headers: { "User-Agent": "DOMUS-App/1.0" } },
    );
    if (!res.ok) return null;

    const data = await res.json() as {
      status?: number;
      product?: {
        product_name?: string;
        categories_tags?: string[];
        brands?: string;
      };
    };

    if (data.status !== 1 || !data.product) return null;

    const p = data.product;
    return {
      name: p.product_name || undefined,
      category: p.categories_tags?.[0]?.replace(/^en:/, "") || undefined,
      brand: p.brands || undefined,
    };
  } catch {
    return null;
  }
}

// ─── Cosmos Bluesoft (BR focused, free tier) ────────────────────────────────

async function lookupCosmos(ean: string): Promise<EANLookupResult | null> {
  try {
    const res = await fetch(
      `https://api.cosmos.bluesoft.com.br/gtins/${ean}`,
      {
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "DOMUS-App/1.0",
        },
      },
    );
    if (!res.ok) return null;

    const data = await res.json() as {
      description?: string;
      ncm?: { code?: string; full_description?: string };
      brand?: { name?: string };
    };

    return {
      name: data.description || undefined,
      ncm: data.ncm?.code?.replace(/\D/g, "") || undefined,
      category: data.ncm?.full_description || undefined,
      brand: data.brand?.name || undefined,
    };
  } catch {
    return null;
  }
}

// ─── Main lookup with fallback chain ────────────────────────────────────────

const _eanCache = new Map<string, EANLookupResult | null>();

/**
 * Look up a product by EAN/GTIN barcode.
 * Tries Open Food Facts first (global), then Cosmos (BR).
 * Results are cached in memory for the session.
 */
export async function lookupByEAN(ean: string): Promise<EANLookupResult | null> {
  const digits = ean.replace(/\D/g, "");
  if (digits.length < 8) return null;

  if (_eanCache.has(digits)) return _eanCache.get(digits) ?? null;

  // Try Open Food Facts first (no auth needed, larger DB)
  let result = await lookupOpenFoodFacts(digits);

  // Fallback to Cosmos (BR-focused, has NCM)
  if (!result) {
    result = await lookupCosmos(digits);
  }

  _eanCache.set(digits, result);
  return result;
}

/** Clear the in-memory EAN cache */
export function clearEANCache(): void {
  _eanCache.clear();
}
