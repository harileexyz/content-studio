import { expect, it } from "vitest";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { generateResearch } from "../src/main/codex/research";
import type { ResearchActivityInput } from "../src/shared/models";
it.skipIf(process.env.STUDIO_LIVE_CODEX !== "1")(
  "streams one real research attempt from the signed-in local Codex account",
  async () => {
    const cwd = resolve("work/live-research");
    mkdirSync(cwd, { recursive: true });
    const activity: ResearchActivityInput[] = [];
    let result: Awaited<ReturnType<typeof generateResearch>> | undefined;
    try {
      result = await generateResearch({
        topic: "How Python dictionary.get handles missing keys",
        brand: {
          id: "brand",
          name: "Content Studio",
          colors: ["#4364F7", "#D6F369", "#F2EFD9"],
          voice: "Clear, friendly and practical",
        },
        cwd,
        signal: new AbortController().signal,
        onProgress: (stage) => console.log("Research stage:", stage),
        onActivity: (event) => activity.push(event),
      });
    } catch (error) {
      expect((error as Error).message).toMatch(/did not open every cited source/);
    }
    expect(activity.some((item) => item.kind === "search")).toBe(true);
    expect(activity.some((item) => item.kind === "source")).toBe(true);
    expect(activity.some((item) => item.kind === "writing")).toBe(true);
    if (result) {
      expect(result.draft.sources.length).toBeGreaterThan(0);
      expect(result.openedUrls.length).toBeGreaterThan(0);
      expect(result.draft.script.length).toBeGreaterThan(50);
      writeFileSync(
        resolve("work/live-research/result.json"),
        JSON.stringify(result, null, 2),
        { mode: 0o600 },
      );
    }
    writeFileSync(
      resolve("work/live-research/activity.json"),
      JSON.stringify(activity, null, 2),
      { mode: 0o600 },
    );
  },
  360000,
);
