# Phase 05: Task Lifecycle and Find

## Objective

Complete the v1 MCP tool surface with task management, scoped search fallback, and optional full-file read escape hatch.

## Why This Phase

Task lifecycle is multi-step in the skill (park, archive, register updates). Encapsulating it prevents agents from losing parked work. `memory_find` covers fuzzy cases `memory_recall` does not.

## Scope

- `memory_start_task`
- `memory_archive_task`
- `memory_find`
- Optional `vault_read` escape hatch

## Out of Scope

- Auto-resume parked tasks (agent reads bootstrap/recall and decides)
- Link injection into `current-task.md` for artifacts (agent writes links)

## Dependencies

- Phase 04 complete

## Security Considerations

- Task slug validation for archive filenames
- `memory_find` scoped strictly under `memory/projects/{project}/` and artifact roots

## Rollback Notes

- Task tools mutate `current-task.md` and register; test with fixture vault

## Phase Acceptance Criteria

- [ ] `memory_start_task` parks unfinished current task when configured, writes new current task, updates register
- [ ] `memory_archive_task` archives to `tasks/`, updates register, clears current task
- [ ] Full flow test: start → archive parked → start new → archive done
- [ ] `memory_find` returns scoped excerpts only
- [ ] `vault_read` returns file content when recall excerpts insufficient (if included)
- [ ] `npm test` passes

## Phase Risk Level

**Medium** — Task lifecycle touches multiple files per operation.

## Slice Checklist

- [ ] [Slice 1: memory_start_task](#slice-1-memory_start_task)
- [ ] [Slice 2: memory_archive_task](#slice-2-memory_archive_task)
- [ ] [Slice 3: memory_find](#slice-3-memory_find)
- [ ] [Slice 4: vault_read escape hatch (optional)](#slice-4-vault_read-escape-hatch-optional)
- [ ] [Slice 5: Task lifecycle integration tests](#slice-5-task-lifecycle-integration-tests)

---

## Slice 1: memory_start_task

**Type:** Behaviour-changing  
**Risk:** Medium

**Input:**

```typescript
{
  project: string,
  name: string,
  goal: string,
  taskId?: string,
  planLink?: string,
  specLink?: string,
  architectureLink?: string,
  parkCurrentIfActive?: boolean  // default true
}
```

**Behaviour:**

- If `current-task.md` has content and `parkCurrentIfActive` → archive as parked first
- Write new `current-task.md` from skill template (Goal, Following, Sub-tasks)
- Add register row with status `active`

**Checklist:**

- [ ] Implement `memory/tasks.ts` start flow
- [ ] Unit test: start with empty current task
- [ ] Unit test: start parks existing active task

---

## Slice 2: memory_archive_task

**Type:** Behaviour-changing  
**Risk:** Medium

**Input:**

```typescript
{
  project: string,
  status: "parked" | "done" | "abandoned",
  slug: string,
  resumeNotes?: string,
  outcome?: string
}
```

**Behaviour:**

- Copy `current-task.md` → `tasks/YYYY-MM-DD-{slug}.md` with frontmatter
- Update register row
- Clear `current-task.md`

**Checklist:**

- [ ] Implement archive flow in `memory/tasks.ts`
- [ ] Unit tests for parked and done statuses

---

## Slice 3: memory_find

**Type:** Behaviour-changing  
**Risk:** Low

**Input:**

```typescript
{
  project: string,
  query: string,
  types?: ("decisions" | "lessons" | "patterns" | "tasks" | "daily" | "specifications" | "architecture" | "plans" | "manual-tests" | "all"),
  maxResults?: number
}
```

**Behaviour:** Scoped simple search under project + artifact trees; return paths + excerpts only.

**Checklist:**

- [ ] Implement `memory/find.ts`
- [ ] Default `maxResults: 10`, low context length
- [ ] Unit tests for scoping (no hits outside project)

---

## Slice 4: vault_read escape hatch (optional)

**Type:** Behaviour-changing  
**Risk:** Low

**Description:** Thin wrapper over vault read returning content (optionally with `fields` filter if implemented).

**Checklist:**

- [ ] Decide: include in v1 or defer
- [ ] If included: register with minimal description
- [ ] Test read of decision note after recall excerpt

---

## Slice 5: Task lifecycle integration tests

**Type:** Behaviour-changing  
**Risk:** Low

**Checklist:**

- [ ] Fixture test: start → archive done → verify register + empty current task
- [ ] Fixture test: start → park → start new → verify two register rows
- [ ] Update `integration/mcp.test.ts` for task tools if Obsidian available

**Verification:** `npm test` passes.
