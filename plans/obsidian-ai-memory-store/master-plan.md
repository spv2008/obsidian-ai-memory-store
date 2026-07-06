# Obsidian AI Memory Store — Restructure & Memory MCP

## Metadata

Task ID: N/A  
Status: Complete  
Plugin ID: `obsidian-ai-memory-store`  
Repo: `obsidian-ai-memory-store`

## Goal

Restructure this fork from a generic Local REST API plugin into **Obsidian AI Memory Store** — an MCP-first Obsidian plugin that implements the `obsidian-memory` skill vault schema, shifting retrieval and write orchestration to the server so agents use less context and fewer round-trips.

## Scope

- Rebrand plugin to `obsidian-ai-memory-store` (new manifest ID)
- Remove generic REST API, OpenAPI docs pipeline, and extension API
- Slim HTTP server to health check, certificate download, and `/mcp/` only
- Keep and trim vault I/O, MCP session transport, HTTPS + bearer auth
- Implement memory-native MCP tools (bootstrap, recall, workflow, find, upsert, writes, task lifecycle)
- Hardcode Memory Schema v1 from the `obsidian-memory` skill (no path configuration in v1)
- Include project memory **and** artifact trees: `specifications/`, `architecture/`, `plans/`, `manual-test-plans/`
- Unit tests for parsers and memory logic; slim MCP integration tests
- Update README and `AGENTS.md` for the new product

## Out of Scope

- Configurable vault paths or frontmatter schema (v2)
- Generic REST endpoints or generic MCP vault tools (except optional `vault_read` escape hatch)
- `learning/`, `retro/`, `learning-objectives.md` (v1.1 — same patterns)
- Semantic / embedding search
- Upstream merge with Local REST API
- Auto project-name detection from git/cwd (agent passes `project`)

## Assumptions

- The `obsidian-memory` skill vault layout is the v1 contract and will be kept in sync with this plugin
- Agents connect via MCP over HTTP(S) with bearer token (Cursor, Claude Code, etc.)
- A new plugin ID allows coexistence with the original Local REST API plugin during transition
- Read-back verification after writes is **not** required (removed from skill)
- MCP tool descriptions should be concise; server does ranking, parsing, and dedupe logic

## Open Questions

- [ ] **Resolved:** Plugin ID → `obsidian-ai-memory-store`
- [ ] Certificate download path: keep legacy `/obsidian-local-rest-api.crt` for compatibility or rename to match new plugin?
- [ ] Include `vault_read` as escape hatch in v1, or rely entirely on excerpt-based recall?
- [ ] Supersede on duplicate decision slug: error (recommended) vs replace?

## Impacted Files

| Path | Action |
|---|---|
| `manifest.json` | Rebrand to `obsidian-ai-memory-store` |
| `package.json` | Rename, remove docs build scripts |
| `src/main.ts` | Use slim server; remove extension API |
| `src/requestHandler.ts` | **Delete** — replace with `src/server/httpServer.ts` |
| `src/api.ts` | **Delete** |
| `src/mcpHandler.ts` | Move → `src/mcp/handler.ts`; memory tools only |
| `src/vaultOperations.ts` | Move → `src/vault/vaultOperations.ts`; trim |
| `src/memory/` | **New** — all domain logic |
| `docs/` | **Delete** — OpenAPI pipeline |
| `src/requestHandler.test.ts` | **Delete** |
| `src/integration/*.test.ts` | Most **Delete**; rewrite `mcp.test.ts` |
| `AGENTS.md` | Rewrite for memory plugin workflow |
| `README.md` | Rewrite for memory MCP |

## Target Directory Layout

```
src/
├── main.ts
├── settings.ts
├── constants.ts
├── server/
│   ├── httpServer.ts
│   ├── auth.ts
│   └── certificates.ts
├── vault/
│   ├── vaultOperations.ts
│   ├── types.ts
│   └── errors.ts
├── mcp/
│   ├── handler.ts
│   ├── registerTools.ts
│   └── textResult.ts
└── memory/
    ├── paths.ts
    ├── schema.ts
    ├── parse/
    ├── artifacts/
    ├── bootstrap.ts
    ├── recall.ts
    ├── workflow.ts
    ├── find.ts
    ├── upsert.ts
    ├── decisions.ts
    ├── artifactsWrite.ts
    ├── tasks.ts
    └── types.ts
```

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

