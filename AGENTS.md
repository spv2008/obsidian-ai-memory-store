# Agent Instructions

## Commit Process

### Commit cadence

Commit frequently in small, self-contained increments. Each commit must leave the repository in a working state — no broken builds, no failing unit tests. A commit that fixes a bug, a commit that adds a test, and a commit that updates documentation are all valid atomic units. Do not batch unrelated changes into a single commit.

### Push Automatically

After making any particular commit, you can feel free to push that branch to the remote.

### Running tests before committing

Run the unit test suite before every commit:

```
npm test
```

Integration tests require a live Obsidian instance with the plugin's insecure HTTP server enabled and `OBSIDIAN_API_KEY` set. Run them when Obsidian is available, and always run them before pushing changes that touch endpoint behavior:

```
npm run test:integration
```

### Commit message format

Use a plain imperative subject line (no `type:` prefix). Always include a `Co-Authored-By` trailer crediting the AI assistant that helped author the commit.

```
Short imperative description

Longer description of what this work is, why these changes were made, and any decisions, trade-offs, and known limitations that may be useful to future readers.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
```

## Keeping Memory MCP Tools and Documentation in Sync

Memory Schema v1 (from the `obsidian-memory` skill) is the source of truth for vault layout. MCP tool changes must stay aligned with the skill and README.

| Layer | Files |
|---|---|
| MCP tool definitions | `src/mcp/registerTools.ts`, `src/mcp/handler.ts` |
| Memory domain logic | `src/memory/` (added in later phases) |
| Project README | `README.md` |
| Delivery plan | `plans/obsidian-ai-memory-store/` |
| Unit tests | `src/mcp/handler.test.ts`, `src/server/httpServer.test.ts` |
| Integration tests | `src/integration/mcp.test.ts` |

### Checklist

Before marking any MCP tool change complete:

- [ ] Tool registered in `src/mcp/registerTools.ts` (or memory module wired through it)
- [ ] Unit tests cover the changed behavior
- [ ] Integration tests updated when MCP tool behavior changes
- [ ] README tool table updated
- [ ] `obsidian-memory` skill updated when user-facing workflows change

## Pull Request Review Comments

When addressing inline review comments on a pull request:

1. Push the fix to the PR branch.
2. Reply on each addressed comment thread with a short note: what changed, and which commit contains the fix.
3. Do not mark review feedback as handled without a thread reply — silent fixes make it hard for reviewers to verify.

Use the GitHub API or `gh` to post replies:

```
gh api -X POST repos/<owner>/<repo>/pulls/<number>/comments/<comment-id>/replies -f body="Fixed in <sha>: ..."
```

## Release Process

Releases are performed on the `main` branch after all feature branches have been merged.

### Steps

1. Ensure you are on `main` with all intended changes merged.

   Before proceeding, read the current version from `package.json`. Ask the user whether this is a **major**, **minor**, or **patch** bump and calculate the new version number from their answer — do not ask them to supply the version number directly.

2. Delete `package-lock.json` and regenerate it:
   ```
   rm package-lock.json
   npm i
   ```

3. Edit the `version` field in `package.json` to the new version number.

4. Run the version script to update `manifest.json` and `versions.json` (this also stages those two files automatically):
   ```
   npm run version
   ```

5. Stage the remaining changed files (`package.json` and `package-lock.json`):
   ```
   git add package.json package-lock.json
   ```

6. Create a commit named:
   ```
   Release X.Y.Z
   ```

7. Before creating the tag, draft the full tag message and present it to the user for review. Incorporate any requested changes before proceeding. Then create the annotated tag named exactly after the new version number (e.g. `3.4.7`):
   ```
   git tag -a 3.4.7
   ```

   **Tag message format:**

   ```
   Release X.Y.Z

   - Adds/Fixes/Updates/Removes [description of change]. (#issue if applicable; Thanks @contributor if applicable.)
   - Adds/Fixes/Updates/Removes [description of change].
   ```

   - Subject line is `Release X.Y.Z`, optionally followed by ` -- Short description` for especially notable releases.
   - Body is one or more bullet points summarizing user-visible changes.
   - Each bullet starts with a verb (`Adds`, `Fixes`, `Updates`, `Removes`).
   - Reference GitHub issues and PR numbers where relevant (e.g. `(#140)`).
   - Credit external contributors where relevant (e.g. `Thanks @username!`). GitHub handles are not present in commit messages — look them up via `gh pr view <number>` for any PR-sourced changes.
   - Sub-bullets may be used for multi-part changes.
   - For re-releases (e.g. fixing a botched release), add a short prose paragraph before or after the bullets explaining what changed from the prior release attempt and that the underlying content is otherwise identical.
