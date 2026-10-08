import { afterEach, expect, it, vi } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { openStore } from "../src/main/storage";
import { Workflow } from "../src/main/workflow";
import { parseResearch, type ResearchDraft } from "../src/shared/research";
import { ResearchJobs } from "../src/main/codex/jobs";
const dirs: string[] = [];
afterEach(() =>
  dirs
    .splice(0)
    .forEach((dir) => rmSync(dir, { recursive: true, force: true })),
);
import { draft } from "./fixtures/research";
async function setup() {
  const dir = mkdtempSync(join(tmpdir(), "studio-research-"));
  dirs.push(dir);
  const store = await openStore(dir);
  store.saveBrand({
    name: "Studio",
    colors: ["#4364F7", "#D6F369", "#F2EFD9"],
    voice: "Clear",
  });
  return { dir, store, workflow: new Workflow(store, dir) };
}
it("rejects private or unsafe source links and out-of-range claim mappings", () => {
  expect(() =>
    parseResearch({
      ...draft,
      sources: [{ ...draft.sources[0], url: "http://localhost/private" }],
    }),
  ).toThrow();
  expect(() =>
    parseResearch({
      ...draft,
      points: [{ text: "claim", sourceIndices: [4] }],
    }),
  ).toThrow();
});
it("stores researched captions, source evidence and a real draft graphic, retaining old sample packs", async () => {
  const { dir, store, workflow } = await setup();
  workflow.createSamplePack({ topic: "Old pack", requestId: "sample" });
  const pack = workflow.createResearchPack(
    { topic: "Python dictionaries", requestId: "research" },
    parseResearch(draft),
    { model: "default", openedUrls: [draft.sources[0].url], threadId: "t" },
  );
  expect(pack.sample).toBe(false);
  expect(pack.targets[2].caption).toBe("Choose a default for missing keys.");
  expect(pack.sources[0].openedByCodex).toBe(true);
  expect(pack.research?.script).toContain("missing-key error");
  expect(
    workflow.getPackViews().find((p) => p.id === pack.id)?.graphicPreview,
  ).toMatch(/^data:image\/svg/);
  store.close();
  const recovered = await openStore(dir);
  expect(recovered.getPacks()).toHaveLength(2);
  recovered.close();
});
it("persists a job before running, deduplicates requests, and never reruns interrupted jobs", async () => {
  const { dir, store, workflow } = await setup();
  let resolve!: (value: any) => void;
  let calls = 0;
  const generate = () => {
    calls++;
    return new Promise<any>((yes) => {
      resolve = yes;
    });
  };
  const jobs = new ResearchJobs(store, workflow, dir, generate);
  const first = jobs.start({
    topic: "Python dictionaries",
    requestId: "research",
  });
  expect(
    jobs.start({ topic: "Python dictionaries", requestId: "research" }).id,
  ).toBe(first.id);
  expect(store.getJobs()[0].stage).toBe("researching");
  expect(calls).toBe(1);
  store.saveBrand({
    name: "Changed brand",
    colors: ["#111111", "#222222", "#333333"],
    voice: "A different voice",
  });
  resolve({
    draft: parseResearch(draft),
    model: "default",
    openedUrls: [draft.sources[0].url],
    threadId: "t",
  });
  await jobs.waitForIdle();
  expect(store.getJobs()[0].stage).toBe("ready");
  expect(store.getPacks()).toHaveLength(1);
  expect(store.getPacks()[0].brand.name).toBe("Studio");
  store.saveJob({
    ...first,
    id: "interrupted-job",
    requestId: "interrupted",
    stage: "researching",
  });
  store.close();
  const recovered = await openStore(dir);
  const resumed = new ResearchJobs(
    recovered,
    new Workflow(recovered, dir),
    dir,
    generate,
  );
  expect(
    recovered.getJobs().find((j) => j.id === "interrupted-job")?.stage,
  ).toBe("interrupted");
  expect(calls).toBe(1);
  resumed.close();
  recovered.close();
});
it("cancellation prevents even a late successful response from saving a pack", async () => {
  const { dir, store, workflow } = await setup();
  let resolve!: (value: any) => void;
  const jobs = new ResearchJobs(
    store,
    workflow,
    dir,
    () =>
      new Promise<any>((yes) => {
        resolve = yes;
      }),
  );
  const job = jobs.start({
    topic: "Python dictionaries",
    requestId: "cancelled",
  });
  jobs.cancel(job.id);
  resolve({
    draft: parseResearch(draft),
    model: "default",
    openedUrls: [draft.sources[0].url],
    threadId: "t",
  });
  await jobs.waitForIdle();
  expect(store.getJobs()[0].stage).toBe("cancelled");
  expect(store.getPacks()).toHaveLength(0);
  jobs.close();
  store.close();
});
it("recovers a saved pack when the app closed before marking its research job ready", async () => {
  const { dir, store, workflow } = await setup();
  const pack = workflow.createResearchPack(
    { topic: "Python dictionaries", requestId: "saved" },
    parseResearch(draft),
    { model: "default", openedUrls: [draft.sources[0].url], threadId: "t" },
  );
  store.saveJob({
    id: "crashed",
    packId: "pending",
    kind: "research",
    stage: "writing",
    error: null,
    topic: "Python dictionaries",
    requestId: "saved",
  });
  const jobs = new ResearchJobs(store, workflow, dir, async () => {
    throw new Error("Must not run again");
  });
  expect(store.getJobs().find((job) => job.id === "crashed")).toMatchObject({
    stage: "ready",
    packId: pack.id,
    error: null,
  });
  jobs.close();
  store.close();
});
it("does not reuse a sample request for researched content", async () => {
  const { store, workflow } = await setup();
  workflow.createSamplePack({
    topic: "Python dictionaries",
    requestId: "shared",
  });
  expect(() =>
    workflow.createResearchPack(
      { topic: "Python dictionaries", requestId: "shared" },
      parseResearch(draft),
      { model: "default", openedUrls: [], threadId: "t" },
    ),
  ).toThrow();
  store.close();
});

