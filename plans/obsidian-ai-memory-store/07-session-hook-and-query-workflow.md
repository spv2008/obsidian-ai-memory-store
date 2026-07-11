# Phase 07: Global Session, Durable Namespaces, Hooks, Query-on-Demand

## Objective

Ship **Memory Schema v1.1**:

- **Short-term desk is always global** — `memory/short-term/` (current task + conversation context)
- **Projects hold durable memory only** — decisions, tasks register, daily, lessons, patterns
- **Work (platform):** one namespace (e.g. `platform`) + global desk
- **Home (multi-repo):** many namespaces; **working directory / env** selects which project to query for durable data
- Slim session-hook injection; agents query decisions/tasks (never browse indexes)
- Session baseline includes **current task + conversation + linked artifacts** from the current task

## Why This Phase

v1 nested short-term under each project. That fights “one desk” at work and is unnecessary if home uses cwd only to pick **durable** namespace. Short-term moves out of projects. Bootstrap register dumps go away in favour of hooks + query-on-demand.

## Scope

- Schema v1.1: `memory/short-term/` only for short-term; remove use of `projects/*/short-term/` (migrate / document)
- Task lifecycle writes desk to `memory/short-term/`; register stays under `projects/{project}/tasks/`
- `defaultProject` setting; hook project from **cwd mapping / env** (home) or default (work)
- `memorySessionContext()` includes conversation, current task, **activeWork** (wikilink excerpts), latest daily for resolved namespace
- HTTP + MCP session context; multi-agent hook examples under `examples/agent-hooks/`
- Ports 27126 / 27127
- README, skill, fixtures, tool descriptions

## Out of Scope

- Prompt-aware start hooks (user names focus in chat → recall)
- Per-project short-term desks
- `sessionScope` setting (desk is always global)
- New query wrapper tools (use recall/find/workflow)
- Semantic search
- Cloud agents
- Bash hook variant
- Automatic vault file migration (document manual move)

## Coexistence with Local REST API

| Plugin | HTTPS | HTTP |
|---|---|---|
| Local REST API | 27124 | 27123 |
| AI Memory Store | **27126** | **27127** |

## Hook runtime

PowerShell 5.1+ / 7+; skip TLS verify for local self-signed cert.

## Dependencies

Phase 06 merged; Obsidian for smoke tests.

---

## Design

### Memory Schema v1.1

