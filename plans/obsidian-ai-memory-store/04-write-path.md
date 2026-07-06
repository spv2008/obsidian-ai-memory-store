# Phase 04: Write Path (Upsert, Decisions, Artifacts)

## Objective

Implement memory write tools so agents create and update vault entries without search/list/write/patch chains.

## Why This Phase

Write orchestration is where correctness matters most (register rows, supersede links, folder naming). Builds on parsers from Phase 02.

## Scope

- `memory_upsert`
- `memory_write_decision`
- `memory_write_specification`
- `memory_write_architecture`
- `memory_write_plan`
- `memory_write_manual_test`

## Out of Scope

- Task lifecycle (Phase 05)
- Auto-linking artifacts into `current-task.md` (agent/skill adds wikilinks)

## Dependencies

- Phase 03 complete (recall can validate writes in tests)

## Security Considerations

- Validate slugs and dates to prevent path traversal in filenames
- Reject writes outside Memory Schema v1 path patterns

## Rollback Notes

- Writes are user vault mutations; test against fixture vault copies only in unit tests

## Phase Acceptance Criteria

- [ ] `memory_upsert` creates files and appends/replaces sections with dedupe by heading
- [ ] `memory_write_decision` writes atomic note + register row atomically
- [ ] Supersede flow updates old decision status and register
- [ ] Artifact write tools enforce folder naming conventions
- [ ] Duplicate decision slug returns clear error (v1 policy)
- [ ] `npm test` passes

## Phase Risk Level

**Medium** — Mutates vault; register corruption risk.

## Slice Checklist

- [ ] [Slice 1: memory_upsert](#slice-1-memory_upsert)
- [ ] [Slice 2: memory_write_decision](#slice-2-memory_write_decision)
- [ ] [Slice 3: Artifact write tools (spec, architecture)](#slice-3-artifact-write-tools-spec-architecture)
- [ ] [Slice 4: Artifact write tools (plan, manual-test)](#slice-4-artifact-write-tools-plan-manual-test)
- [ ] [Slice 5: MCP registration and write tests](#slice-5-mcp-registration-and-write-tests)

---

## Slice 1: memory_upsert

**Type:** Behaviour-changing  
**Risk:** Medium

**Input:**

```typescript
{
  project: string,
  relativePath: string,  // under project root, e.g. "long-term/lessons-learned.md"
  mode: "replace_file" | "append_file" | "append_section" | "replace_section",
  content: string,
  target?: string,
  createTargetIfMissing?: boolean,
  dedupeKey?: string
}
```

**Checklist:**

- [ ] Implement `memory/upsert.ts` using vault patch/write/append
- [ ] Create parent directories when missing
- [ ] Tests: new daily file, append lesson section, dedupe by heading

---

## Slice 2: memory_write_decision

**Type:** Behaviour-changing  
**Risk:** Medium

**Input:** slug, title, body, frontmatter (status, area, files, decided, origin, supersedes, etc.)

**Atomic behaviour:**

1. Write `long-term/decisions/{decided}-{slug}.md`
2. Append row to `decisions-index.md`
3. If `supersedes` set → update old note + register row

**Checklist:**

- [ ] Implement `memory/decisions.ts`
- [ ] Tests: new decision, supersede flow, duplicate slug error

---

## Slice 3: Artifact write tools (spec, architecture)

**Type:** Behaviour-changing  
**Risk:** Low

**Tools:**

- `memory_write_specification({ taskId, featureName, content, mode? })`
- `memory_write_architecture({ taskId, featureName, content })`

**Paths:**

- `specifications/{task-id}-{feature-name}/spec.md`
- `architecture/{task-id}-{feature-name}/proposal.md`

**Checklist:**

- [ ] Implement in `memory/artifactsWrite.ts`
- [ ] Create folder if missing
- [ ] Tests for new folder creation

---

## Slice 4: Artifact write tools (plan, manual-test)

**Type:** Behaviour-changing  
**Risk:** Low

**Tools:**

- `memory_write_plan({ taskId, briefDescription, file, content, mode? })`
  - `file`: `"master-plan"` or `"{NN}-{phase-description}"`
- `memory_write_manual_test({ featureName, file: "plan" | "insomnia", content })`

**Checklist:**

- [ ] Validate phase filename `{NN}-` prefix
- [ ] Tests for master plan + phase file creation

---

## Slice 5: MCP registration and write tests

**Type:** Behaviour-changing  
**Risk:** Low

**Checklist:**

- [ ] Register all write tools in `registerTools.ts`
- [ ] End-to-end fixture test: write decision → recall finds it
- [ ] End-to-end fixture test: write spec → get_workflow returns it

**Verification:** `npm test` passes.
