/** Memory Schema v1.1 — folder and file names (hardcoded). */

export const MEMORY_ROOT = "memory/projects";

/** Global short-term desk (current task + conversation). */
export const SHORT_TERM_ROOT = "memory/short-term";

export const SHORT_TERM_FILES = {
  currentTask: "current-task.md",
  conversationContext: "conversation.context.md",
} as const;

export const PROJECT_SUBDIRS = {
  tasks: "tasks",
  longTerm: "long-term",
  decisions: "long-term/decisions",
  daily: "daily",
} as const;

export const PROJECT_FILES = {
  tasksIndex: "tasks/tasks-index.md",
  decisionsIndex: "long-term/decisions-index.md",
  codePatterns: "long-term/code-patterns.md",
  lessonsLearned: "long-term/lessons-learned.md",
  toolsReference: "long-term/tools-reference.md",
} as const;

export const ARTIFACT_ROOTS = {
  specifications: "specifications",
  architecture: "architecture",
  plans: "plans",
  manualTestPlans: "manual-test-plans",
} as const;

export const ARTIFACT_FILES = {
  specification: "spec.md",
  architecture: "proposal.md",
  planMaster: "master-plan.md",
  manualTestPlan: "plan.md",
  manualTestInsomnia: "insomnia.json",
} as const;

/** YYYY-MM-DD */
export const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/** NN-phase-slug.md */
export const PHASE_FILE_PATTERN = /^(\d{2})-(.+)\.md$/;

export const DECISION_FRONTMATTER_FIELDS = [
  "type",
  "status",
  "area",
  "files",
  "decided",
  "reviewed",
  "origin",
  "supersedes",
  "superseded-by",
] as const;

export const DECISION_STATUSES = ["active", "superseded", "needs-review"] as const;

export const TASK_STATUSES = ["active", "parked", "done", "abandoned"] as const;
