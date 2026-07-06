import { posix } from "path";

import { manualTestInsomniaPath, manualTestPlanPath } from "../paths";
import { ARTIFACT_FILES, ARTIFACT_ROOTS, PHASE_FILE_PATTERN } from "../schema";
import { extractFeatureSlugFromFolderName, folderMatchesTaskId } from "../parse/taskId";

export interface WorkflowArtifacts {
  taskId: string;
  specification?: string;
  architecture?: string;
  planFolder?: string;
  planMaster?: string;
  planPhases: string[];
  manualTestPlan?: string;
  manualTestInsomnia?: string;
  featureName?: string;
}

function normalizePaths(paths: string[]): string[] {
  return paths.map((p) => p.replace(/\\/g, "/"));
}

function findMatchingFolders(
  allPaths: string[],
  root: string,
  taskId: string,
): string[] {
  const prefix = root.endsWith("/") ? root : root + "/";
  const folders = new Set<string>();

  for (const filePath of allPaths) {
    if (!filePath.startsWith(prefix)) continue;
    const remainder = filePath.slice(prefix.length);
    const folder = remainder.split("/")[0];
    if (folder && folderMatchesTaskId(folder, taskId)) {
      folders.add(folder);
    }
  }

  return [...folders].sort();
}

function artifactFileInFolder(
  root: string,
  folderName: string,
  fileName: string,
): string {
  return `${root}/${folderName}/${fileName}`;
}

function pickFirstExisting(paths: string[], allPaths: Set<string>): string | undefined {
  return paths.find((candidate) => allPaths.has(candidate));
}

function findPlanMasterMatch(paths: string[], taskId: string): string | undefined {
  return paths.find(
    (p) =>
      (p.startsWith(`${ARTIFACT_ROOTS.plans}/${taskId}-`) ||
        p.startsWith(`${ARTIFACT_ROOTS.plans}/${taskId}/`)) &&
      p.endsWith(`/${ARTIFACT_FILES.planMaster}`),
  );
}

export function resolveWorkflowArtifacts(
  taskId: string,
  allPaths: string[],
): WorkflowArtifacts {
  const paths = normalizePaths(allPaths);
  const pathSet = new Set(paths);

  const specFolders = findMatchingFolders(paths, ARTIFACT_ROOTS.specifications, taskId);
  const archFolders = findMatchingFolders(paths, ARTIFACT_ROOTS.architecture, taskId);
  const planFolders = findMatchingFolders(paths, ARTIFACT_ROOTS.plans, taskId);

  const specFolder = specFolders[0];
  const archFolder = archFolders[0];
  const planFolderName = planFolders[0];

  const featureName =
    (specFolder && extractFeatureSlugFromFolderName(specFolder, taskId)) ||
    (archFolder && extractFeatureSlugFromFolderName(archFolder, taskId)) ||
    (planFolderName && extractFeatureSlugFromFolderName(planFolderName, taskId)) ||
    undefined;

  const specification = specFolder
    ? pickFirstExisting(
        [
          artifactFileInFolder(
            ARTIFACT_ROOTS.specifications,
            specFolder,
            ARTIFACT_FILES.specification,
          ),
        ],
        pathSet,
      )
    : paths.find(
        (p) =>
          (p.startsWith(`${ARTIFACT_ROOTS.specifications}/${taskId}-`) ||
            p.startsWith(`${ARTIFACT_ROOTS.specifications}/${taskId}/`)) &&
          p.endsWith(`/${ARTIFACT_FILES.specification}`),
      );

  const architecture = archFolder
    ? pickFirstExisting(
        [
          artifactFileInFolder(
            ARTIFACT_ROOTS.architecture,
            archFolder,
            ARTIFACT_FILES.architecture,
          ),
        ],
        pathSet,
      )
    : paths.find(
        (p) =>
          (p.startsWith(`${ARTIFACT_ROOTS.architecture}/${taskId}-`) ||
            p.startsWith(`${ARTIFACT_ROOTS.architecture}/${taskId}/`)) &&
          p.endsWith(`/${ARTIFACT_FILES.architecture}`),
      );

  const planMasterMatch = findPlanMasterMatch(paths, taskId);
  const resolvedPlanFolder = planFolderName
    ? `${ARTIFACT_ROOTS.plans}/${planFolderName}`
    : planMasterMatch
      ? posix.dirname(planMasterMatch)
      : undefined;

  const planMaster = resolvedPlanFolder
    ? pickFirstExisting(
        [`${resolvedPlanFolder}/${ARTIFACT_FILES.planMaster}`],
        pathSet,
      )
    : undefined;

  const planPhases = resolvedPlanFolder
    ? paths
        .filter((p) => p.startsWith(`${resolvedPlanFolder}/`))
        .filter((p) => {
          const fileName = posix.basename(p);
          return PHASE_FILE_PATTERN.test(fileName);
        })
        .sort()
    : [];

  const manualTestPlan = featureName
    ? pickFirstExisting([manualTestPlanPath(featureName)], pathSet)
    : undefined;

  const manualTestInsomnia = featureName
    ? pickFirstExisting([manualTestInsomniaPath(featureName)], pathSet)
    : undefined;

  return {
    taskId,
    specification,
    architecture,
    planFolder: resolvedPlanFolder,
    planMaster,
    planPhases,
    manualTestPlan,
    manualTestInsomnia,
    featureName,
  };
}
