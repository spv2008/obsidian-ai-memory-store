import type { MemoryVaultReader } from "./vaultReader";

export interface VaultReadInput {
  path: string;
}

export interface VaultReadResult {
  path: string;
  content: string | null;
}

export async function vaultRead(
  reader: MemoryVaultReader,
  input: VaultReadInput,
): Promise<VaultReadResult> {
  const content = await reader.read(input.path);
  return { path: input.path, content };
}
