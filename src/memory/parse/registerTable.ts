export interface RegisterTable {
  header: string[];
  rows: string[][];
}

export interface ParsedRegisterRow {
  cells: string[];
  byHeader: Record<string, string>;
}

function isSeparatorRow(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed.startsWith("|")) return false;
  return trimmed
    .slice(1, -1)
    .split("|")
    .every((cell) => /^[\s:-]+$/.test(cell));
}

function splitTableRow(line: string): string[] {
  return line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((cell) => cell.trim());
}

export function parseRegisterTable(content: string): RegisterTable | null {
  const lines = content.split(/\r?\n/);
  let headerIndex = -1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line.startsWith("|")) continue;
    if (i + 1 < lines.length && isSeparatorRow(lines[i + 1])) {
      headerIndex = i;
      break;
    }
  }

  if (headerIndex === -1) return null;

  const header = splitTableRow(lines[headerIndex]);
  const rows: string[][] = [];

  for (let i = headerIndex + 2; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line.startsWith("|")) break;
    rows.push(splitTableRow(line));
  }

  return { header, rows };
}

export function rowToRecord(
  table: RegisterTable,
  row: string[],
): ParsedRegisterRow {
  const byHeader: Record<string, string> = {};
  for (let i = 0; i < table.header.length; i++) {
    byHeader[table.header[i]] = row[i] ?? "";
  }
  return { cells: row, byHeader };
}

export function formatTableRow(cells: string[]): string {
  return `| ${cells.join(" | ")} |`;
}

export function appendRegisterRow(
  content: string,
  row: string[],
  options?: { title?: string },
): string {
  const existing = parseRegisterTable(content);
  if (!existing) {
    return createRegisterTable(options?.title ?? "Register", row);
  }

  const lines = content.split(/\r?\n/);
  const rowLine = formatTableRow(
    padRow(existing.header.length, row),
  );

  const lastRowIndex = findLastTableRowIndex(lines);
  if (lastRowIndex === -1) {
    return content.trimEnd() + "\n" + rowLine + "\n";
  }

  lines.splice(lastRowIndex + 1, 0, rowLine);
  return lines.join("\n");
}

export function updateRegisterRow(
  content: string,
  keyColumn: string,
  keyValue: string,
  updater: (row: ParsedRegisterRow) => string[],
): string {
  const table = parseRegisterTable(content);
  if (!table) {
    throw new Error("Register table not found");
  }

  const keyIndex = table.header.indexOf(keyColumn);
  if (keyIndex === -1) {
    throw new Error(`Column not found: ${keyColumn}`);
  }

  const lines = content.split(/\r?\n/);
  const headerIndex = findHeaderIndex(lines);
  if (headerIndex === -1) {
    throw new Error("Register table header not found");
  }

  let updated = false;
  for (let i = headerIndex + 2; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line.startsWith("|")) break;
    const cells = splitTableRow(line);
    if (cells[keyIndex] === keyValue) {
      const newCells = padRow(
        table.header.length,
        updater(rowToRecord(table, cells)),
      );
      lines[i] = formatTableRow(newCells);
      updated = true;
      break;
    }
  }

  if (!updated) {
    throw new Error(`Register row not found for ${keyColumn}=${keyValue}`);
  }

  return lines.join("\n");
}

export function createRegisterTable(title: string, row: string[]): string {
  const header = inferHeaderFromRow(row);
  return [
    `# ${title}`,
    "",
    formatTableRow(header),
    formatTableRow(header.map(() => "---")),
    formatTableRow(padRow(header.length, row)),
    "",
  ].join("\n");
}

export function createEmptyRegisterTable(title: string, header: string[]): string {
  return [
    `# ${title}`,
    "",
    formatTableRow(header),
    formatTableRow(header.map(() => "---")),
    "",
  ].join("\n");
}

function inferHeaderFromRow(row: string[]): string[] {
  if (row.length >= 6) {
    return ["Task", "Started", "Finished", "Status", "Outcome", "Note"];
  }
  if (row.length >= 5) {
    return ["Decided", "Decision", "Status", "Area", "Note"];
  }
  return row.map((_, i) => `Col${i + 1}`);
}

function padRow(width: number, row: string[]): string[] {
  const cells = [...row];
  while (cells.length < width) {
    cells.push("");
  }
  return cells.slice(0, width);
}

function findHeaderIndex(lines: string[]): number {
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line.startsWith("|")) continue;
    if (i + 1 < lines.length && isSeparatorRow(lines[i + 1])) {
      return i;
    }
  }
  return -1;
}

function findLastTableRowIndex(lines: string[]): number {
  const headerIndex = findHeaderIndex(lines);
  if (headerIndex === -1) return -1;

  let last = headerIndex + 1;
  for (let i = headerIndex + 2; i < lines.length; i++) {
    if (!lines[i].trim().startsWith("|")) break;
    last = i;
  }
  return last;
}
