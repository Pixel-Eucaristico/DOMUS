/**
 * No celular o troféu estático usa o `LottieView` com `progress={1}`
 * (LottieTrophy); este componente só existe na web (StaticLottieWeb.web.tsx).
 */
export function StaticLottieWeb(_props: { source: unknown; frame: number; size: number; onFailure: () => void }): null {
  return null;
}