```
memory/
  short-term/                                 # ONLY short-term desk (global)
    current-task.md
    conversation.context.md

  projects/{namespace}/                       # DURABLE ONLY (no short-term)
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

| Concept | Location |
|---|---|
| What I’m doing / conversation | Always `memory/short-term/` |
| Decisions, task history, daily | `memory/projects/{namespace}/` |
| Spec / plan / arch | Vault-root artifacts (linked from current task) |

**Migration from v1:** move `projects/*/short-term/*` → `memory/short-term/` (one desk; if multiple project desks existed, pick active and archive the rest).

### Profiles (usage, not two desk modes)

| Profile | Desk | Durable namespace |
|---|---|---|
| **Work (platform)** | `memory/short-term/` | One: `defaultProject` (e.g. `platform`) |
| **Home (multi-repo)** | `memory/short-term/` | From **cwd** (folder → slug map) or `OBSIDIAN_MEMORY_PROJECT` |

Same schema. Work: Claude open on a parent code directory is fine — hook does not need “which repo”; desk is global; durable queries use `platform` unless the agent passes another `project`.

### How the hook picks `project` (durable only)

Desk never needs a project. Namespace is for daily + telling the agent where to recall.

**Resolution order for namespace:**

1. `OBSIDIAN_MEMORY_PROJECT` env (explicit override)
2. Else **cwd → project map** in user config (e.g. `projects.json`: path prefix → slug). Hook reads process cwd / agent-provided cwd if present in stdin JSON
3. Else plugin `defaultProject`
4. Else omit daily / leave namespace null (desk still injects)

**Work:** skip map; set `defaultProject=platform`. Parent monorepo cwd never has to match a child repo.

**Home:** map e.g. `D:\Dev\obsidian-ai-memory-store` → `obsidian-ai-memory-store`. Opening that folder selects durable memory; desk stays the single global current task.

### Session baseline (hook / `memory_session_context`)

| Field | Source |
|---|---|
| `conversationContext` | `memory/short-term/conversation.context.md` |
| `currentTask` | `memory/short-term/current-task.md` |
| `activeWork` | Wikilinks from current task → excerpted linked specs/plans/arch (same idea as bootstrap `activeWork`) |
| `latestDaily` | `projects/{namespace}/daily/` when namespace resolved |
| `namespace` | Resolved project slug (metadata) |

**Excluded:** register index dumps, parked-task arrays, full decision indexes.

Rationale: with short-term global, the current task is the source of truth for “what’s linked”; inject those excerpts so the agent need not guess. Deeper decisions still via `memory_recall`.

### Task lifecycle

| Write | Path |
|---|---|
| Current task | Always `memory/short-term/current-task.md` |
| Conversation context | Always `memory/short-term/conversation.context.md` |
| Register + archive note | Always `memory/projects/{project}/tasks/…` |

`project` on start/archive = which **namespace’s register** to update (defaults to `defaultProject` if omitted).

### Query-on-demand

| Intent | Tool |
|---|---|
| Decisions by topic | `memory_recall({ project, keywords, sources: ["decisions"] })` |
| Tasks by keyword | `memory_recall({ project, keywords, sources: ["tasks"] })` |
| Resume by task id | `memory_get_workflow({ taskId, project })` |

Skill: never read `*-index.md`. After hook: if user names a focus area, recall that area under the active namespace.

### Plugin settings

| Setting | Default | Purpose |
|---|---|---|
| `defaultProject` | `""` | Durable namespace when env/cwd map miss |

No `sessionScope` — desk is always global.

### Hook flow

```text
sessionStart
  → memory-session-hook.ps1 (user-global install)
  → resolve namespace (env → cwd map → default)
  → GET /memory/session-context?project={namespace?}
  → unified JSON stdout (Cursor / Claude / Copilot / Codex)
```

Examples live under `examples/agent-hooks/` only (no repo dot-folders).

### Bootstrap

Keep for refresh/debug. Update to read desk from `memory/short-term/`; durable fields still take `project`.

---

## Security Considerations

- Session endpoint authenticated like `/mcp/`
- Never commit API keys; cwd map is local user config

## Rollback Notes

- Move session files back under a project short-term if reverting
- Remove new settings/routes/tools

## Phase Acceptance Criteria

- [x] Short-term only under `memory/short-term/`; paths/tests updated
- [x] start/archive write global desk; register namespaced
- [x] Session context includes conversation, current task, activeWork, optional daily
- [x] Hook resolves namespace via env → cwd map → defaultProject
- [x] Ports 27126/27127; examples for four agents
- [x] Skill/README: platform vs home; query-on-demand; migration note
- [x] `npm test` passes

## Phase Risk Level

**Medium**

## Slice Checklist

- [x] [Slice 0: Default ports](#slice-0-default-ports)
- [x] [Slice 1: Schema — global session paths](#slice-1-schema--global-session-paths)
- [x] [Slice 2: Task lifecycle → session desk](#slice-2-task-lifecycle--session-desk)
- [x] [Slice 3: Session context + activeWork + bootstrap](#slice-3-session-context--activework--bootstrap)
- [x] [Slice 4: HTTP endpoint](#slice-4-http-endpoint)
- [x] [Slice 5: MCP tool + defaultProject setting](#slice-5-mcp-tool--defaultproject-setting)
- [x] [Slice 6: Hooks + cwd map](#slice-6-hooks--cwd-map)
- [x] [Slice 7: Docs, skill, fixtures, migration](#slice-7-docs-skill-fixtures-migration)
- [x] [Slice 8: Descriptions and smoke](#slice-8-descriptions-and-smoke)

---

## Slice 0: Default ports

- [ ] Defaults 27126 / 27127; README; UI copy; integration docs

---

## Slice 1: Schema — global session paths

- [ ] `SHORT_TERM_ROOT`, short-term path helpers; stop writing new short-term under projects
- [ ] Fixtures: `memory/short-term/` + durable under `projects/demo/`
- [ ] Unit tests for paths

---

## Slice 2: Task lifecycle → session desk

- [ ] start/archive current-task → `memory/short-term/`
- [ ] Register under `projects/{project}/`
- [ ] `project` optional → `defaultProject`
- [ ] Update `tasks.test.ts`

---

## Slice 3: Session context + activeWork + bootstrap

- [ ] `memorySessionContext()` + markdown formatter
- [ ] Resolve wikilinks from current task → `activeWork` excerpts (reuse bootstrap helper)
- [ ] Bootstrap reads session desk
- [ ] Unit tests

---

## Slice 4: HTTP endpoint

- [ ] `GET /memory/session-context?project=&excerptLength=`
- [ ] Auth; JSON + `markdown`; list on `GET /`

---

## Slice 5: MCP tool + defaultProject setting

- [ ] Settings UI: `defaultProject`
- [ ] `memory_session_context` tool
- [ ] Handler + integration list tests

---

## Slice 6: Hooks + cwd map

```
examples/agent-hooks/
  memory-session-hook.ps1
  README.md
  projects.json.example          # path prefix → slug
  config.env.example
  cursor-hooks.json.example
  claude-settings.hooks.example.json
  copilot-hooks.json.example
  codex-hooks.json.example
```

- [ ] Script: resolve project (env → projects.json vs cwd → omit); call endpoint; unified JSON; fail open
- [ ] Document work (defaultProject only) vs home (cwd map)
- [ ] Install under user config path, not repo dot-folders

---

## Slice 7: Docs, skill, fixtures, migration

- [ ] README schema v1.1 + profiles + hooks
- [ ] Master plan schema section
- [ ] Skill: global desk; namespace for durable; never read indexes; linked work from session
- [ ] Migration: move short-term → `memory/short-term/`

---

## Slice 8: Descriptions and smoke

- [ ] Sharpen tool descriptions
- [ ] `npm test` / integration when available
- [ ] Manual: session → linked activeWork → recall by keyword

---

## Open Questions

- [x] Short-term **only** outside projects (`memory/short-term/`)
- [x] Work = platform-wide durable namespace; home = cwd/env selects durable project
- [x] Session baseline includes linked docs from current task
- [x] Ports 27126/27127; multi-agent hook examples under `examples/agent-hooks/`
- [ ] Exact cwd map format (Recommend: JSON array of `{ "pathPrefix": "...", "project": "..." }`, longest prefix wins)
- [ ] Omitting `project` on start_task → `defaultProject` (Recommend: **yes**)

## Execution Notes

- Branch: `phase-07-global-session`
- Commit per slice; `npm test` before each commit
- Phase 06 merge first
