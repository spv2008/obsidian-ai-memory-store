import { parseRegisterTable, rowToRecord } from "./registerTable";

export interface DecisionIndexRow {
  decided: string;
  decision: string;
  status: string;
  area: string;
  note: string;
}

export function parseDecisionsIndex(content: string | null): DecisionIndexRow[] {
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
      decided: byHeader.Decided ?? row[0] ?? "",
      decision: byHeader.Decision ?? "",
      status: byHeader.Status ?? "",
      area: byHeader.Area ?? "",
      note: byHeader.Note ?? "",
    };
  });
}

export function isDecisionNeedsReview(
  decided: string,
  now: Date = new Date(),
): boolean {
  const decidedDate = new Date(decided);
  if (Number.isNaN(decidedDate.getTime())) {
    return false;
  }
  const threshold = new Date(now);
  threshold.setMonth(threshold.getMonth() - 6);
  return decidedDate < threshold;
}
