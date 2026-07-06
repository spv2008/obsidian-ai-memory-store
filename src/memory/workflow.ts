import { resolveWorkflowArtifacts } from "./artifacts/resolve";
import { capExcerptLength, excerpt } from "./excerpt";
import { projectMemoryPrefix } from "./paths";
import { isDecisionNeedsReview } from "./parse/decisionsIndex";
import { frontmatterValue, parseFrontmatter } from "./parse/frontmatter";
import type { MemoryVaultReader } from "./vaultReader";

export interface WorkflowInput {
  taskId: string;
  excerptLength?: number;
  project?: string;
}

export interface WorkflowDocument {
  path: string;
  excerpt: string;
}

export interface RelatedDecision {
  path: string;
  title: string;
  excerpt: string;
  status?: string;
  needsReview?: boolean;
}

export interface WorkflowResult {
  taskId: string;
  featureName?: string;
  specification?: WorkflowDocument;
  architecture?: WorkflowDocument;
  planMaster?: WorkflowDocument;
  planPhases: WorkflowDocument[];
  manualTestPlan?: WorkflowDocument;
  manualTestInsomnia?: WorkflowDocument;
  relatedDecisions: RelatedDecision[];
}

async function readExcerpt(
  reader: MemoryVaultReader,
  path: string | undefined,
  excerptLength: number,
): Promise<WorkflowDocument | undefined> {
  if (!path) {
    return undefined;
  }
  const content = await reader.read(path);
  if (!content) {
    return undefined;
  }
  return { path, excerpt: excerpt(content, excerptLength) };
}

async function findRelatedDecisions(
  reader: MemoryVaultReader,
  taskId: string,
  artifactPaths: string[],
  excerptLength: number,
  project?: string,
): Promise<RelatedDecision[]> {
  const allPaths = await reader.listPaths();
  const decisionPaths = allPaths.filter((filePath) => {
    if (!filePath.includes("/long-term/decisions/")) {
      return false;
    }
    if (project) {
      return filePath.startsWith(`${projectMemoryPrefix(project)}long-term/decisions/`);
    }
    return filePath.startsWith("memory/projects/");
  });

  const related: RelatedDecision[] = [];
  const taskIdLower = taskId.toLowerCase();

  for (const path of decisionPaths) {
    const content = await reader.read(path);
    if (!content) {
      continue;
    }
    const frontmatter = parseFrontmatter(content);
    const origin = frontmatterValue(frontmatter?.origin).toLowerCase();
    const matchesTask =
      origin.includes(taskIdLower) ||
      artifactPaths.some((artifactPath) =>
        origin.includes(artifactPath.toLowerCase()),
      );
    if (!matchesTask) {
      continue;
    }

    const status = frontmatterValue(frontmatter?.status);
    const decided = frontmatterValue(frontmatter?.decided);
    const titleMatch = /^##\s+(.+)$/m.exec(content);
    related.push({
      path,
      title: titleMatch?.[1] ?? path.split("/").pop() ?? path,
      excerpt: excerpt(content, excerptLength),
      status: status || undefined,
      needsReview:
        status.toLowerCase() === "active" && isDecisionNeedsReview(decided),
    });
  }

  return related;
}

export async function memoryGetWorkflow(
  reader: MemoryVaultReader,
  input: WorkflowInput,
): Promise<WorkflowResult> {
  const excerptLength = capExcerptLength(input.excerptLength);
  const allPaths = await reader.listPaths();
  const artifacts = resolveWorkflowArtifacts(input.taskId, allPaths);

  const specification = await readExcerpt(
    reader,
    artifacts.specification,
    excerptLength,
  );
  const architecture = await readExcerpt(
    reader,
    artifacts.architecture,
    excerptLength,
  );
  const planMaster = await readExcerpt(
    reader,
    artifacts.planMaster,
    excerptLength,
  );
  const planPhases = (
    await Promise.all(
      artifacts.planPhases.map((phasePath) =>
        readExcerpt(reader, phasePath, excerptLength),
      ),
    )
  ).filter((phase): phase is WorkflowDocument => phase !== undefined);
  const manualTestPlan = await readExcerpt(
    reader,
    artifacts.manualTestPlan,
    excerptLength,
  );
  const manualTestInsomnia = await readExcerpt(
    reader,
    artifacts.manualTestInsomnia,
    excerptLength,
  );

  const artifactPaths = [
    artifacts.specification,
    artifacts.architecture,
    artifacts.planMaster,
    ...artifacts.planPhases,
    artifacts.manualTestPlan,
    artifacts.manualTestInsomnia,
  ].filter((path): path is string => Boolean(path));

  const relatedDecisions = await findRelatedDecisions(
    reader,
    input.taskId,
    artifactPaths,
    excerptLength,
    input.project,
  );

  return {
    taskId: input.taskId,
    featureName: artifacts.featureName,
    specification,
    architecture,
    planMaster,
    planPhases,
    manualTestPlan,
    manualTestInsomnia,
    relatedDecisions,
  };
}
