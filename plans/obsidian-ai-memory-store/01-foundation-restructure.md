# Phase 01: Foundation Restructure

## Objective

Replace the generic REST API surface with a slim MCP-only HTTP server and rebrand the plugin as `obsidian-ai-memory-store`, leaving MCP connectivity working with a stub tool.

## Why This Phase

All later memory work depends on a clean base. Building memory tools on top of the full REST API would require deleting ~4k lines afterward and maintaining AGENTS.md REST/OpenAPI sync rules that no longer apply.

## Scope

- Rebrand `manifest.json` and `package.json`
- Create `src/server/httpServer.ts` (health + cert + `/mcp/` only)
- Move MCP handler to `src/mcp/handler.ts`
- Remove REST API, extension API, OpenAPI docs
- Stub MCP tool `memory_status` for smoke testing
- Update `AGENTS.md` draft for memory plugin workflow

## Out of Scope

- Memory domain logic (`src/memory/`)
- Vault operations trimming (Phase 02)
- Settings UI simplification beyond removing dead options (Phase 06)

## Dependencies

- None

## Security Considerations

- Preserve bearer token authentication on `/mcp/`
- Preserve HTTPS certificate generation and validation
- Do not expose vault operations without authentication

## Rollback Notes

- Revert PR restores full REST API from git history
- New plugin ID means rollback is non-destructive to existing Local REST API installs

## Phase Acceptance Criteria

- [x] Plugin loads in Obsidian as **AI Memory Store** (`obsidian-ai-memory-store`)
- [x] `GET /` returns health JSON without auth
- [x] MCP client connects to `/mcp/` with bearer token
- [x] `memory_status` tool returns `{ ok: true, version }`
- [x] `npm test` passes
- [x] No references to deleted `requestHandler.ts` remain

## Phase Risk Level

**Medium** — Removes large surface area; MCP session code must remain stable.

## Slice Checklist

- [x] [Slice 1: Rebrand manifest and package metadata](#slice-1-rebrand-manifest-and-package-metadata)
- [x] [Slice 2: Create slim HTTP server](#slice-2-create-slim-http-server)
- [x] [Slice 3: Move MCP handler and add stub tool](#slice-3-move-mcp-handler-and-add-stub-tool)
- [x] [Slice 4: Wire main.ts to new server](#slice-4-wire-maints-to-new-server)
- [x] [Slice 5: Delete REST API and docs pipeline](#slice-5-delete-rest-api-and-docs-pipeline)
- [x] [Slice 6: Fix tests and CI for new layout](#slice-6-fix-tests-and-ci-for-new-layout)

---

## Slice 1: Rebrand manifest and package metadata

**Type:** Non-behaviour-changing (product identity)  
**Risk:** Low — metadata only

**Description:** Update plugin identity to match repo name. No behaviour change to runtime yet.

**Checklist:**

- [ ] `manifest.json`: `id` → `obsidian-ai-memory-store`, `name` → `AI Memory Store`, update description
- [ ] `package.json`: `name` → `obsidian-ai-memory-store`, update description
- [ ] Remove `build-docs`, `serve-docs` scripts if docs pipeline deleted in Slice 5
- [ ] Update `versions.json` / run `npm run version` when releasing (not in this slice)

**Verification:** `npm run build` succeeds; manifest validates.

---

## Slice 2: Create slim HTTP server

**Type:** Behaviour-changing  
**Risk:** Medium — replaces routing layer

**Description:** New `src/server/httpServer.ts` with express app exposing only:

- `GET /` — health + auth instructions
- `GET /{cert-name}` — certificate download (keep or rename — see open question)
- `POST|GET /mcp/` — authenticated MCP (delegate to `McpHandler`)

Extract auth middleware to `src/server/auth.ts` from existing `requestHandler.requestIsAuthenticated`.

**Acceptance Criteria:**

- [ ] No `/vault/*`, `/search/*`, `/active/*`, or other REST routes registered
- [ ] MCP route requires bearer token
- [ ] CORS and JSON body limits preserved for MCP
- [ ] Verbose logging hook preserved if settings flag set

**Verification:** Manual curl to `/` and MCP client connect after Slice 4.

---

## Slice 3: Move MCP handler and add stub tool

**Type:** Behaviour-changing  
**Risk:** Medium — MCP entry point moves

**Description:**

- Move `src/mcpHandler.ts` → `src/mcp/handler.ts`
- Remove OpenAPI resource registration
- Remove all generic vault MCP tools
- Add `src/mcp/registerTools.ts` with stub `memory_status`
- Add `src/mcp/textResult.ts` for response helpers

**Acceptance Criteria:**

- [ ] Session transport code unchanged in behaviour (move only)
- [ ] Only `memory_status` registered as MCP tool
- [ ] No import of `docs/openapi.yaml`

**Verification:** `src/mcp/handler.test.ts` updated and passing.

---

## Slice 4: Wire main.ts to new server

**Type:** Behaviour-changing  
**Risk:** Medium

**Description:**

- Replace `RequestHandler` with slim server module
- Remove `registerApiExtension` and related API extension wiring
- Keep certificate generation, HTTPS/HTTP server lifecycle, settings load/save

**Acceptance Criteria:**

- [ ] Plugin `onload` starts servers as before
- [ ] Settings tab still shows API key and port configuration
- [ ] No compile errors from removed `requestHandler`

**Verification:** Load plugin in Obsidian; servers start; MCP connects.

---

## Slice 5: Delete REST API and docs pipeline

**Type:** Non-behaviour-changing (relative to Slice 2–4)  
**Risk:** Low — deletion of unused code

**Description:** Remove dead code and docs.

**Checklist:**

- [ ] Delete `src/requestHandler.ts`
- [ ] Delete `src/requestHandler.test.ts`
- [ ] Delete `src/api.ts`
- [ ] Delete `docs/` directory
- [ ] Delete REST integration tests: `vault`, `patch`, `search`, `tags`, `commands`, `active`, `periodic`, `meta` (keep `security.test.ts` if still relevant)
- [ ] Remove unused deps: `obsidian-daily-notes-interface`, etc.
- [ ] Update `esbuild.config.mjs` if openapi import paths referenced
- [ ] Update `declarations.d.ts` if openapi module declaration removed

**Verification:** `npm test` and `npm run build` pass.

---

## Slice 6: Fix tests and CI for new layout

**Type:** Non-behaviour-changing  
**Risk:** Low

**Description:** Ensure CI green after restructure.

**Checklist:**

- [ ] Rewrite or slim `src/integration/mcp.test.ts` for stub tool
- [ ] Update `.github/workflows/test.yml` if docs build step existed
- [ ] Draft `AGENTS.md` memory-plugin section (full rewrite in Phase 06)
- [ ] Add placeholder `README.md` section pointing to `plans/obsidian-ai-memory-store/`

**Verification:** `npm test` passes in CI locally.
