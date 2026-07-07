# Phase 06: Settings, Docs, and Skill Alignment

## Objective

Ship-ready polish: simplified settings, documentation, skill updates, and governance for ongoing development.

## Why This Phase

The plugin is unusable for others without MCP setup docs. The skill must reference memory tools instead of generic vault operations.

## Scope

- Simplify settings tab
- Rewrite README
- Rewrite `AGENTS.md` for memory plugin
- Update `obsidian-memory` skill tool table and workflows
- Final integration test pass

## Out of Scope

- Obsidian community plugin store submission
- Configuration UI for custom paths (v2)

## Dependencies

- Phases 01–05 complete

## Security Considerations

- README must not encourage disabling auth
- Document cert trust steps for local HTTPS

## Rollback Notes

- Documentation-only changes; no runtime rollback needed

## Phase Acceptance Criteria

- [x] Settings tab shows only relevant options (API key, ports, HTTP toggle, verbose logging)
- [x] README covers install, MCP config (Cursor + Claude Code), tool list, schema v1
- [x] `AGENTS.md` reflects memory plugin commit/test workflow (no REST/OpenAPI sync)
- [x] Skill updated with memory tool workflows
- [x] `npm test` passes

## Phase Risk Level

**Low**

## Slice Checklist

- [x] [Slice 1: Simplify settings UI](#slice-1-simplify-settings-ui)
- [x] [Slice 2: Rewrite README](#slice-2-rewrite-readme)
- [x] [Slice 3: Rewrite AGENTS.md](#slice-3-rewrite-agentsmd)
- [x] [Slice 4: Update obsidian-memory skill](#slice-4-update-obsidian-memory-skill)
- [ ] [Slice 5: Final integration and release prep](#slice-5-final-integration-and-release-prep)

---

## Slice 1: Simplify settings UI

**Type:** Behaviour-changing (UI)  
**Risk:** Low

**Checklist:**

- [ ] Remove REST-specific settings labels/descriptions
- [ ] Rename plugin references to "AI Memory Store"
- [ ] Keep: API key (copy/regenerate), HTTPS port, HTTP port, enable HTTP, binding host, verbose logging
- [ ] Update `src/settings.ts` if extracted from main

**Verification:** Settings tab renders correctly in Obsidian.

---

## Slice 2: Rewrite README

**Type:** Non-behaviour-changing  
**Risk:** Low

**Checklist:**

- [ ] What this plugin is (memory MCP, not generic REST)
- [ ] Quick start: install, enable, copy API key
- [ ] MCP configuration examples (Cursor, Claude Code)
- [ ] Memory Schema v1 diagram
- [ ] Tool reference table with one-line descriptions
- [ ] Link to `plans/obsidian-ai-memory-store/master-plan.md`
- [ ] Link to `obsidian-memory` skill
- [ ] Note coexistence with original Local REST API plugin (different ID)

---

## Slice 3: Rewrite AGENTS.md

**Type:** Non-behaviour-changing  
**Risk:** Low

**Replace REST/MCP/OpenAPI sync table with:**

- [ ] Memory schema v1 is source of truth
- [ ] MCP tool changes require: implementation, unit tests, README, skill update
- [ ] Run `npm test` before commit
- [ ] Integration tests when MCP tool behaviour changes
- [ ] Plan files live in `plans/obsidian-ai-memory-store/`

---

## Slice 4: Update obsidian-memory skill

**Type:** Non-behaviour-changing (external skill file)  
**Risk:** Low

**Location:** Local `obsidian-memory` skill install (updated in place; not vendored into this repo).

**Checklist:**

- [x] Session start → `memory_bootstrap` only
- [x] Area work → `memory_recall({ area, files })`
- [x] Task-id work → `memory_get_workflow({ taskId })`
- [x] Writes → memory write tools; drop generic vault chains
- [x] Search Before Write → `memory_recall` or upsert dedupe
- [x] Update MCP tools table
- [x] Remove read-back verification section
- [x] Remove `periodic_note_get_path` reference
- [x] Document artifact write tools for `/specifications`, `/architecture`, `/create-plan`, `/manual-testing`

---

## Slice 5: Final integration and release prep

**Type:** Non-behaviour-changing  
**Risk:** Low

**Checklist:**

- [ ] Run full `npm test` and `npm run test:integration`
- [ ] Mark all phase checklists complete in master plan
- [ ] Update master plan Status → Complete
- [ ] Version bump when ready to release (separate release process per AGENTS.md)

**Verification:** Clean test run; manual MCP smoke test in Obsidian.
