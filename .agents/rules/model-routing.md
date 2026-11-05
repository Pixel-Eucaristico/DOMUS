---
trigger: always_on
---
# Roteamento de modelos (custo)

Ao receber uma tarefa, delegue via `invoke_subagent` ao agente adequado:

| Tarefa | Agente |
|---|---|
| Arquitetura, sync Google Drive, migrações Drizzle, parser NFC-e, bugs difíceis, bmad-architecture/prd/code-review | `domus-architect` (Opus) |
| Telas, componentes, hooks, testes, correções simples, bmad-build | `domus-dev` (Sonnet) |
| Renomear, formatar, docs, changelog, buscas | `domus-light` (Gemini Flash) |

Se a sessão principal já estiver no modelo certo, execute diretamente. Em caso de dúvida, use `domus-dev`.

# Git e BMad Workflows

Sempre mantenha o `git status` limpo antes de iniciar workflows do BMad (`/bmad-build`, `/bmad-build-auto`), fazendo commit das alterações de configuração pendentes quando necessário.
