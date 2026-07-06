import { findSection, splitSections } from "./sections";

const AGGREGATED = `# Code Patterns

## Repository layout
Keep vault I/O in src/vault/.

## Error handling
Throw typed errors from vault layer.

# Lessons Learned

## Phase 01
Restructure before adding tools.
`;

describe("sections parser", () => {
  test("splits top-level sections", () => {
    const sections = splitSections(AGGREGATED);
    expect(sections.map((s) => s.heading)).toEqual([
      "Code Patterns",
      "Repository layout",
      "Error handling",
      "Lessons Learned",
      "Phase 01",
    ]);
  });

  test("findSection is case-insensitive", () => {
    const section = findSection(AGGREGATED, "error handling");
    expect(section).toBeDefined();
    if (!section) {
      throw new Error("expected section");
    }
    expect(section.body).toContain("typed errors");
  });
});
