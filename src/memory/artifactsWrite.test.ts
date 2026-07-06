import {
  InvalidPlanFileError,
  memoryWriteArchitecture,
  memoryWriteManualTest,
  memoryWritePlan,
  memoryWriteSpecification,
  resolvePlanFilePath,
} from "./artifactsWrite";
import { memoryGetWorkflow } from "./workflow";
import { MapVaultWriter } from "./vaultWriter";

describe("specification and architecture write tools", () => {
  test("creates specification and architecture folders", async () => {
    const writer = new MapVaultWriter({});
    const spec = await memoryWriteSpecification(writer, {
      taskId: "TASK-77",
      featureName: "billing-export",
      content: "# Billing export spec\n",
    });
    const arch = await memoryWriteArchitecture(writer, {
      taskId: "TASK-77",
      featureName: "billing-export",
      content: "# Billing export architecture\n",
    });

    expect(spec.created).toBe(true);
    expect(spec.path).toBe("specifications/TASK-77-billing-export/spec.md");
    expect(arch.path).toBe(
      "architecture/TASK-77-billing-export/proposal.md",
    );
  });
});

describe("plan and manual-test write tools", () => {
  test("creates master plan and phase files", async () => {
    const writer = new MapVaultWriter({});
    const master = await memoryWritePlan(writer, {
      taskId: "TASK-88",
      briefDescription: "export-api",
      file: "master-plan",
      content: "# Master plan\n",
    });
    const phase = await memoryWritePlan(writer, {
      taskId: "TASK-88",
      briefDescription: "export-api",
      file: "02-write-path",
      content: "# Phase 02\n",
    });

    expect(master.created).toBe(true);
    expect(master.path).toBe("plans/TASK-88-export-api/master-plan.md");
    expect(phase.path).toBe("plans/TASK-88-export-api/02-write-path.md");
  });

  test("rejects invalid phase filenames", () => {
    expect(() =>
      resolvePlanFilePath("TASK-1", "feature", "foundation"),
    ).toThrow(InvalidPlanFileError);
    expect(() =>
      resolvePlanFilePath("TASK-1", "feature", "1-bad-prefix"),
    ).toThrow(InvalidPlanFileError);
    expect(() =>
      resolvePlanFilePath("TASK-1", "feature", "02-nested/path"),
    ).toThrow(InvalidPlanFileError);
  });

  test("normalizes optional .md extension for phase files", () => {
    expect(
      resolvePlanFilePath("TASK-1", "feature", "02-write-path.md"),
    ).toBe("plans/TASK-1-feature/02-write-path.md");
  });

  test("creates manual test plan and insomnia files", async () => {
    const writer = new MapVaultWriter({});
    const plan = await memoryWriteManualTest(writer, {
      featureName: "billing-export",
      file: "plan",
      content: "# Manual test plan\n",
    });
    const insomnia = await memoryWriteManualTest(writer, {
      featureName: "billing-export",
      file: "insomnia",
      content: '{"_type":"export"}\n',
    });

    expect(plan.path).toBe("manual-test-plans/billing-export/plan.md");
    expect(insomnia.path).toBe(
      "manual-test-plans/billing-export/insomnia.json",
    );
  });

  test("written spec appears in memory_get_workflow", async () => {
    const writer = new MapVaultWriter({});
    await memoryWriteSpecification(writer, {
      taskId: "TASK-99",
      featureName: "new-feature",
      content: "# New feature spec\n",
    });
    await memoryWritePlan(writer, {
      taskId: "TASK-99",
      briefDescription: "new-feature",
      file: "master-plan",
      content: "# Plan\n",
    });

    const workflow = await memoryGetWorkflow(writer, { taskId: "TASK-99" });
    expect(workflow.specification?.path).toBe(
      "specifications/TASK-99-new-feature/spec.md",
    );
    expect(workflow.planMaster?.path).toBe(
      "plans/TASK-99-new-feature/master-plan.md",
    );
  });
});
