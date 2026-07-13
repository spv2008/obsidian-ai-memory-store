# AI Memory Store

MCP server for AI agent memory — structured Obsidian vault recall and persistence.

This Obsidian plugin exposes an authenticated [Model Context Protocol](https://modelcontextprotocol.io/) server. Agents use **memory-native tools** (`memory_session_context`, `memory_recall`, `memory_upsert`, and others) instead of generic vault read/write chains. The vault layout follows **Memory Schema v1.1**.

**Delivery plan:** [plans/obsidian-ai-memory-store/master-plan.md](plans/obsidian-ai-memory-store/master-plan.md)

## Quick start

1. Install and enable **AI Memory Store** in Obsidian (`obsidian-ai-memory-store`).
2. Open **Settings → AI Memory Store**, set **Default project** (durable namespace), and copy your API key.
3. Connect your MCP client to the HTTPS endpoint (default):

```
https://127.0.0.1:27126/mcp/
```

Pass the API key as a bearer token on every request:

```
Authorization: Bearer <your-api-key>
```

Defaults use **27126** (HTTPS) / **27127** (HTTP) so this plugin can run alongside Local REST API (27124 / 27123).

### HTTPS certificate trust

The plugin uses a self-signed certificate for local HTTPS. MCP clients must trust it (or use the optional HTTP server for local development only).

1. Download the certificate from the plugin settings page, or open:
   ```
   https://127.0.0.1:27126/obsidian-local-rest-api.crt
   ```
2. Import it into your OS or MCP client trust store as a **trusted root / CA**.
3. Restart the MCP client after trusting the certificate.

For local development without trusting the certificate, enable **Enable non-encrypted (HTTP) server** and use:

```
http://127.0.0.1:27127/mcp/
```

## MCP client configuration

### Cursor

```json
{
  "mcpServers": {
    "obsidian-ai-memory-store": {
      "url": "https://127.0.0.1:27126/mcp/",
      "headers": {
        "Authorization": "Bearer <your-api-key>"
      }
    }
  }
}
```

### Claude Code

```sh
claude mcp add --transport http obsidian-ai-memory-store https://127.0.0.1:27126/mcp/ \
  --header "Authorization: Bearer <your-api-key>"
```

## Memory Schema v1.1

```
memory/
  short-term/                    # Global desk (current task + conversation)
    current-task.md
    conversation.context.md

  projects/{namespace}/          # Durable memory only
    tasks/tasks-index.md
    tasks/YYYY-MM-DD-{slug}[-{task-id}].md
    long-term/decisions-index.md
    long-term/decisions/YYYY-MM-DD-{slug}.md
    long-term/code-patterns.md
    long-term/lessons-learned.md
    long-term/tools-reference.md
    daily/YYYY-MM-DD.md

specifications/{task-id}-{feature-name}/spec.md
architecture/{task-id}-{feature-name}/proposal.md
plans/{task-id}-{brief-description}/master-plan.md
manual-test-plans/{feature-name}/plan.md
```

| Profile | Desk | Durable namespace |
|---|---|---|
| Platform (one product) | `memory/short-term/` | One (`defaultProject`, e.g. `platform`) |
| Multi-repo | `memory/short-term/` | From cwd map / `OBSIDIAN_MEMORY_PROJECT` |

**Migration from v1:** move `memory/projects/*/short-term/*` → `memory/short-term/`.

## Session hooks (optional)

Session-start hooks can inject a slim baseline from `GET /memory/session-context` so agents do not skip orientation. Templates for Cursor, Claude Code, Copilot CLI, and Codex live in [examples/agent-hooks/](examples/agent-hooks/) — install them in your **user** agent config (not as repo dot-folders).

Fallback when hooks are unavailable: call `memory_session_context`.

Do **not** browse `*-index.md` files. Query with `memory_recall` / `memory_find` / `memory_get_workflow`.

## MCP tools

| Tool | Description |
|---|---|
| `memory_status` | Health check — plugin version and service name |
| `memory_session_context` | Global desk + linked active work + optional latest daily |
| `memory_bootstrap` | Full project snapshot (refresh / debug) |
| `memory_recall` | Ranked excerpt retrieval — decisions/tasks by keyword/area |
| `memory_get_workflow` | Task id → spec / architecture / plan / manual-test |
| `memory_upsert` | Create or update project memory or short-term desk files |
| `memory_write_decision` | Write an atomic decision note and register row |
| `memory_write_specification` | Write `specifications/{task-id}-{feature}/spec.md` |
| `memory_write_architecture` | Write `architecture/{task-id}-{feature}/proposal.md` |
| `memory_write_plan` | Write master plan or phase file |
| `memory_write_manual_test` | Write manual-test plan or insomnia export |
| `memory_start_task` | Park if needed, write global current-task, register row |
| `memory_archive_task` | Archive current-task to project `tasks/`, clear desk |
| `memory_find` | Scoped keyword search with excerpt-only hits |
| `vault_read` | Full file read when excerpts are insufficient |

## Development

```sh
npm install
npm test
npm run build
```

Integration tests (HTTP default port **27127**):

```sh
OBSIDIAN_API_KEY=<key> npm run test:integration
```

Agent workflow for contributors: [AGENTS.md](AGENTS.md)

## Relationship to Local REST API

This is a **fork** of [obsidian-local-rest-api](https://github.com/coddingtonbear/obsidian-local-rest-api) with a **new plugin ID**. Both can be installed side by side when ports differ (defaults: Memory Store 27126/27127, Local REST API 27124/27123).