**Correlation:** `task-id` links spec, architecture, and plans. `feature-name` links manual-test-plans (server infers from sibling folders when possible).

## MCP Tool Surface (v1)

### Read / recall

| Tool | Purpose |
|---|---|
| `memory_bootstrap` | Session start: project memory + linked artifacts from `current-task.md` |
| `memory_recall` | Ranked, excerpt-only retrieval across memory + artifacts |
| `memory_get_workflow` | Task-id → spec / architecture / plan / manual-test chain |
| `memory_find` | Scoped keyword fallback |

### Write

| Tool | Purpose |
|---|---|
| `memory_upsert` | Project memory files (daily, lessons, patterns, etc.) |
| `memory_write_decision` | Atomic decision note + register row (+ supersede) |
| `memory_write_specification` | `specifications/.../spec.md` |
| `memory_write_architecture` | `architecture/.../proposal.md` |
| `memory_write_plan` | Master plan or phase file |
| `memory_write_manual_test` | `plan.md` or `insomnia.json` |
| `memory_start_task` | Park current if needed, write `current-task.md`, register row |
| `memory_archive_task` | Archive to `tasks/`, update register, clear current |

### Escape hatch (optional)

| Tool | Purpose |
|---|---|
| `vault_read` | Full file read when excerpts are insufficient |

## Risks

- **Breaking Local REST API users** (High) — Mitigation: new plugin ID `obsidian-ai-memory-store`; document as separate product
- **MCP session regressions during restructure** (Medium) — Mitigation: PR 1 moves session code verbatim; stub tool only; integration smoke test
- **Register table corruption on write** (Medium) — Mitigation: parser unit tests; validate rows; idempotent patch options
- **Large artifact files bloating bootstrap** (Medium) — Mitigation: excerpts only; configurable `excerptLength`; never full spec at bootstrap
- **Upstream bugfix drift** (Low) — Mitigation: cherry-pick vault fixes only when needed

## Verification Strategy

- **Automated:** `npm test` before every commit; unit tests for parsers, recall ranking, write orchestration; MCP handler tests with mocks
- **Integration:** Slim `src/integration/mcp.test.ts` against live Obsidian when available (`npm run test:integration`)
- **Manual:** Install plugin in Obsidian; connect Cursor/Claude MCP; call `memory_bootstrap` and `memory_recall` against a fixture vault layout

## Dependencies After Restructure

**Keep:** `@modelcontextprotocol/sdk`, `express`, `cors`, `markdown-patch`, `node-forge`, `zod`, `glob-to-regexp`, `json-logic-js` (internal)

**Remove:** `obsidian-daily-notes-interface`, OpenAPI/jsonnet dev tooling, REST-related integration tests

## Timeline Estimate

| Phase | Effort |
|---|---|
| 01 Foundation restructure | 1–2 days |
| 02 Vault + parsers | 1–2 days |
| 03 Read path | 2–3 days |
| 04 Write path | 2–3 days |
| 05 Tasks + find | 1–2 days |
| 06 Polish + docs | 1 day |
| **Total** | **~8–12 days** |

## Phase Checklist

- [x] Phase 01: Foundation restructure
  - File: [01-foundation-restructure.md](01-foundation-restructure.md)
- [ ] Phase 02: Vault layer and parsers
  - File: [02-vault-and-parsers.md](02-vault-and-parsers.md)
- [ ] Phase 03: Read path (bootstrap, recall, workflow)
  - File: [03-read-path.md](03-read-path.md)
- [ ] Phase 04: Write path (upsert, decisions, artifacts)
  - File: [04-write-path.md](04-write-path.md)
- [ ] Phase 05: Task lifecycle and find
  - File: [05-tasks-and-find.md](05-tasks-and-find.md)
- [ ] Phase 06: Settings, docs, and skill alignment
  - File: [06-polish-and-docs.md](06-polish-and-docs.md)

## Execution Handoff

**Next recommended action:** Begin Phase 01 / Slice 1 — rebrand manifest and package metadata.

**Suggested first PR:** Phase 01 complete (foundation restructure, MCP connects, stub tool works).

**Key risks before starting:** MCP session code must not be rewritten in PR 1; move verbatim.

**Parallel opportunities:** None for Phase 01. Phase 02 parser tests can be written in parallel with vault trim within Phase 02.
