import {
  memoryWriteArchitecture,
  memoryWriteSpecification,
} from "./artifactsWrite";
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
