---
title: 'Stories 2.5 e 2.6 — lint sem erros'
type: 'chore'
created: '2026-10-29'
status: 'done'
baseline_commit: '55b48ce'
---

## Intent

As Stories 2.5 e 2.6 mediram 176 erros de lint em `scripts/` e pastas de ferramentas e 15 em `src/` e `app/`. Na `dev` de hoje a maior parte já tinha sido resolvida (`9e4b818` zerou os erros de `src/` e `app/`; o bloco de globais do Node para `scripts/**/*.js` já existia). Restava 1 erro (`no-undef` em `.claude/skills/.../tea-enforce.cjs`) porque as pastas de ferramentas não estavam no `ignores`.

## Mudança

- `eslint.config.js`: `ignores` ganha `.claude/**`, `.agent/**`, `.agents/**`, `_bmad/**`, `_bmad-output/**` e `.expo/**` (tipos gerados pelo Expo). Nada mais muda.

## Verification

- `npx eslint .`: 0 erros, 12 avisos (antes: 1 erro, 13 avisos).
- `npx expo lint`: 0 erros, 8 avisos.
- Regra contra segredo em `EXPO_PUBLIC_*` continua ativa: arquivo de sonda com `process.env.EXPO_PUBLIC_API_SECRET` acusa `no-restricted-syntax` (sonda removida).
- Story 2.6: os 3 componentes com hook condicional citados (`DebugTools`, `AnimatedSeasonalTrophy`, `WishlistSearchWebView`) já não têm erro de `rules-of-hooks`; nada a mudar.
- Avisos restantes (variáveis não usadas em `scripts/trophy-lot-*.js`, ordem de import em testes) não bloqueiam e ficam fora do gate da 2.8.
