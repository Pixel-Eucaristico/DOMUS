import { AFFILIATE_CONFIG } from "@packages/wishlist/src/affiliateConfig";

export const AFFILIATE_URLS = {
  amazon: `https://www.amazon.com.br?tag=${AFFILIATE_CONFIG.amazon.tag}`,
  mercadoLivre: AFFILIATE_CONFIG.mercadolivre.link,
  kofi: "https://ko-fi.com/willianquintino33618",
} as const;

export const DONATION_PIX_KEY = "55.075.291/0001-79";
