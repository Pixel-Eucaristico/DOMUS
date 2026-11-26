// Lógica pura (sem react-native) de validade do access token do Drive — testável no vitest.

export type DriveAuthProvider = "credential-manager";

export interface DriveTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number; // epoch ms
  email: string;
  clientId: string;
  /** true quando o token vem do login nativo (renovado sem refresh token / client_secret). */
  native?: boolean;
  /** Provedor nativo moderno usado para criar a sessão; ausente em sessões legadas (pré-8.8). */
  authProvider?: DriveAuthProvider;
}

/**
 * Devolve um access token novo (ou null se não houver sessão/consentimento silencioso).
 * `staleAccessToken` é o token vencido a descartar do cache; `accountEmail` vincula a conta correta.
 */
export type NativeTokenProvider = (
  staleAccessToken?: string,
  accountEmail?: string,
) => Promise<string | null>;

/** Vida útil assumida do token nativo: conservadora, pois o Play Services pode devolver um token em cache. */
export const NATIVE_TOKEN_TTL_MS = 30 * 60 * 1000;
export const EXPIRY_MARGIN_MS = 5 * 60 * 1000;

/**
 * Conectado = refresh token legado, sessão nativa ou token web implícito ainda válido.
 * O fluxo web implícito não tem refresh token: conta como conectado enquanto o access token não expira.
 */
export function isDriveConnected(tokens: DriveTokens | null, now: number = Date.now()): boolean {
  return !!tokens && (!!tokens.refreshToken || tokens.native === true || tokens.expiresAt > now);
}

/**
 * Resolve um access token válido. Sem `provider` (web) só o token ainda dentro da validade serve.
 * Com `provider` (nativo) renova silenciosamente via AuthorizationClient; nenhum segredo de cliente é usado.
 */
export async function resolveAccessToken(
  tokens: DriveTokens | null,
  provider: NativeTokenProvider | null,
  now: number = Date.now(),
): Promise<DriveTokens | null> {
  if (!tokens) return null;
  if (tokens.expiresAt - now > EXPIRY_MARGIN_MS) return tokens;
  if (!provider) return null;

  const accessToken = await provider(tokens.accessToken, tokens.email || undefined);
  if (!accessToken) return null;

  return {
    ...tokens,
    accessToken,
    expiresAt: now + NATIVE_TOKEN_TTL_MS,
    native: true,
    authProvider: "credential-manager",
  };
}

/**
 * Força renovação silenciosa após HTTP 401 (mesmo antes de `expiresAt` local expirar),
 * limpando o token anterior em cache e passando o e-mail da conta.
 */
export async function refreshExpiredAccessToken(
  tokens: DriveTokens | null,
  provider: NativeTokenProvider | null,
  now: number = Date.now(),
): Promise<DriveTokens | null> {
  if (!tokens || !provider) return null;

  const accessToken = await provider(tokens.accessToken, tokens.email || undefined);
  if (!accessToken || accessToken === tokens.accessToken) return null;

  return {
    ...tokens,
    accessToken,
    expiresAt: now + NATIVE_TOKEN_TTL_MS,
    native: true,
    authProvider: "credential-manager",
  };
}
