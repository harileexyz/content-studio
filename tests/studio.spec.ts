import {
  test,
  expect,
  _electron as electron,
  type ElectronApplication,
} from "@playwright/test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
const executable = require("electron") as string;
const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;
async function launch(dir: string) {
  return electron.launch({
    executablePath: process.env.STUDIO_TEST_EXECUTABLE ?? executable,
    args: process.env.STUDIO_TEST_EXECUTABLE ? [] : ["."],
    env: { ...env, CONTENT_STUDIO_DATA_DIR: dir },
  });
}
test("desktop persists a brand and exact approval through restart", async () => {
  const dir = mkdtempSync(join(tmpdir(), "studio-desktop-"));
  let app: ElectronApplication | undefined;
  try {
    app = await launch(dir);
    let page = await app.firstWindow();
    await expect(
      page.getByRole("heading", { name: "Your next idea starts here." }),
    ).toBeVisible();
    const invalidResult = await page.evaluate(async () => {
      try {
        await window.studio!.saveBrand({
          name: "",
          colors: ["#2546E8", "#D6F369", "#F2EFD9"],
          voice: "Clear",
        });
        return "accepted";
      } catch (error) {
        return (error as Error).message;
      }
    });
    expect(invalidResult).toMatch(/missing or invalid/);
    expect(
      await page.evaluate(async () => (await window.studio!.getState()).brand),
    ).toBeNull();
    await page.getByRole("button", { name: "Brand settings" }).click();
    await page.getByLabel("Brand name").fill("Test studio");
    await page.getByRole("button", { name: "Save brand" }).click();
    await expect(page.getByText("Brand saved.")).toBeVisible();
    await page
      .getByRole("button", { name: "Connections", exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: "Set up Codex" }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Copy install command" }).click();
    await expect(page.getByText("Install command copied.")).toBeVisible();
    await page.screenshot({ path: "work/codex-setup.png", fullPage: true });
    await page.getByRole("button", { name: "Check installation" }).click();
    await expect(
      page.getByText(
        /Codex is installed|Install the Codex command-line tool to create/,
      ),
    ).toBeVisible();
    expect(
      await page.evaluate(
        async () => (await window.studio!.getState()).provider.connected,
      ),
    ).toBe(false);
    await page.getByRole("button", { name: "Create content" }).click();
    await page
      .getByLabel("What would you like to explain?")
      .fill("Useful keyboard shortcuts");
    await page.getByRole("button", { name: "Create sample pack" }).click();
    await expect(
      page.getByRole("heading", { name: "Useful keyboard shortcuts" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Approve graphic" }),
    ).toBeEnabled();
    await expect(
      page.getByRole("button", { name: "Approve video" }),
    ).toHaveCount(2);
    await expect(
      page.getByRole("button", { name: "Approve video" }).nth(0),
    ).toBeDisabled();
    await expect(
      page.getByRole("button", { name: "Approve video" }).nth(1),
    ).toBeDisabled();
    await page
      .getByLabel("Instagram feed caption")
      .fill("Try these shortcuts today.");
    await page.getByRole("button", { name: "Save caption" }).click();
    await page.getByRole("button", { name: "Approve graphic" }).click();
    await expect(page.getByText("Approved for this version")).toBeVisible();
    await page.screenshot({ path: "work/studio-desktop.png", fullPage: true });
    await app.close();
    app = await launch(dir);
    page = await app.firstWindow();
    await expect(page.getByText("Useful keyboard shortcuts")).toBeVisible();
    await page
      .getByRole("button", { name: /Useful keyboard shortcuts/ })
      .click();
    await expect(page.getByText("Approved for this version")).toBeVisible();
    await expect(page.getByLabel("Instagram feed caption")).toHaveValue(
      "Try these shortcuts today.",
    );
    await page.getByLabel("Instagram feed caption").fill("A revised caption.");
    await page.getByRole("button", { name: "Save caption" }).click();
    await expect(page.getByText("Approved for this version")).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "Approve graphic" }),
    ).toBeEnabled();
    const permissions = await page.evaluate(() => ({
      require: typeof (globalThis as Record<string, unknown>).require,
      process: typeof (globalThis as Record<string, unknown>).process,
      bridge: Object.keys(window.studio ?? {}).sort(),
    }));
    expect(permissions.require).toBe("undefined");
    expect(permissions.process).toBe("undefined");
    expect(permissions.bridge).toEqual([
      "approveTarget",
      "cancelResearch",
      "connectProvider",
      "copyCodexCommand",
      "createResearchPack",
      "createSamplePack",
      "detectProvider",
      "getState",
      "openCodexInstallGuide",
      "openResearchSource",
      "openSource",
      "openTerminal",
      "reviseTarget",
      "saveBrand",
    ]);
    await page.setViewportSize({ width: 760, height: 900 });
    await page.screenshot({ path: "work/studio-narrow.png", fullPage: true });
  } finally {
    if (app) await app.close();
    rmSync(dir, { recursive: true, force: true });
  }
});

test("desktop reviews a researched pack and reports interrupted work without retrying", async () => {
  const { openStore } = await import("../src/main/storage");
  const { Workflow } = await import("../src/main/workflow");
  const { draft } = await import("./fixtures/research");
  const dir = mkdtempSync(join(tmpdir(), "studio-research-desktop-"));
  let app: ElectronApplication | undefined;
  try {
    const store = await openStore(dir);
    store.saveBrand({
      name: "Research studio",
      colors: ["#4364F7", "#D6F369", "#F2EFD9"],
      voice: "Clear",
    });
    const pack = new Workflow(store, dir).createResearchPack(
      { topic: "Python dictionaries", requestId: "research" },
      draft as any,
      {
        model: "default-model",
        openedUrls: [draft.sources[0].url],
        threadId: "fixture-thread",
      },
    );
    store.saveJob({
      id: "pending",
      packId: "not-created",
      kind: "research",
      stage: "researching",
      topic: "An interrupted topic",
      requestId: "pending-request",
      error: null,
      activity: [
        {
          id: "activity-start",
          at: "2026-10-08T08:00:00.000Z",
          kind: "search",
          label: "Searching the web",
          detail: "official Python dictionary documentation",
        },
        {
          id: "activity-source",
          at: "2026-10-08T08:00:01.000Z",
          kind: "source",
          label: "Opened a source",
          detail: "docs.python.org",
          url: "https://docs.python.org/3/library/stdtypes.html#dict.get",
        },
      ],
    });
    store.close();
    app = await launch(dir);
    const page = await app.firstWindow();
    await expect(
      page.getByText(
        "The app closed before research finished. Start a new request to try again.",
      ),
    ).toBeVisible();
    await expect(page.getByText("Searching the web")).toBeVisible();
    await expect(
      page.getByText("official Python dictionary documentation"),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Open source" }),
    ).toBeVisible();
    await page.getByRole("button", { name: /Python dictionaries/ }).click();
    await expect(
      page.getByRole("heading", { name: "Video script" }),
    ).toBeVisible();
    await expect(
      page.getByText("Evergreen guide · Drafted with default-model"),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "1. Python dictionary methods" }),
    ).toBeVisible();
    await expect(
      page.getByText("This example was not executed."),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Approve graphic" }),
    ).toBeEnabled();
    expect(
      (await page.evaluate(() => window.studio!.getState())).packs.find(
        (p) => p.id === pack.id,
      )?.sample,
    ).toBe(false);
    await page.screenshot({ path: "work/research-review.png", fullPage: true });
  } finally {
    if (app) await app.close();
    rmSync(dir, { recursive: true, force: true });
  }
});
