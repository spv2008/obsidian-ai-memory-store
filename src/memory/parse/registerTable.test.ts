import {
  appendRegisterRow,
  createRegisterTable,
  parseRegisterTable,
  rowToRecord,
  updateRegisterRow,
} from "./registerTable";

const DECISIONS_INDEX = `# Decision Register: my-app

| Decided | Decision | Status | Area | Note |
|---|---|---|---|---|
| 2026-01-12 | Use a scoped write session for all writes | active | billing/writes | [[2026-01-12-paired-session-writes]] |
| 2026-01-27 | WebSocket Authentication Strategy | active | auth-service/websockets | [[2026-01-27-websocket-auth-strategy]] |
`;

const TASKS_INDEX = `# Task Register: my-app

| Task | Started | Finished | Status | Outcome | Note |
|---|---|---|---|---|---|
| Add memory bootstrap | 2026-07-01 | | active | | |
| Fix vault path trim | 2026-06-15 | 2026-06-20 | done | Trimmed periodic APIs | [[2026-06-15-vault-trim]] |
`;

function requireTable(content: string) {
  const table = parseRegisterTable(content);
  if (!table) {
    throw new Error("expected register table");
  }
  return table;
}

describe("registerTable parser", () => {
  test("parses decisions-index format", () => {
    const table = requireTable(DECISIONS_INDEX);
    expect(table.header).toEqual([
      "Decided",
      "Decision",
      "Status",
      "Area",
      "Note",
    ]);
    expect(table.rows).toHaveLength(2);
    expect(table.rows[0][0]).toBe("2026-01-12");
    expect(table.rows[1][1]).toBe("WebSocket Authentication Strategy");
  });

  test("parses tasks-index format", () => {
    const table = requireTable(TASKS_INDEX);
    expect(table.header[0]).toBe("Task");
    expect(table.rows).toHaveLength(2);
    expect(rowToRecord(table, table.rows[1]).byHeader.Status).toBe("done");
  });

  test("returns null when no table present", () => {
    expect(parseRegisterTable("# No table here\n\nJust text.")).toBeNull();
  });

  test("appends a row to an existing table", () => {
    const updated = appendRegisterRow(DECISIONS_INDEX, [
      "2026-07-06",
      "New decision",
      "active",
      "vault",
      "[[2026-07-06-new-decision]]",
    ]);
    const table = requireTable(updated);
    expect(table.rows).toHaveLength(3);
    expect(table.rows[2][1]).toBe("New decision");
  });

  test("updates a row by key column", () => {
    const updated = updateRegisterRow(
      DECISIONS_INDEX,
      "Decided",
      "2026-01-12",
      (row) => {
        const cells = [...row.cells];
        cells[2] = "superseded";
        return cells;
      },
    );
    const table = requireTable(updated);
    const row = table.rows.find((r) => r[0] === "2026-01-12");
    expect(row?.[2]).toBe("superseded");
  });

  test("creates a new register table when missing", () => {
    const created = createRegisterTable("Decision Register: demo", [
      "2026-07-06",
      "Initial",
      "active",
      "core",
      "[[2026-07-06-initial]]",
    ]);
    const table = requireTable(created);
    expect(table.rows).toHaveLength(1);
  });
});
