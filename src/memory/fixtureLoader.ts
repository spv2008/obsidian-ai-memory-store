import fs from "fs";
import path from "path";

export function loadFixtureVault(fixtureName: string): Record<string, string> {
  const root = path.join(__dirname, "__fixtures__", fixtureName);
  const files: Record<string, string> = {};

  function walk(dir: string, prefix: string): void {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const fullPath = path.join(dir, entry.name);
      const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (entry.isDirectory()) {
        walk(fullPath, relativePath);
      } else {
        files[relativePath.replace(/\\/g, "/")] = fs.readFileSync(fullPath, "utf8");
      }
    }
  }

  walk(root, "");
  return files;
}
