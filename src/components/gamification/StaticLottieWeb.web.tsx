import React, { useEffect, useMemo, useState } from "react";
import { DotLottieReact, type DotLottie } from "@lottiefiles/dotlottie-react";

interface Props {
  source: unknown;
  /** Quadro mostrado (o último: staticLottieFrame). */
  frame: number;
  size: number;
  onFailure: () => void;
}

/**
 * Troféu Lottie estático na web. O `LottieView` do lottie-react-native não
 * serve aqui: `progress` não é suportado na web, `play()` antes de o dotLottie
 * carregar não faz nada e `play(n, n)` faz `setFrame(n)` + `play()`, que num
 * Lottie sem loop recomeça do quadro 0 (o quadro 0 dos gerados é vazio). Aqui
 * o dotLottie é usado direto e só faz `setFrame(frame)`: na hora, se já
 * carregou, ou no evento `load`.
 */
export function StaticLottieWeb({ source, frame, size, onFailure }: Props) {
  const [dotLottie, setDotLottie] = useState<DotLottie | null>(null);
  const data = useMemo(() => (typeof source === "string" ? source : JSON.stringify(source)), [source]);

  useEffect(() => {
    if (!dotLottie) return undefined;
    const seek = () => dotLottie.setFrame(frame);
    const fail = () => onFailure();
    dotLottie.addEventListener("load", seek);
    dotLottie.addEventListener("loadError", fail);
    if (dotLottie.isLoaded) seek();
    return () => {
      dotLottie.removeEventListener("load", seek);
      dotLottie.removeEventListener("loadError", fail);
    };
  }, [dotLottie, frame, onFailure]);

  return (
    <DotLottieReact
      dotLottieRefCallback={setDotLottie}
      data={data}
      autoplay={false}
      loop={false}
      // flexShrink 0: o div fica maior que a caixa (1,45×) e não pode encolher
      style={{ width: size, height: size, flexShrink: 0 }}
    />
  );
}
