---
title: 'Story 11.9: Fazer o Lottie funcionar na web'
type: 'bugfix'
created: '2026-10-21'
status: 'done'
baseline_commit: '8b397fe3668684f599c0caf26f8c2cb343e70c07'
route: 'oneshot'
review_loop_iteration: 0
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** O build web falha (D7): `lottie-react-native` 7.3.1 importa `@lottiefiles/dotlottie-react` no `index.web.js`, e o pacote não está instalado. O dono decidiu manter o Lottie também na web (D-L1 = a, Sprint Change de 21/10).

**Approach:** Instalar `@lottiefiles/dotlottie-react` na faixa pedida pelo `lottie-react-native` (`^0.13.5`), atualizando `package.json` e `package-lock.json` com npm 10, e confirmar que `npx expo export --platform web` empacota.

</frozen-after-approval>

## Implementation Notes

- `@lottiefiles/dotlottie-react` fixado em `0.13.5` (peer `^0.13.5` do `lottie-react-native` 7.3.6 resolvido), com npm 10; o `package-lock.json` só ganha `dotlottie-react` 0.13.5 e `dotlottie-web` 0.44.0.
- Descoberto na revisão: na web o renderizador `dotlottie-player.wasm` seria baixado do jsdelivr/unpkg, mandando o IP de quem abre o app a terceiros sem opção (contra o Epic 12) e falhando sem rede. O arquivo foi copiado para `public/dotlottie-player.wasm` (1,9 MB, mesma versão 0.44.0) e `src/components/gamification/lottieWasm.web.ts` chama `setWasmUrl("/dotlottie-player.wasm")`; no celular, `lottieWasm.ts` não faz nada. Ao atualizar o `dotlottie-react`, copiar o `.wasm` da nova versão.
- Verificado: `npx expo export --platform web` empacota (antes falhava, D7); o build web inclui `dotlottie-player.wasm` e o bundle chama `setWasmUrl` com o arquivo local, servido como `application/wasm`. Não vi um troféu animando no navegador (a tela de troféus só aparece depois da introdução). O `dotlottie-react` só é importado por arquivos `.web` (`lottie-react-native/index.web.js` e `lottieWasm.web.ts`), então o Android não o empacota; o build Android de release fica a cargo da CI.
- `npx tsc --noEmit` exit 0; `npx vitest run` 778 passam.

## Review Triage Log

| Achado | Veredito | Evidência |
|---|---|---|
| Renderizador `.wasm` baixado de jsdelivr/unpkg | high | `dotlottie-web/dist/index.js` usa CDN por padrão; IP a terceiros sem opção e sem funcionar offline. **patch**: `.wasm` servido pelo próprio build. |
| Faixa `^0.13.5` num pacote 0.x | low | Correção direta. **patch**: versão exata. |
| D7 continua aberto | low | Correção direta. **patch**: marcado resolvido. |
| Spec sem critérios nem verificação | low | Rota oneshot usa spec enxuta; verificação registrada nas notas. rejeitado |
| Spec cita 7.3.1 em vez de 7.3.6 resolvido | low | Bloco congelado; as notas registram 7.3.6. rejeitado |
| Sem checagem do Android | low | `dotlottie-react` só entra por arquivos `.web`; a CI roda o release. rejeitado |
| `context` sem a Sprint Change | low | Sem dano; a decisão está no Intent. rejeitado |
