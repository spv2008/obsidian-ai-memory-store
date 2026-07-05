# Phase 03: Read Path (Bootstrap, Recall, Workflow)

## Objective

Implement MCP read/recall tools so agents load session context and find relevant memory in one or two calls instead of chaining generic vault operations.

## Why This Phase

Highest token savings for agents. Read-only tools are lower risk than writes. Validates parsers against real orchestration before write path.

## Scope

- `memory_bootstrap`
- `memory_recall`
- `memory_get_workflow`
- MCP registration in `src/mcp/registerTools.ts`
- Unit tests with fixture vault under `src/memory/__fixtures__/`

## Out of Scope

- Write tools (Phase 04)
- `memory_find` (Phase 05)
- `vault_read` escape hatch (Phase 05)

## Dependencies

- Phase 02 complete

## Security Considerations

- All reads scoped to vault; no path traversal via `project` or `taskId` params
- Excerpt length capped server-side with sensible maximum

## Rollback Notes

- Remove tool registration to disable; no vault mutation from this phase

## Phase Acceptance Criteria

- [ ] `memory_bootstrap({ project })` returns project memory bundle + `activeWork` artifact summaries
- [ ] `memory_bootstrap` handles missing project gracefully (`projectExists: false`)
- [ ] `memory_recall` returns ranked excerpts across memory + artifact sources
- [ ] `memory_get_workflow({ taskId })` resolves spec/arch/plan/manual-test chain
- [ ] Superseded decisions excluded by default; `needsReview` flagged for decisions > 6 months
- [ ] `npm test` passes

## Phase Risk Level

**Low** — Read-only.

## Slice Checklist

- [ ] [Slice 1: memory_bootstrap implementation](#slice-1-memory_bootstrap-implementation)
- [ ] [Slice 2: memory_recall — project memory sources](#slice-2-memory_recall--project-memory-sources)
- [ ] [Slice 3: memory_recall — artifact sources](#slice-3-memory_recall--artifact-sources)
- [ ] [Slice 4: memory_get_workflow](#slice-4-memory_get_workflow)
- [ ] [Slice 5: MCP registration and handler tests](#slice-5-mcp-registration-and-handler-tests)

---

## Slice 1: memory_bootstrap implementation

**Type:** Behaviour-changing  
**Risk:** Low

**Input:** `{ project: string, taskId?: string }`

**Server reads (parallel):**

| File | Response field |
|---|---|
| `short-term/conversation.context.md` | `conversationContext` |
| `short-term/current-task.md` | `currentTask` |
| `tasks/tasks-index.md` | `tasksIndex`, parsed `parkedTasks`, `activeTask` |
| `long-term/decisions-index.md` | `decisionsIndex`, parsed `activeDecisions` summary |
| Latest `daily/YYYY-MM-DD.md` | `latestDaily: { date, path, content }` |

**Also:** Parse `current-task.md` wikilinks → `activeWork` with excerpt summaries for linked plan/spec/arch/manual-test.

**Checklist:**

- [ ] Implement `memory/bootstrap.ts`
- [ ] Unit tests: empty project, partial project, full project
- [ ] Unit tests: current-task with plan/spec/arch links

**Acceptance Criteria:**

- [ ] Missing files return null/empty, not errors
- [ ] Excerpts capped; full artifact bodies not returned

---

## Slice 2: memory_recall — project memory sources

**Type:** Behaviour-changing  
**Risk:** Low

**Input:** `{ project, area?, files?, keywords?, tags?, sources?, maxResults?, excerptLength?, includeSuperseded? }`

**Sources (project memory):** decisions, lessons, patterns, tools, tasks, daily, context

**Checklist:**

- [ ] Implement ranking: area match > file overlap > keyword in title > keyword in body > recency
- [ ] Section-level hits for lessons/patterns/tools (not whole files)
- [ ] Implement `memory/recall.ts` project-memory branch
- [ ] Unit tests for ranking and caps

---

## Slice 3: memory_recall — artifact sources

**Type:** Behaviour-changing  
**Risk:** Low

**Sources (artifacts):** specifications, architecture, plans, manual-tests

**When `taskId` provided:** resolve artifact paths via `artifacts/resolve.ts`

**Checklist:**

- [ ] Extend `memory/recall.ts` for artifact fan-out
- [ ] Plan hits include master + matching phases separately
- [ ] Unit tests with fixture task-id folders

---

## Slice 4: memory_get_workflow

**Type:** Behaviour-changing  
**Risk:** Low

**Input:** `{ taskId: string, excerptLength? }`

**Output:** spec, architecture, plan (master + phases), manual-test plan, related decisions (by `origin` link)

**Checklist:**

- [ ] Implement `memory/workflow.ts`
- [ ] Unit tests for complete and partial workflow chains

---

## Slice 5: MCP registration and handler tests

**Type:** Behaviour-changing  
**Risk:** Low

**Checklist:**

- [ ] Register `memory_bootstrap`, `memory_recall`, `memory_get_workflow` in `registerTools.ts`
- [ ] Remove `memory_status` stub (or keep as health check — decide)
- [ ] Update `mcp/handler.test.ts` for new tools
- [ ] Add fixture vault for integration smoke tests

**Verification:** MCP client can call all three tools against test vault.
