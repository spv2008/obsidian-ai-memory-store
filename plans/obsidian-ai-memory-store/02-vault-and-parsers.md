# Phase 02: Vault Layer and Parsers

## Objective

Establish internal vault primitives and tested parsers for the skill vault schema — foundation for all memory tools.

## Why This Phase

Memory tools orchestrate reads/writes; they should not reimplement markdown table parsing, section splitting, or path resolution. Parsers must be tested before recall/write logic depends on them.

## Scope

- Move and trim `vaultOperations.ts` to `src/vault/`
- Add `src/memory/paths.ts`, `schema.ts`, `parse/*`
- Unit tests for all parsers and path builders
- Focused vault operation unit tests

## Out of Scope

- MCP tool registration (Phases 03–05)
- Memory recall ranking logic (Phase 03)

## Dependencies

- Phase 01 complete

## Security Considerations

- Path builders must reject paths escaping vault root
- No new external network calls

## Rollback Notes

- Vault trim is internal; MCP surface unchanged until Phase 03

## Phase Acceptance Criteria

- [ ] `src/vault/vaultOperations.ts` exposes: read, write, append, patch, list, metadata, document map, scoped simple search
- [ ] Removed: periodic notes, commands, tag listing, open file (unless needed internally)
- [ ] Parser tests cover register tables, sections, wikilinks, task-id extraction
- [ ] Path builders produce all Memory Schema v1 paths correctly
- [ ] `npm test` passes

## Phase Risk Level

**Low** — Additive and internal; trims unused code.

## Slice Checklist

- [ ] [Slice 1: Move and trim vault operations](#slice-1-move-and-trim-vault-operations)
- [ ] [Slice 2: Memory paths and schema constants](#slice-2-memory-paths-and-schema-constants)
- [ ] [Slice 3: Register table parser](#slice-3-register-table-parser)
- [ ] [Slice 4: Section and wikilink parsers](#slice-4-section-and-wikilink-parsers)
- [ ] [Slice 5: Task-id and artifact path resolution](#slice-5-task-id-and-artifact-path-resolution)
- [ ] [Slice 6: Vault operation unit tests](#slice-6-vault-operation-unit-tests)

---

## Slice 1: Move and trim vault operations

**Type:** Non-behaviour-changing (for MCP — no tools yet)  
**Risk:** Low

**Checklist:**

- [ ] Move `src/vaultOperations.ts` → `src/vault/vaultOperations.ts`
- [ ] Move related types to `src/vault/types.ts`
- [ ] Move errors to `src/vault/errors.ts`
- [ ] Remove `periodicGet*`, `listCommands`, `executeCommand`, `openVaultFile`, `getAllTags`
- [ ] Keep `simpleSearch` and internal `searchJsonLogic` if useful for recall
- [ ] Update all imports

**Verification:** `npm test` passes.

---

## Slice 2: Memory paths and schema constants

**Type:** Non-behaviour-changing  
**Risk:** Low

**Checklist:**

- [ ] `memory/paths.ts`: `projectRoot(project)`, all relative path builders
- [ ] `memory/schema.ts`: folder names, frontmatter field names, date format regex
- [ ] `memory/types.ts`: shared request/response interfaces (stubs OK)
- [ ] Unit tests for path builders including artifact trees

**Verification:** Path unit tests pass.

---

## Slice 3: Register table parser

**Type:** Non-behaviour-changing  
**Risk:** Medium — incorrect parse corrupts indexes

**Checklist:**

- [ ] `memory/parse/registerTable.ts`: parse markdown table → rows
- [ ] Append row, update row by key column
- [ ] Create table with header if file missing
- [ ] Fixture tests for `decisions-index.md` and `tasks-index.md` formats

**Verification:** Register parser tests pass.

---

## Slice 4: Section and wikilink parsers

**Type:** Non-behaviour-changing  
**Risk:** Low

**Checklist:**

- [ ] `memory/parse/sections.ts`: split `## heading` blocks from aggregated files
- [ ] `memory/parse/wikilinks.ts`: extract `[[...]]` from `current-task.md`
- [ ] Tests with fixture markdown

**Verification:** Parser tests pass.

---

## Slice 5: Task-id and artifact path resolution

**Type:** Non-behaviour-changing  
**Risk:** Medium

**Checklist:**

- [ ] `memory/parse/taskId.ts`: extract task-id from folder names
- [ ] `memory/artifacts/resolve.ts`: glob `specifications/{task-id}-*/spec.md`, etc.
- [ ] Infer manual-test plan folder from spec/arch/plan feature slug when possible
- [ ] Tests for multi-folder glob and missing artifacts

**Verification:** Resolution tests pass.

---

## Slice 6: Vault operation unit tests

**Type:** Non-behaviour-changing  
**Risk:** Low

**Checklist:**

- [ ] Add `src/vault/vaultOperations.test.ts` for read/write/patch/list with mocks
- [ ] Remove tests that depended on deleted periodic/command methods

**Verification:** `npm test` passes.
