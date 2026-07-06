import {
  extractFeatureSlugFromFolderName,
  extractTaskIdFromFolderName,
  folderMatchesTaskId,
} from "./taskId";

describe("taskId parser", () => {
  test("extracts task id and feature slug from folder names", () => {
    expect(extractTaskIdFromFolderName("TASK-42-user-auth")).toBe("TASK-42");
    expect(extractFeatureSlugFromFolderName("TASK-42-user-auth")).toBe(
      "user-auth",
    );
  });

  test("handles nested paths", () => {
    expect(
      extractTaskIdFromFolderName("plans/TASK-99-billing-refactor"),
    ).toBe("TASK-99");
  });

  test("folderMatchesTaskId", () => {
    expect(folderMatchesTaskId("TASK-42-user-auth", "TASK-42")).toBe(true);
    expect(folderMatchesTaskId("TASK-43-other", "TASK-42")).toBe(false);
  });

  test("returns null for invalid names", () => {
    expect(extractTaskIdFromFolderName("no-dash-here")).toBeNull();
    expect(extractFeatureSlugFromFolderName("nodash")).toBeNull();
  });
});
