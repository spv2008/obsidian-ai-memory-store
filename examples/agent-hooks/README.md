# Agent session hooks (reference)

Install these **globally** on your machine. Do not commit live hooks into application repos.

## Install the script

1. Copy `memory-session-hook.ps1` to e.g. `%USERPROFILE%\.config\obsidian-ai-memory-store\memory-session-hook.ps1`
2. Copy `config.env.example` → `config.env` in the same folder (optional) and fill in values
3. For multi-repo (home), copy `projects.json.example` → `projects.json` and map path prefixes → project slugs

## Environment

| Variable | Purpose |
|---|---|
| `OBSIDIAN_API_KEY` | Bearer token (required) |
| `OBSIDIAN_MCP_URL` | Default `https://127.0.0.1:27126` |
| `OBSIDIAN_MEMORY_PROJECT` | Durable namespace override |
| `OBSIDIAN_MEMORY_CONFIG_DIR` | Config directory (default `~/.config/obsidian-ai-memory-store`) |

**Work (platform):** set plugin **Default project** in Obsidian; hook needs only the API key. Desk is always `memory/short-term/`.

**Home (multi-repo):** use `projects.json` cwd map or set `OBSIDIAN_MEMORY_PROJECT` when switching focus.

## Wire each agent

Merge the matching `*.example` into:

| Agent | Global config |
|---|---|
| Cursor | `~/.cursor/hooks.json` |
| Claude Code | `~/.claude/settings.json` |
| Copilot CLI | `~/.copilot/hooks/obsidian-memory.json` |
| Codex CLI | `~/.codex/hooks.json` |

Update the script path in each example to your install location.

## Endpoint

`GET /memory/session-context?project={optional}`

Returns JSON including a `markdown` field used as `additional_context` / `additionalContext`.
