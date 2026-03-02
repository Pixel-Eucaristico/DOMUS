/**
 * Centralized affiliate configuration.
 * Update values here to change affiliate tags/links across the entire app.
 */
export const AFFILIATE_CONFIG = {
  amazon: {
    tag: "willianquinti-20",
    linkCode: "ll1",
    label: "Amazon Associates",
    description:
      "Links da Amazon com tag de afiliado. Ao comprar pelos links sugeridos, você apoia o desenvolvimento do app sem custo adicional.",
  },
  mercadolivre: {
    label: "quintinowilliancustodio",
    link: "https://meli.la/2oDNho4",
    id: "H9Z8P6-VNS1",
    description:
      "Links do Mercado Livre com ID de afiliado. Busque pelo ID no ML ou acesse o link direto para apoiar o app.",
  },
} as const;

/** Alias kept for backwards compatibility with existing imports. */
export const AFFILIATE_INFO = AFFILIATE_CONFIG;