it("keeps a completed pack ready when status persistence fails", async () => {
  const { dir, store, workflow } = await setup();
  let resolve!: (value: any) => void;
  const jobs = new ResearchJobs(
    store,
    workflow,
    dir,
    () =>
      new Promise<any>((yes) => {
        resolve = yes;
      }),
  );
  const job = jobs.start({
    topic: "Python dictionaries",
    requestId: "disk-failure",
  });
  vi.spyOn(store, "saveJob").mockImplementation(() => {
    throw new Error("Disk full");
  });
  resolve({
    draft: parseResearch(draft),
    model: "default",
    openedUrls: [draft.sources[0].url],
    threadId: "t",
  });
  await jobs.waitForIdle();
  expect(jobs.getJobs().find((item) => item.id === job.id)).toMatchObject({
    stage: "ready",
  });
  expect(store.getPacks()).toHaveLength(1);
  expect(jobs.getJobs().find((item) => item.id === job.id)?.error).toContain(
    "disk space",
  );
  vi.restoreAllMocks();
  jobs.close();
  store.close();
});
it("cancels safely even if the disk cannot save status", async () => {
  const { dir, store, workflow } = await setup();
  let resolve!: (value: any) => void;
  const jobs = new ResearchJobs(
    store,
    workflow,
    dir,
    () =>
      new Promise<any>((yes) => {
        resolve = yes;
      }),
  );
  const job = jobs.start({
    topic: "Python dictionaries",
    requestId: "disk-cancel",
  });
  vi.spyOn(store, "saveJob").mockImplementation(() => {
    throw new Error("Disk full");
  });
  expect(() => jobs.close()).not.toThrow();
  expect(jobs.getJobs().find((item) => item.id === job.id)?.stage).toBe(
    "cancelled",
  );
  resolve({
    draft: parseResearch(draft),
    model: "default",
    openedUrls: [],
    threadId: "t",
  });
  await jobs.waitForIdle();
  expect(store.getPacks()).toHaveLength(0);
  vi.restoreAllMocks();
  store.close();
});
it("does not expose private filesystem paths in job errors", async () => {
  const { dir, store, workflow } = await setup();
  const jobs = new ResearchJobs(store, workflow, dir, async () => {
    throw new Error("EACCES /Users/private/account/file");
  });
  const job = jobs.start({
    topic: "Python dictionaries",
    requestId: "safe-error",
  });
  await jobs.waitForIdle();
  const error = jobs.getJobs().find((item) => item.id === job.id)?.error;
  expect(error).not.toContain("/Users");
  expect(error).toContain("disk space");
  jobs.close();
  store.close();
});
vi.mock("../src/main/provider", () => ({
  findCodex: async () => ({
    path: "/fixture/codex",
    version: "codex-cli fixture",
  }),
}));
it("requests source verification once in the same session and rejects missing evidence", async () => {
  const { CodexClient } = await import("../src/main/codex/client");
  const { generateResearch } = await import("../src/main/codex/research");
  const { dir, store } = await setup();
  vi.spyOn(CodexClient.prototype, "start").mockResolvedValue();
  vi.spyOn(CodexClient.prototype, "account").mockResolvedValue({
    authenticated: true,
    mode: "chatgpt",
  });
  const response = {
    text: JSON.stringify(draft),
    openedUrls: [],
    searched: false,
    model: "fixture",
    threadId: "same-thread",
  };
  const generation = vi
    .spyOn(CodexClient.prototype, "generate")
    .mockResolvedValue(response);
  const input = {
    topic: "Python dictionaries",
    brand: store.getBrand()!,
    cwd: dir,
    signal: new AbortController().signal,
    onProgress: () => {},
  };
  await expect(generateResearch(input)).rejects.toThrow(
    "did not open every cited source",
  );
  expect(generation).toHaveBeenCalledTimes(2);
  expect(generation.mock.calls[1][0].session?.threadId).toBe("same-thread");
  generation
    .mockReset()
    .mockResolvedValueOnce(response)
    .mockResolvedValueOnce({
      ...response,
      searched: true,
      openedUrls: [draft.sources[0].url],
    });
  expect((await generateResearch(input)).draft.title).toBe(draft.title);
  expect(generation).toHaveBeenCalledTimes(2);
  vi.restoreAllMocks();
  store.close();
});
