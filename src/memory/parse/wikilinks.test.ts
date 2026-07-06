import { extractWikilinks, extractWikilinkTargets } from "./wikilinks";

const CURRENT_TASK = `# Current Task

**Goal**: Implement memory bootstrap

## Links
- Spec: [[TASK-42-user-auth/spec]]
- Plan: [[01-foundation|Phase 1]]

## Checklist
- [ ] Write parsers
`;

describe("wikilinks parser", () => {
  test("extracts plain and aliased wikilinks", () => {
    const links = extractWikilinks(CURRENT_TASK);
    expect(links).toHaveLength(2);
    expect(links[0]).toMatchObject({
      target: "TASK-42-user-auth/spec",
      raw: "[[TASK-42-user-auth/spec]]",
    });
    expect(links[1]).toMatchObject({
      target: "01-foundation",
      alias: "Phase 1",
    });
  });

  test("extractWikilinkTargets returns targets only", () => {
    expect(extractWikilinkTargets(CURRENT_TASK)).toEqual([
      "TASK-42-user-auth/spec",
      "01-foundation",
    ]);
  });
});
