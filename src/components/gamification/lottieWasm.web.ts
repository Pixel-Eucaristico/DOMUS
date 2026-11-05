import { setWasmUrl } from "@lottiefiles/dotlottie-react";

/**
 * Na web o Lottie usa um renderizador em WebAssembly. Por padrão ele seria
 * baixado do jsdelivr/unpkg, enviando o IP de quem abre o app a terceiros;
 * por isso o arquivo vai junto do build (`public/dotlottie-player.wasm`,
 * copiado de `@lottiefiles/dotlottie-web`, mesma versão fixada no package.json).
 */
export function configureLottieWasm(): void {
  setWasmUrl("/dotlottie-player.wasm");
}
