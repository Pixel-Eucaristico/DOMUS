// Marca compartilhada entre os anúncios de tela cheia (intersticial diário e
// abertura do app), para não mostrar dois seguidos.

const COOLDOWN_MS = 30_000;

let active = false;
let closedAt = 0;

export function markFullScreenAdActive(): void {
  active = true;
}

export function markFullScreenAdClosed(now: number = Date.now()): void {
  active = false;
  closedAt = now;
}

/** true enquanto um anúncio de tela cheia está aberto ou fechou há menos de 30 s. */
export function isFullScreenAdBlocking(now: number = Date.now()): boolean {
  return active || (closedAt > 0 && now - closedAt < COOLDOWN_MS);
}
