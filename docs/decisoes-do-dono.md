# Decisões do dono

Registro de decisões de produto e de processo, na ordem em que foram tomadas.
Cada item cita a story ou o commit que depende dela.

## 2026-10-15

### Valores de XP vigentes (Story 2.1)

Os valores atuais do `XP_TABLE` em `packages/gamification/src/xpEngine.ts` são os corretos.
Os testes foram alinhados ao motor, e nenhuma regra de XP muda por causa disso.

| Ação | XP |
|---|---|
| `transaction_logged` | 5 |
| `budget_adherence` | 10 |
| `mission_completed` | 30 |
| `daily_consistency` | 10 |
| `streak_bonus` | 15 |
| `season_bonus` | 50 |

Aderência 50/30/20 perfeita: 10 (poupança ≥ 20%) + 5 (bônus de saúde) = 15 XP.

### Critério "sem CLIENT_SECRET" (Story 1.1)

O `git grep CLIENT_SECRET` deve vir vazio, exceto em `CHANGELOG.md` e em
`docs/roadmap/06-fix-google-drive.md`, que o citam só como registro histórico.

### Integração (todas as stories)

Sem branch nem PR por story: commits sobre `origin/dev` e `git push origin HEAD:dev`,
sempre como fast-forward.

### Escopo da Story 1.2

Além de `targetSdkVersion` e `compileSdkVersion` 36, entram:
- `npx expo install --check`, para os 4 patches do SDK 54 (`expo`, `expo-constants`,
  `expo-file-system`, `expo-local-authentication`) com `package-lock.json` atualizado;
- regerar o patch do `expo-asset` para a versão instalada (12.0.13), limpando o aviso do `patch-package`.

## 2026-10-16

### Exclusão de dados no Data safety (Story 1.5, D19)

À pergunta da Play "o usuário pode pedir a exclusão dos dados?", a resposta é **"Não"**.
O DOMUS não guarda dados em servidor próprio; o que vai a relays, provedores de IA e Drive
fica fora do alcance do desenvolvedor, e as estatísticas do Firebase são opcionais
(desligadas por padrão) e anônimas. Não haverá story para mostrar o ID da instalação.
O reset do app apaga os dados do aparelho, como a política explica.

