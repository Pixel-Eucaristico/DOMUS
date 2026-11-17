import React, { useEffect, useMemo, useState } from "react";
import { DotLottieReact, type DotLottie } from "@lottiefiles/dotlottie-react";
import type { StaticLottieWebProps } from "./StaticLottieWeb";

function resolveWebSource(source: unknown): { data?: string; src?: string } {
  if (typeof source === "string") {
    const trimmed = source.trim();
    if (!trimmed) return {};
    return trimmed.startsWith("{") || trimmed.startsWith("[") ? { data: source } : { src: source };
  }
  if (source && typeof source === "object" && "uri" in source && typeof (source as { uri?: unknown }).uri === "string") {
    return { src: (source as { uri: string }).uri };
  }
  if (!source || typeof source !== "object") return {};
  try {
    return { data: JSON.stringify(source) };
  } catch {
    return {};
  }
}

/**
 * Troféu Lottie estático na web. O `LottieView` do lottie-react-native não
 * serve aqui: `progress` não é suportado na web, `play()` antes de o dotLottie
 * carregar não faz nada e `play(n, n)` faz `setFrame(n)` + `play()`, que num
 * Lottie sem loop recomeça do quadro 0 (o quadro 0 dos gerados é vazio). Aqui
 * o dotLottie é usado direto e só faz `setFrame(frame)`: na hora, se já
 * carregou, ou no evento `load`.
 */
export function StaticLottieWeb({ source, frame, size, onFailure }: StaticLottieWebProps) {
  const [dotLottie, setDotLottie] = useState<DotLottie | null>(null);
  const resolved = useMemo(() => resolveWebSource(source), [source]);
  const hasSource = Boolean(resolved.data || resolved.src);

  useEffect(() => {
    if (!hasSource) {
      onFailure();
      return undefined;
    }
    if (!dotLottie) return undefined;
    const seek = () => {
      try {
        const total = dotLottie.totalFrames;
        const maxFrame = typeof total === "number" && total > 0 ? total - 1 : frame;
        const clamped = Math.min(Math.max(0, frame), maxFrame);
        dotLottie.setFrame(clamped);
      } catch {
        onFailure();
      }
    };
    const fail = () => onFailure();
    dotLottie.addEventListener("load", seek);
    dotLottie.addEventListener("loadError", fail);
    if (dotLottie.isLoaded) seek();
    return () => {
      dotLottie.removeEventListener("load", seek);
      dotLottie.removeEventListener("loadError", fail);
    };
  }, [dotLottie, frame, hasSource, onFailure]);

  if (!hasSource) return null;

  return (
    <DotLottieReact
      dotLottieRefCallback={setDotLottie}
      data={resolved.data}
      src={resolved.src}
      autoplay={false}
      loop={false}
      // flexShrink 0: o div fica maior que a caixa (1,45×) e não pode encolher
      style={{ width: size, height: size, flexShrink: 0 }}
    />
  );
}
