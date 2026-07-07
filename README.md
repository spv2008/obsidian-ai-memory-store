# AI Memory Store

MCP server for AI agent memory — structured Obsidian vault recall and persistence.

This Obsidian plugin exposes an authenticated [Model Context Protocol](https://modelcontextprotocol.io/) server. Agents use **memory-native tools** (`memory_bootstrap`, `memory_recall`, `memory_upsert`, and others) instead of generic vault read/write chains. The vault layout follows **Memory Schema v1** from the [`obsidian-memory` skill](https://github.com/spv2008/obsidian-ai-memory-store/blob/main/plans/obsidian-ai-memory-store/master-plan.md#memory-schema-v1).

**Delivery plan:** [plans/obsidian-ai-memory-store/master-plan.md](plans/obsidian-ai-memory-store/master-plan.md)

## Quick start

1. Install and enable **AI Memory Store** in Obsidian (`obsidian-ai-memory-store`).
2. Open **Settings → AI Memory Store** and copy your API key.
3. Connect your MCP client to the HTTPS endpoint (default):

```
https://127.0.0.1:27124/mcp/
```

Pass the API key as a bearer token on every request:

```
Authorization: Bearer <your-api-key>
```

### HTTPS certificate trust

The plugin uses a self-signed certificate for local HTTPS. MCP clients must trust it (or use the optional HTTP server for local development only).

1. Download the certificate from the plugin settings page, or open:
   ```
   https://127.0.0.1:27124/obsidian-local-rest-api.crt
   ```
   (while Obsidian is running with the plugin enabled)
2. Import it into your OS or MCP client trust store as a **trusted root / CA**, not just a single-site exception where possible.
3. Restart the MCP client after trusting the certificate.

For local development without trusting the certificate, enable **Enable non-encrypted (HTTP) server** in plugin settings and use:

```
http://127.0.0.1:27123/mcp/
```

Do not expose the HTTP server to untrusted networks. The API key is still required.

## MCP client configuration

### Cursor

Add to `~/.cursor/mcp.json` or `.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "obsidian-ai-memory-store": {
      "url": "https://127.0.0.1:27124/mcp/",
      "headers": {
        "Authorization": "Bearer <your-api-key>"
      }
    }
  }
}
```

### Claude Code

```sh
claude mcp add --transport http obsidian-ai-memory-store https://127.0.0.1:27124/mcp/ \
  --header "Authorization: Bearer <your-api-key>"
```

The plugin settings tab also shows a sample `mcpServers` JSON block you can paste into client config.

## Memory Schema v1

```
memory/projects/{project}/
  short-term/current-task.md
  short-term/conversation.context.md
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
plans/{task-id}-{brief-description}/{NN}-{phase}.md
manual-test-plans/{feature-name}/plan.md
manual-test-plans/{feature-name}/insomnia.json
```

`task-id` links specifications, architecture, and plans. `feature-name` links manual-test plans.

Workflow guidance for agents lives in the **obsidian-memory** skill. Keep your local skill install in sync with the MCP tool table below (see [AGENTS.md](AGENTS.md)).

## MCP tools

| Tool | Description |
|---|---|
| `memory_status` | Health check — plugin version and service name |
| `memory_bootstrap` | Session start: registers, daily log, current task, linked artifact excerpts |
| `memory_recall` | Ranked excerpt-only retrieval across project memory and artifacts |
| `memory_get_workflow` | Resolve a task id to spec, architecture, plan, manual-test, and related decisions |
| `memory_upsert` | Create or update project memory files and sections with optional heading dedupe |
| `memory_write_decision` | Write an atomic decision note and register row, with optional supersede |
| `memory_write_specification` | Write `specifications/{task-id}-{feature}/spec.md` |
| `memory_write_architecture` | Write `architecture/{task-id}-{feature}/proposal.md` |
| `memory_write_plan` | Write `plans/{task-id}-{description}/master-plan.md` or a phase file |
| `memory_write_manual_test` | Write `manual-test-plans/{feature}/plan.md` or `insomnia.json` |
| `memory_start_task` | Park active task if needed, write `current-task.md`, append register row |
| `memory_archive_task` | Archive `current-task.md` to `tasks/`, update register, clear current task |
| `memory_find` | Scoped keyword search with excerpt-only hits |
| `vault_read` | Full file read when recall excerpts are insufficient |

## Development

```sh
npm install
npm test
npm run build
```

Integration tests require a live Obsidian instance with the HTTP server enabled:

```sh
OBSIDIAN_API_KEY=<key> npm run test:integration
```

Agent workflow for contributors: [AGENTS.md](AGENTS.md)

## Relationship to Local REST API

This plugin uses plugin ID `obsidian-ai-memory-store` and can coexist with the original [Local REST API](https://github.com/coddingtonbear/obsidian-local-rest-api) plugin. The generic REST API surface has been removed from this fork.

## License

MIT — see [LICENSE](LICENSE).
