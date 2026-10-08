import { expect, it } from "vitest";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { generateResearch } from "../src/main/codex/research";
it.skipIf(process.env.STUDIO_LIVE_CODEX !== "1")(
  "creates one real web-researched draft with the signed-in local Codex account",
  async () => {
    const cwd = resolve("work/live-research");
    mkdirSync(cwd, { recursive: true });
    const result = await generateResearch({
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
    });
    expect(result.draft.sources.length).toBeGreaterThan(0);
    expect(result.openedUrls.length).toBeGreaterThan(0);
    expect(result.draft.script.length).toBeGreaterThan(50);
    writeFileSync(
      resolve("work/live-research/result.json"),
      JSON.stringify(result, null, 2),
      { mode: 0o600 },
    );
  },
  360000,
);
