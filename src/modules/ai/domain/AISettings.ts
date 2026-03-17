import type { AIProvider, AIModelTier, AudioProvider } from "@packages/ai";

/** How the user authenticates with OpenAI: API key or ChatGPT OAuth login */
export type OpenAIAuthMethod = "apikey" | "chatgpt_oauth";

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

// ─── Budget Mode ─────────────────────────────────────────────────────────────

export type BudgetMode = "daily" | "monthly";

// ─── Types ────────────────────────────────────────────────────────────────────

export type OpenAIVoice = "alloy" | "ash" | "ballad" | "coral" | "echo" | "fable" | "nova" | "onyx" | "sage" | "shimmer" | "verse" | "marin" | "cedar";

export interface AISettings {
  provider: AIProvider;
  modelTier: AIModelTier;
  /** Per-provider API key status: true when a key is present in SecureStore */
  apiKeyStatus: Partial<Record<AIProvider, boolean>>;
  /** How OpenAI authenticates: API key or ChatGPT OAuth */
  openaiAuthMethod: OpenAIAuthMethod;
  /** true when ChatGPT OAuth session is active */
  hasOAuthSession: boolean;
  /** master toggle — user must explicitly enable AI features */
  isEnabled: boolean;
  /** Per-data-type access permissions */
  dataPermissions: AIDataPermissions;
  /** User-defined daily token budget per provider (overrides DAILY_TOKEN_BUDGET) */
  customBudgets?: Partial<Record<AIProvider, number>>;
  /** "daily" = fixed daily limit, "monthly" = total divided by remaining days */
  budgetMode?: BudgetMode;
  /** Monthly token budget per provider (used when budgetMode = "monthly") */
  monthlyBudgets?: Partial<Record<AIProvider, number>>;
  /** Day of month when billing cycle resets (1-31, default 1) */
  billingDay?: number;
  /** Voice mode: microphone input + spoken responses */
  voiceEnabled?: boolean;
  /** Voice used by OpenAI TTS (default: "nova") */
  openaiVoice?: OpenAIVoice;
  /** Independent audio/TTS provider (can differ from text provider) */
  audioProvider?: AudioProvider;
  /** Voice ID for the selected audio provider */
  audioVoice?: string;
  /** Whether an ElevenLabs API key is stored */
  elevenLabsKeyStatus?: boolean;
  /** Enable AI-powered Vision OCR for invoices/payslips */
  visionOCREnabled?: boolean;
  /** Enable financial tooltips/educational hints in chat */
  tooltipsEnabled?: boolean;
  /** Auto-play TTS on every AI response (falar direto) */
  autoPlayTTS?: boolean;
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

/** Helper to check if the active provider has credentials configured */
export function hasActiveKey(settings: AISettings): boolean {
  if (settings.provider === "openai" && settings.openaiAuthMethod === "chatgpt_oauth") {
    return settings.hasOAuthSession;
  }
  return settings.apiKeyStatus[settings.provider] === true;
}

// ─── Defaults & Keys ─────────────────────────────────────────────────────────

export const DEFAULT_AI_SETTINGS: AISettings = {
  provider: "openai",
  modelTier: "fast",
  apiKeyStatus: {},
  openaiAuthMethod: "apikey",
  hasOAuthSession: false,
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
  deepseek: 80_000,
  qwen: 80_000,
};

/** Provider visual identity (color + icon) */
export const PROVIDER_THEME: Record<AIProvider, { color: string; icon: string }> = {
  openai: { color: "#10A37F", icon: "creation" },
  gemini: { color: "#4285F4", icon: "google" },
  claude: { color: "#D97706", icon: "atom" },
  deepseek: { color: "#4D6BFE", icon: "brain" },
  qwen: { color: "#FF6A00", icon: "cloud" },
};

/** Budget value that means "unlimited" (no daily cap) */
export const UNLIMITED_BUDGET = 0;

/** Helper to get the budget for a specific provider, respecting user overrides.
 *  Returns 0 for unlimited. */
export function getProviderBudget(
  provider: AIProvider,
  customBudgets?: Partial<Record<AIProvider, number>>,
): number {
  return customBudgets?.[provider] ?? DAILY_TOKEN_BUDGET[provider];
}

/** Returns true if the budget is unlimited (0 = no cap) */
export function isUnlimitedBudget(
  provider: AIProvider,
  customBudgets?: Partial<Record<AIProvider, number>>,
): boolean {
  return getProviderBudget(provider, customBudgets) === UNLIMITED_BUDGET;
}

// ─── Monthly Budget Helpers ──────────────────────────────────────────────────

/** Default monthly token budgets (approx daily * 30) */
export const MONTHLY_TOKEN_BUDGET: Record<AIProvider, number> = {
  openai: 2_400_000,
  gemini: 2_400_000,
  claude: 1_200_000,
  deepseek: 2_400_000,
  qwen: 2_400_000,
};

/** Get the monthly budget for a provider, respecting user overrides. */
export function getMonthlyBudget(
  provider: AIProvider,
  monthlyBudgets?: Partial<Record<AIProvider, number>>,
): number {
  return monthlyBudgets?.[provider] ?? MONTHLY_TOKEN_BUDGET[provider];
}

/** Returns true if the monthly budget is unlimited */
export function isUnlimitedMonthlyBudget(
  provider: AIProvider,
  monthlyBudgets?: Partial<Record<AIProvider, number>>,
): boolean {
  return getMonthlyBudget(provider, monthlyBudgets) === UNLIMITED_BUDGET;
}

/** Compute the billing cycle start and end dates for a given billing day. */
export function getBillingCycle(billingDay: number = 1): { start: Date; end: Date } {
  const today = new Date();
  const y = today.getFullYear();
  const m = today.getMonth(); // 0-based
  const d = today.getDate();
  const clampedDay = Math.min(billingDay, 28); // avoid month-overflow issues

  let start: Date;
  let end: Date;

  if (d >= clampedDay) {
    // Current cycle started this month
    start = new Date(y, m, clampedDay);
    end = new Date(y, m + 1, clampedDay);
  } else {
    // Current cycle started last month
    start = new Date(y, m - 1, clampedDay);
    end = new Date(y, m, clampedDay);
  }

  return { start, end };
}

/** Compute effective daily allowance for monthly mode.
 *  = (monthlyBudget - usedThisCycle) / daysRemaining */
export function getEffectiveDailyBudget(
  provider: AIProvider,
  usedThisCycle: number,
  billingDay: number = 1,
  monthlyBudgets?: Partial<Record<AIProvider, number>>,
): number {
  if (isUnlimitedMonthlyBudget(provider, monthlyBudgets)) return UNLIMITED_BUDGET;

  const monthlyBudget = getMonthlyBudget(provider, monthlyBudgets);
  const remaining = Math.max(0, monthlyBudget - usedThisCycle);
  const { end } = getBillingCycle(billingDay);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const msPerDay = 86_400_000;
  const daysLeft = Math.max(1, Math.ceil((end.getTime() - today.getTime()) / msPerDay));

  return Math.floor(remaining / daysLeft);
}
