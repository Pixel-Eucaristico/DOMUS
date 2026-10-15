// Lógica pura (sem react-native) de validade do access token do Drive — testável no vitest.

export interface DriveTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number; // epoch ms
  email: string;
  clientId: string;
  /** true quando o token vem do Google Sign-In nativo (renovado pelo Play Services, sem refresh token). */
  native?: boolean;
}

/** Devolve um access token novo (ou null se não houver sessão). O argumento é o token vencido, a descartar do cache. */
export type NativeTokenProvider = (staleAccessToken?: string) => Promise<string | null>;

/** Vida útil assumida do token nativo: conservadora, pois o Play Services pode devolver um token em cache. */
export const NATIVE_TOKEN_TTL_MS = 30 * 60 * 1000;
export const EXPIRY_MARGIN_MS = 5 * 60 * 1000;

/** Conectado = refresh token legado ou sessão nativa. Token web implícito (sem refresh) não conta. */
export function isDriveConnected(tokens: DriveTokens | null): boolean {
  return !!tokens && (!!tokens.refreshToken || tokens.native === true);
}

/**
 * Resolve um access token válido. Sem `provider` (web) só o token ainda dentro da validade serve.
 * Com `provider` (nativo) renova pelo Google Sign-In; nenhum segredo de cliente é usado.
 */
export async function resolveAccessToken(
  tokens: DriveTokens | null,
  provider: NativeTokenProvider | null,
  now: number = Date.now(),
): Promise<DriveTokens | null> {
  if (!tokens) return null;
  if (tokens.expiresAt - now > EXPIRY_MARGIN_MS) return tokens;
  if (!provider) return null;

  const accessToken = await provider(tokens.accessToken);
  if (!accessToken) return null;

  return { ...tokens, accessToken, expiresAt: now + NATIVE_TOKEN_TTL_MS, native: true };
}
