---
title: 'Revisão em party (29/10/2026) — CI, Epic 2, Story 4.1 e site'
status: 'in-progress'
baseline_commit: 'ed2591e'
---

## Escopo

Code review em modo party (Code Review Crew: Vex 🔒 segurança, Grumbal 😤 adversário, Boundary 🌶️ casos de borda, Yui 🎯 artesão, Dana 🚢 pragmática), cada um lendo o código sozinho antes da conversa. Revisado: `78cd444` (Stories 2.7/2.8), `55b48ce` e `ec1e0fa` (fechamento 2.1–2.6), `f7894d9`/`c5652b7` (AGENTS.md), `ed2591e` (Story 4.1) e o site `pixel-eucaristico` `24b2da3`. Nenhum High.

## Decisões do dono (29/10)

- Aplicar os itens 1 a 7; os itens de "depois" vão para o `deferred-work.md`.
- O disparo manual do build Android ganha a opção "publicar pré-release" (marcada por padrão); desmarcada, só gera o APK como artefato.

## Triagem

| # | Achado | Quem | Decisão |
|---|--------|------|---------|
| P1 | Actions por tag móvel no job com keystore e `contents: write`; token persistido no `.git/config` durante o `npm ci`; `build-web` e `build-ios` sem `permissions` mínimas | Vex | **patch**: fixar todas as actions por SHA (tag em comentário), `persist-credentials: false` em todos os checkouts, `permissions: contents: read` nos jobs que não publicam e no `build-ios.yml`, `contents: write` só no job que publica, Dependabot para `github-actions` |
| P2 | Disparo manual publica pré-release sempre | Grumbal | **patch** (decisão do dono): input `publish` (boolean, padrão `true`) no `workflow_dispatch`; o passo de pré-release só roda com `publish` verdadeiro |
| P3 | `nodeVersion.test.ts` dá `require("semver")` não declarado; leitura de YAML por regex com falsos positivos e negativos | Grumbal, Yui, Boundary | **patch**: comparação de versão sem `semver`; ler os workflows com parser YAML (dependência já presente, ou `semver`/`yaml` declarados em `devDependencies` com `package-lock.json`) e inspecionar só os passos `actions/setup-node`; aceitar `'.nvmrc'`, `./.nvmrc`, comentário; recusar `node-version` em mapa em linha |
| P4 | `build-ios.yml` sem gate | Grumbal, Boundary | **patch**: job `gate` com `uses: ./.github/workflows/gate.yml` e `needs: gate` |
| P5 | `parseGroupSecret` recusa traços parecidos com hífen e invisíveis; aceita `ı`/`ſ` pela dobra de caixa; buffer do gerador não zerado | Boundary, Grumbal | **patch**: remover `[­‐-―−​-‍⁠﻿]` com espaços e hífens; recusar qualquer código > 127 depois disso (`invalid-char`); `fill(0)` no buffer do gerador depois da cópia; testes |
| P6 | Critérios de aparelho das 2.2, 2.3 e 2.6 fechados sem conferência; 2.8 usa `eslint .` + `tsc` em vez de `expo lint` sem `tsc` | Grumbal | **patch**: registrar na spec 2.1–2.4/2.5–2.6 e no checklist da Story 1.3 a transferência; registrar o desvio da 2.8 na spec 2.7/2.8 |
| P7 | AGENTS.md: bloco gerenciado editado à mão; "comparar com o baseline" sobrando; "a CI" vale só para o GitHub (GitLab segue Node 20) | Yui, Grumbal | **patch**: ajustar as frases; atualizar o carimbo de verificação do bloco |
| S1 | Limite por IP usa o 1º valor do `X-Forwarded-For`; sem cabeçalho todos caem em `"desconhecido"`; mapa sem teto | Vex, Boundary, Grumbal | **patch**: IP de `x-vercel-forwarded-for`/`x-real-ip`, senão o último valor do XFF; sem IP, não limitar por IP (aviso no log); teto de entradas no mapa |
| S2 | Corpo sem teto de tamanho | Vex, Boundary | **patch**: recusar `content-length` > 16 KB e ler com teto (413) |
| S3 | Envio que falhou conta no limite | Boundary, Grumbal | **patch**: contar só depois de enviar com sucesso |
| S4 | `Reply-To` aceita nome de exibição e grupo | Vex | **patch**: e-mail só com endereço simples (sem `<>,;:"()[]\` e espaço), `replyTo: { address }` |
| S5 | Campo-armadilha pode ser preenchido pelo navegador | Boundary | **patch**: nome neutro, `autoComplete="new-password"`, aviso no log quando descartar |
| S6 | Envio duplo no mesmo quadro; cliente sem `trim`; contagem de caracteres por UTF-16; `slice` partindo emoji no assunto | Boundary, Grumbal | **patch**: trava por `useRef`, `trim` antes de validar no cliente, contar por pontos de código nos dois lados, corte seguro no assunto |
| S7 | Contrato do formulário duplicado entre cliente e rota | Yui | **patch**: `app/domus/suporte/feedbackContract.ts` com tipos e limites, importado pelos dois |
| D44 | Limite em memória por instância (serverless) e sem captcha | Vex, Grumbal | **defer** |
| D45 | Política no site é a 5ª cópia, sem teste de igualdade | Yui | **defer** |
| D46 | Base32 e ordem da curva escritos à mão na 4.1 | Yui (Vex e Grumbal contra) | **reject**: vetores conferidos de forma independente; trocar por dependência transitiva promovida é risco sem ganho agora |
| D47 | Página de suporte inteira como client component | Yui | **defer** |
| D48 | Gate roda duas vezes num push na `main` | Yui, Grumbal, Boundary | **defer** |
