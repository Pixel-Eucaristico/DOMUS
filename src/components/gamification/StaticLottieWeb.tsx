export interface StaticLottieWebProps {
  source: unknown;
  /** Quadro mostrado (o último: staticLottieFrame). */
  frame: number;
  size: number;
  onFailure: () => void;
}

/**
 * No celular o troféu estático usa o `LottieView` com `progress={1}`
 * (LottieTrophy); este componente só existe na web (StaticLottieWeb.web.tsx).
 */
export function StaticLottieWeb(_props: StaticLottieWebProps): null {
  return null;
}
