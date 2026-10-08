import { ipcMain, shell, type BrowserWindow } from "electron";
import { ZodError } from "zod";
import {
  isTrustedFrame,
  parseRequest,
  schemas,
  type Method,
} from "../shared/contracts";
import type { Workflow } from "./workflow";
import type { Store } from "./storage";
import type {
  StudioState,
  ProviderStatus,
  CreateInput,
  ReviseInput,
  ApproveInput,
  BrandInput,
} from "../shared/models";
import { detectCodex, findCodex } from "./provider";
import { CodexClient, researchCommand } from "./codex/client";
import type { ResearchJobs } from "./codex/jobs";
import { isPublicSource } from "../shared/research";
export function registerBridge(
  window: BrowserWindow,
  expectedUrl: string,
  store: Store,
  workflow: Workflow,
  jobs: ResearchJobs,
) {
  let provider: ProviderStatus = {
    installed: false,
    connected: false,
    version: null,
    message: "Check whether Codex is installed.",
  };
  const state = (): StudioState => ({
    brand: store.getBrand(),
    packs: workflow.getPackViews(),
    provider,
    jobs: jobs.getJobs().filter((job) => job.kind === "research"),
  });
  for (const method of Object.keys(schemas) as Method[]) {
    ipcMain.removeHandler("studio:" + method);
    ipcMain.handle("studio:" + method, async (event, input: unknown) => {
      if (
        event.sender !== window.webContents ||
        !isTrustedFrame(
          event.senderFrame?.url ?? "",
          expectedUrl,
          event.senderFrame === window.webContents.mainFrame,
        )
      )
        return { ok: false, error: "This window cannot access the studio." };
      try {
        const valid = parseRequest(method, input);
        switch (method) {
          case "saveBrand":
            store.saveBrand(valid as BrandInput);
            break;
          case "createSamplePack":
            workflow.createSamplePack(valid as CreateInput);
            break;
          case "reviseTarget":
            workflow.reviseTarget(valid as ReviseInput);
            break;
          case "approveTarget":
            workflow.approveTarget(valid as ApproveInput);
            break;
          case "detectProvider":
            provider = await detectCodex();
            break;
          case "connectProvider": {
            const found = await findCodex();
            if (!found) throw new Error("Install Codex before connecting.");
            const client = new CodexClient(researchCommand(found.path));
            try {
              await client.start();
              const auth = await client.account();
              provider = {
                installed: true,
                version: found.version,
                connected: auth.authenticated,
                authMode: auth.mode,
                message: auth.authenticated
                  ? auth.mode === "apiKey"
                    ? "Connected with Codex API access. Research uses your configured API billing."
                    : "Connected to your signed-in Codex account. Research uses its allowance."
                  : "Sign in with codex login in your terminal, then reconnect.",
              };
            } finally {
              client.close();
            }
            break;
          }
          case "createResearchPack":
            if (!provider.connected)
              throw new Error("Connect Codex before starting research.");
            jobs.start(valid as CreateInput);
            break;
          case "cancelResearch":
            jobs.cancel((valid as { jobId: string }).jobId);
            break;
          case "openSource": {
            const { packId, sourceIndex } = valid as {
              packId: string;
              sourceIndex: number;
            };
            const source = store.getPack(packId)?.sources[sourceIndex];
            if (!source || !isPublicSource(source.url))
              throw new Error("This source link is unavailable.");
            await shell.openExternal(source.url);
            break;
          }
        }
        return { ok: true, value: state() };
      } catch (error) {
        if (error instanceof ZodError)
          return {
            ok: false,
            error:
              "Check your entries. A required value is missing or invalid.",
          };
        const message = error instanceof Error ? error.message : "";
        const safe =
          /^(Save your brand|This (content pack|destination|pack|asset|request|research|source)|Create and review|Codex|Connect Codex|Install Codex|Sign in|Research)/.test(
            message,
          );
        console.error(
          "Studio operation failed:",
          method,
          error instanceof Error ? error.name : "Unknown",
        );
        return {
          ok: false,
          error: safe
            ? message
            : "The change could not be saved. Check available disk space and try again.",
        };
      }
    });
  }
}
