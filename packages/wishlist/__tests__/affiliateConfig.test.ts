import { describe, expect, it } from "vitest";
import { AFFILIATE_CONFIG } from "../src/affiliateConfig";
import { AmazonStrategy } from "../src/scrapers/AmazonStrategy";
import { AFFILIATE_URLS } from "@/src/components/monetization/AffiliateLinks";

describe("Configuração de afiliado Amazon", () => {
  it("usa o ID de Associado vigente willianquin03-20 em AFFILIATE_CONFIG", () => {
    expect(AFFILIATE_CONFIG.amazon.tag).toBe("willianquin03-20");
  });

  it("AmazonStrategy.buildAffiliateUrl injeta o tag de AFFILIATE_CONFIG", () => {
    const strategy = new AmazonStrategy();
    const url = strategy.buildAffiliateUrl("https://www.amazon.com.br/dp/B000000000");
    expect(url).toBeDefined();
    const parsed = new URL(url!);
    expect(parsed.searchParams.get("tag")).toBe(AFFILIATE_CONFIG.amazon.tag);
    expect(parsed.searchParams.get("linkCode")).toBe(AFFILIATE_CONFIG.amazon.linkCode);
  });

  it("AFFILIATE_URLS.amazon deriva exatamente o mesmo tag de AFFILIATE_CONFIG", () => {
    const parsed = new URL(AFFILIATE_URLS.amazon);
    expect(parsed.searchParams.get("tag")).toBe(AFFILIATE_CONFIG.amazon.tag);
  });
});
