export interface OpenExternalUrlDeps {
  openURL: (url: string) => Promise<unknown>;
  onError: () => void;
}

/**
 * Abre uma URL externa chamando `openURL` diretamente dentro de try/catch.
 * Evita `Linking.canOpenURL`, que no Android 11+ pode retornar `false` sem `<queries>` no manifest.
 */
export async function safeOpenExternalUrl(
  url: string,
  deps: OpenExternalUrlDeps,
): Promise<boolean> {
  try {
    await deps.openURL(url);
    return true;
  } catch {
    deps.onError();
    return false;
  }
}
