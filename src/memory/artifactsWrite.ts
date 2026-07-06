import {
  architecturePath,
  manualTestInsomniaPath,
  manualTestPlanPath,
  planMasterPath,
  planPhasePath,
  specificationPath,
} from "./paths";
import type { MemoryVaultWriter } from "./vaultWriter";

export class InvalidPlanFileError extends Error {}

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

export interface WritePlanInput {
  taskId: string;
  briefDescription: string;
  file: string;
  content: string;
  mode?: ArtifactWriteMode;
}

export type ManualTestFile = "plan" | "insomnia";

export interface WriteManualTestInput {
  featureName: string;
  file: ManualTestFile;
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

const PHASE_FILE_INPUT_PATTERN = /^\d{2}-.+$/;

export function resolvePlanFilePath(
  taskId: string,
  briefDescription: string,
  file: string,
): string {
  const trimmed = file.trim();
  if (trimmed === "master-plan") {
    return planMasterPath(taskId, briefDescription);
  }
  if (!PHASE_FILE_INPUT_PATTERN.test(trimmed)) {
    throw new InvalidPlanFileError(
      'Plan file must be "master-plan" or "{NN}-{phase-description}"',
    );
  }
  return planPhasePath(taskId, briefDescription, `${trimmed}.md`);
}

export async function memoryWritePlan(
  writer: MemoryVaultWriter,
  input: WritePlanInput,
): Promise<ArtifactWriteResult> {
  const path = resolvePlanFilePath(
    input.taskId,
    input.briefDescription,
    input.file,
  );
  return writeContent(writer, path, input.content, input.mode);
}

function manualTestPath(featureName: string, file: ManualTestFile): string {
  return file === "plan"
    ? manualTestPlanPath(featureName)
    : manualTestInsomniaPath(featureName);
}

export async function memoryWriteManualTest(
  writer: MemoryVaultWriter,
  input: WriteManualTestInput,
): Promise<ArtifactWriteResult> {
  const path = manualTestPath(input.featureName, input.file);
  return writeContent(writer, path, input.content, input.mode);
}
