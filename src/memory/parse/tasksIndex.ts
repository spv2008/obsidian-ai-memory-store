import { parseRegisterTable, rowToRecord } from "./registerTable";

export interface TaskIndexRow {
  name: string;
  started: string;
  finished: string;
  status: string;
  outcome: string;
  note: string;
}

export function parseTasksIndex(content: string | null): TaskIndexRow[] {
  if (!content) {
    return [];
  }

  const table = parseRegisterTable(content);
  if (!table) {
    return [];
  }

  return table.rows.map((row) => {
    const byHeader = rowToRecord(table, row).byHeader;
    return {
      name: byHeader.Task ?? row[0] ?? "",
      started: byHeader.Started ?? "",
      finished: byHeader.Finished ?? "",
      status: byHeader.Status ?? "",
      outcome: byHeader.Outcome ?? "",
      note: byHeader.Note ?? "",
    };
  });
}
