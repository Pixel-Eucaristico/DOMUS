import type { AIProvider, AIModelTier } from "@packages/ai";

// ─── Data Access Permissions ─────────────────────────────────────────────────

export interface AIDataPermissions {
  /** Acesso a transacoes (descricao, valor, data, categoria) */
  transactions: boolean;
  /** Acesso a contas (nome, tipo, saldo, limite) */
  accounts: boolean;
  /** Acesso a categorias e orcamento */
  categories: boolean;
  /** Acesso a notas fiscais importadas */
  invoices: boolean;
  /** Acesso a lista de desejos (itens, precos, prioridade) */
  wishlist: boolean;
  /** Acesso a trofeus, conquistas, nivel e streaks */
  gamification: boolean;
  /** Acesso a info de sincronizacao (grupo, dispositivos, status) */
  sync: boolean;
}

export const DEFAULT_AI_DATA_PERMISSIONS: AIDataPermissions = {
  transactions: false,
  accounts: false,
  categories: false,
  invoices: false,
  wishlist: false,
  gamification: false,
  sync: false,
};

export const AI_DATA_PERMISSION_LABELS: Record<keyof AIDataPermissions, { title: string; description: string }> = {
  transactions: {
    title: "Transacoes",
    description: "Descricao, valor, data e categoria das suas transacoes",
  },
  accounts: {
    title: "Contas",
    description: "Nome, tipo, saldo e limite de credito das suas contas",
  },
  categories: {
    title: "Categorias",
    description: "Nomes e grupos das suas categorias de gastos",
  },
  invoices: {
    title: "Notas Fiscais",
    description: "Itens, valores e emitentes das notas importadas",
  },
  wishlist: {
    title: "Lista de Desejos",
    description: "Itens desejados, precos, urgencia e metas de poupanca",
  },
  gamification: {
    title: "Trofeus e Conquistas",
    description: "Nivel, XP, streaks, conquistas desbloqueadas e trofeus",
  },
  sync: {
    title: "Sincronizacao",
    description: "Grupo de sincronizacao, status e quantidade de eventos",
  },
};

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AISettings {
  provider: AIProvider;
  modelTier: AIModelTier;
  /** Per-provider API key status: true when a key is present in SecureStore */
  apiKeyStatus: Partial<Record<AIProvider, boolean>>;
  /** master toggle — user must explicitly enable AI features */
  isEnabled: boolean;
  /** Per-data-type access permissions */
  dataPermissions: AIDataPermissions;
  /**
   * true after the system prompt has been sent once this session.
   *
   * NOTE — Chat history is SESSION-ONLY and STATELESS:
   * - Conversation messages exist only in component/hook state (in-memory).
   * - No message history is persisted to SQLite, SecureStore, or AsyncStorage.
   * - Closing the AI chat screen discards all messages immediately.
   * - `clearHistory()` in useAIConsultant resets the in-memory array to [].
   * - There is no server-side history; each session starts fresh.
   * - This means LGPD "right to erasure" for AI chat is automatically satisfied.
   */
  systemPromptSent: boolean;
}

/** Helper to check if the active provider has an API key configured */
export function hasActiveKey(settings: AISettings): boolean {
  return settings.apiKeyStatus[settings.provider] === true;
}

// ─── Defaults & Keys ─────────────────────────────────────────────────────────

export const DEFAULT_AI_SETTINGS: AISettings = {
  provider: "openai",
  modelTier: "fast",
  apiKeyStatus: {},
  isEnabled: false,
  dataPermissions: { ...DEFAULT_AI_DATA_PERMISSIONS },
  systemPromptSent: false,
};

/** SecureStore key for the AISettings JSON blob */
export const AI_SETTINGS_STORE_KEY = "domus_ai_settings_v1";

/** SecureStore key prefix for encrypted API keys: {prefix}{provider} */
export const AI_KEY_PREFIX = "domus_ai_key_";

/** Daily token budget per provider — requests are blocked when exceeded */
export const DAILY_TOKEN_BUDGET: Record<AIProvider, number> = {
  openai: 80_000,
  gemini: 80_000,
  claude: 40_000,
  openrouter: 60_000,
};

/** Provider visual identity (color + icon) */
export const PROVIDER_THEME: Record<AIProvider, { color: string; icon: string }> = {
  openai: { color: "#10A37F", icon: "creation" },
  gemini: { color: "#4285F4", icon: "google" },
  claude: { color: "#D97706", icon: "atom" },
  openrouter: { color: "#6366F1", icon: "router-wireless" },
};

/** Helper to get the budget for a specific provider */
export function getProviderBudget(provider: AIProvider): number {
  return DAILY_TOKEN_BUDGET[provider];
}
