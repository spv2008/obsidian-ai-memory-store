import { architecturePath, specificationPath } from "./paths";
import type { MemoryVaultWriter } from "./vaultWriter";

export type ArtifactWriteMode = "replace" | "append";

export interface WriteSpecificationInput {
  taskId: string;
  featureName: string;
  content: string;
  mode?: ArtifactWriteMode;
}

export interface WriteArchitectureInput {
  taskId: string;
  featureName: string;
  content: string;
  mode?: ArtifactWriteMode;
}

export interface ArtifactWriteResult {
  path: string;
  created: boolean;
}

async function writeContent(
  writer: MemoryVaultWriter,
  path: string,
  content: string,
  mode: ArtifactWriteMode = "replace",
): Promise<ArtifactWriteResult> {
  const existed = await writer.exists(path);
  if (mode === "append" && existed) {
    await writer.append(path, content);
    return { path, created: false };
  }
  await writer.write(path, content);
  return { path, created: !existed };
}

export async function memoryWriteSpecification(
  writer: MemoryVaultWriter,
  input: WriteSpecificationInput,
): Promise<ArtifactWriteResult> {
  const path = specificationPath(input.taskId, input.featureName);
  return writeContent(writer, path, input.content, input.mode);
}

export async function memoryWriteArchitecture(
  writer: MemoryVaultWriter,
  input: WriteArchitectureInput,
): Promise<ArtifactWriteResult> {
  const path = architecturePath(input.taskId, input.featureName);
  return writeContent(writer, path, input.content, input.mode);
}
