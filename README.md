# AI Memory Store

MCP server for AI agent memory — structured Obsidian vault recall and persistence.

This plugin exposes an authenticated [Model Context Protocol](https://modelcontextprotocol.io/) server from Obsidian. It implements the vault schema defined by the `obsidian-memory` skill and is being restructured from the upstream Local REST API project into a memory-first MCP server.

**Delivery plan:** [plans/obsidian-ai-memory-store/master-plan.md](plans/obsidian-ai-memory-store/master-plan.md)

## Quick start

1. Install and enable **AI Memory Store** in Obsidian (`obsidian-ai-memory-store`).
2. Open **Settings → AI Memory Store** and copy your API key.
3. Connect your MCP client to the MCP endpoint (HTTPS by default):

```
https://127.0.0.1:27124/mcp/
```

Pass your API key as a bearer token:

```
Authorization: Bearer <your-api-key>
```

For local development without trusting the self-signed certificate, enable the insecure HTTP server in plugin settings and use:

```
http://127.0.0.1:27123/mcp/
```

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

## MCP tools

| Tool | Description |
|---|---|
| `memory_status` | Health check — returns plugin version and service name |
| `memory_bootstrap` | Load project memory bundle for session start (registers, daily log, active-work excerpts) |
| `memory_recall` | Ranked excerpt-only retrieval across project memory and artifact sources |
| `memory_get_workflow` | Resolve a task id to spec, architecture, plan, manual-test artifacts, and related decisions |
| `memory_upsert` | Create or update project memory files and sections with optional heading dedupe |
| `memory_write_decision` | Write an atomic decision note and register row, with optional supersede |
| `memory_write_specification` | Write `specifications/{task-id}-{feature}/spec.md` |
| `memory_write_architecture` | Write `architecture/{task-id}-{feature}/proposal.md` |
| `memory_write_plan` | Write `plans/{task-id}-{description}/master-plan.md` or a phase file |
| `memory_write_manual_test` | Write `manual-test-plans/{feature}/plan.md` or `insomnia.json` |

## Development

```sh
npm install
npm test
npm run build
```

Integration tests require a live Obsidian instance:

```sh
OBSIDIAN_API_KEY=<key> npm run test:integration
```

## Relationship to Local REST API

This plugin uses a new Obsidian plugin ID (`obsidian-ai-memory-store`) and can coexist with the original [Local REST API](https://github.com/coddingtonbear/obsidian-local-rest-api) plugin. The generic REST API surface has been removed from this fork.

## License

MIT — see [LICENSE](LICENSE).
