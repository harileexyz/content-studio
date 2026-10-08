import { randomUUID } from "node:crypto";
import { join } from "node:path";
import type { Store } from "../storage";
import type { Workflow } from "../workflow";
import { parseRequest } from "../../shared/contracts";
import type {
  CreateInput,
  Job,
  ResearchActivityInput,
} from "../../shared/models";
import { generateResearch } from "./research";
type Generator = typeof generateResearch;
export class ResearchJobs {
  private transient = new Map<string, Job>();
  getJobs() {
    return this.store.getJobs().map((job) => this.transient.get(job.id) ?? job);
  }
  private save(job: Job) {
    try {
      this.store.saveJob(job);
      this.transient.delete(job.id);
    } catch {
      this.transient.set(job.id, {
        ...job,
        error: [
          job.error,
          "This status could not be saved. Check available disk space.",
        ]
          .filter(Boolean)
          .join(" "),
      });
    }
  }
  private running = new Map<
    string,
    { controller: AbortController; task: Promise<void> }
  >();
  constructor(
    private store: Store,
    private workflow: Workflow,
    private dir: string,
    private generate: Generator = generateResearch,
  ) {
    for (const job of store.getJobs())
      if (
        job.kind === "research" &&
        (job.stage === "researching" ||
          job.stage === "writing" ||
          job.stage === "failed")
      ) {
        const pack = job.requestId
          ? store.getByRequest(job.requestId)
          : undefined;
        this.save(
          pack && !pack.sample && pack.topic === job.topic
            ? { ...job, packId: pack.id, stage: "ready", error: null }
            : {
                ...job,
                stage: job.stage === "failed" ? "failed" : "interrupted",
                error:
                  job.stage === "failed"
                    ? job.error
                    : "The app closed before research finished. Start a new request to try again.",
              },
        );
      }
  }
  start(input: CreateInput): Job {
    const valid = parseRequest("createResearchPack", input);
    const existing = this.store
      .getJobs()
      .find(
        (job) => job.kind === "research" && job.requestId === valid.requestId,
      );
    if (existing) {
      if (existing.topic !== valid.topic)
        throw new Error("This request was already used for different content.");
      return existing;
    }
    if (this.running.size)
      throw new Error(
        "Research is already running. Wait or cancel it before starting another topic.",
      );
    const brand = this.store.getBrand();
    if (!brand) throw new Error("Save your brand before creating a pack.");
    const job: Job = {
      id: randomUUID(),
      packId: randomUUID(),
      kind: "research",
      stage: "researching",
      error: null,
      topic: valid.topic,
      requestId: valid.requestId,
      createdAt: new Date().toISOString(),
      activity: [
        {
          id: randomUUID(),
          at: new Date().toISOString(),
          kind: "status",
          label: "Starting Codex",
        },
      ],
    };
    this.store.saveJob(job);
    let current = job;
    const update = (patch: Partial<Job>) => {
      current = { ...current, ...patch };
      this.save(current);
    };
    const addActivity = (event: ResearchActivityInput) => {
      update({
        activity: [
          ...(current.activity ?? []),
          { ...event, id: randomUUID(), at: new Date().toISOString() },
        ].slice(-60),
      });
    };
    const controller = new AbortController();
    const task = (async () => {
      try {
        const result = await this.generate({
          topic: valid.topic,
          brand,
          cwd: join(this.dir, "research", job.id),
          signal: controller.signal,
          onProgress: (stage) => {
            if (!controller.signal.aborted) update({ stage });
          },
          onActivity: (event) => {
            if (!controller.signal.aborted) addActivity(event);
          },
        });
        if (controller.signal.aborted) return;
        addActivity({ kind: "writing", label: "Creating the content pack" });
        const pack = this.workflow.createResearchPack(valid, result.draft, {
          ...result,
          brand,
        });
        addActivity({ kind: "complete", label: "Draft ready" });
        update({ packId: pack.id, stage: "ready", error: null });
      } catch (error) {
        if (!controller.signal.aborted) {
          {
            const savedPack = this.store.getByRequest(valid.requestId);
            const failed =
              savedPack && !savedPack.sample
                ? {
                    ...current,
                    packId: savedPack.id,
                    stage: "ready" as const,
                    error: null,
                  }
                : {
                    ...current,
                    stage: "failed" as const,
                    error:
                      error instanceof Error &&
                      /^(Codex |Research |Sign in |Install Codex |Save your brand )/.test(
                        error.message,
                      )
                        ? error.message
                        : "Research could not be saved or completed. Check available disk space and try again.",
                  };
            current = failed;
            if (failed.stage === "failed")
              addActivity({ kind: "error", label: "Research stopped" });
            else this.save(failed);
          }
        }
      } finally {
        this.running.delete(job.id);
      }
    })();
    this.running.set(job.id, { controller, task });
    return job;
  }
  cancel(id: string) {
    const active = this.running.get(id);
    if (!active) throw new Error("This research is no longer running.");
    active.controller.abort();
    const job = this.getJobs().find((job) => job.id === id)!;
    this.save({
      ...job,
      stage: "cancelled",
      error: "Research cancelled. Nothing was published.",
      activity: [
        ...(job.activity ?? []),
        {
          id: randomUUID(),
          at: new Date().toISOString(),
          kind: "error" as const,
          label: "Research cancelled",
        },
      ].slice(-60),
    });
  }
  async waitForIdle() {
    await Promise.all([...this.running.values()].map((item) => item.task));
  }
  close() {
    for (const id of [...this.running.keys()]) this.cancel(id);
  }
}
