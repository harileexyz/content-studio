import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
type ObjectValue = Record<string, any>;
interface Pending {
  resolve: (value: any) => void;
  reject: (error: Error) => void;
  timer: NodeJS.Timeout;
  method: string;
}
export interface CodexCommand {
  executable: string;
  args: string[];
}
export interface GenerationInput {
  cwd: string;
  instructions: string;
  prompt: string;
  schema: unknown;
  session?: { threadId: string; model: string };
  signal: AbortSignal;
  onProgress?: (stage: "researching" | "writing") => void;
}
export interface GenerationResult {
  text: string;
  openedUrls: string[];
  searched: boolean;
  model: string;
  threadId: string;
}
export class CodexClient {
  private child?: ChildProcessWithoutNullStreams;
  private nextId = 1;
  private pending = new Map<number, Pending>();
  private listeners = new Set<(method: string, params: ObjectValue) => void>();
  private failures = new Set<(error: Error) => void>();
  private disabledServers: Record<string, { enabled: false }> = {};
  private defaultModel?: string;
  constructor(private command: CodexCommand) {}
  private send(message: unknown) {
    if (!this.child || this.child.killed)
      throw new Error("Codex stopped. Reconnect and try again.");
    this.child.stdin.write(JSON.stringify(message) + "\n");
  }
  private fail(error: Error) {
    for (const item of this.pending.values()) {
      clearTimeout(item.timer);
      item.reject(error);
    }
    this.pending.clear();
    for (const callback of this.failures) callback(error);
  }
  async start() {
    this.child = spawn(this.command.executable, this.command.args, {
      stdio: "pipe",
      windowsHide: true,
    });
    this.child.stderr.on("data", () => {});
    this.child.stdin.on("error", () =>
      this.fail(new Error("Codex stopped. Reconnect and try again.")),
    );
    this.child.on("error", () =>
      this.fail(new Error("Codex could not start. Check its installation.")),
    );
    this.child.on("exit", () =>
      this.fail(new Error("Codex stopped. Reconnect and try again.")),
    );
    const processLine = (line: string) => {
      if (line.length > 4_000_000) {
        this.fail(
          new Error("Codex returned too much data. Try a smaller topic."),
        );
        this.close();
        return;
      }
      let message: ObjectValue;
      try {
        message = JSON.parse(line);
        if (!message || typeof message !== "object" || Array.isArray(message))
          throw new Error("Invalid envelope");
      } catch {
        this.fail(new Error("Codex returned an invalid response."));
        this.close();
        return;
      }
      try {
        if (message.method && message.id !== undefined) {
          const decisions: Record<string, unknown> = {
            "item/commandExecution/requestApproval": { decision: "decline" },
            "item/fileChange/requestApproval": { decision: "decline" },
            "item/permissions/requestApproval": {
              permissions: {},
              scope: "turn",
            },
            "mcpServer/elicitation/request": { action: "decline" },
            "item/tool/call": { contentItems: [], success: false },
            "item/tool/requestUserInput": { answers: {} },
            execCommandApproval: {
              decision: { denied: { rejection: "Disabled in Content Studio" } },
            },
            applyPatchApproval: {
              decision: { denied: { rejection: "Disabled in Content Studio" } },
            },
          };
          const decision = decisions[message.method];
          this.send(
            decision
              ? { id: message.id, result: decision }
              : {
                  id: message.id,
                  error: {
                    code: -32601,
                    message: "This operation is unavailable in Content Studio.",
                  },
                },
          );
          if (!decision || message.method === "item/tool/requestUserInput") {
            this.fail(
              new Error(
                "Codex requested an unsupported action. Research stopped.",
              ),
            );
            this.close();
          }
        } else if (message.id !== undefined) {
          const item = this.pending.get(message.id);
          if (!item) return;
          clearTimeout(item.timer);
          this.pending.delete(message.id);
          if (message.error) {
            console.error(
              "Codex request rejected:",
              item.method,
              message.error.code,
            );
            item.reject(new Error("Codex could not complete the request."));
          } else item.resolve(message.result);
        } else if (message.method) {
          for (const listener of this.listeners)
            listener(message.method, message.params ?? {});
        }
      } catch {
        this.fail(new Error("Codex returned an invalid response."));
        this.close();
      }
    };
    let buffer = Buffer.alloc(0);
    this.child.stdout.on("data", (chunk: Buffer) => {
      buffer = Buffer.concat([buffer, chunk]);
      let end: number;
      while ((end = buffer.indexOf(10)) !== -1) {
        if (end > 4_000_000) {
          this.fail(
            new Error("Codex returned too much data. Try a smaller topic."),
          );
          buffer = Buffer.alloc(0);
          this.close();
          return;
        }
        const line = buffer.subarray(0, end).toString("utf8");
        buffer = buffer.subarray(end + 1);
        processLine(line);
      }
      if (buffer.length > 4_000_000) {
        this.fail(
          new Error("Codex returned too much data. Try a smaller topic."),
        );
        buffer = Buffer.alloc(0);
        this.close();
      }
    });
    await this.request("initialize", {
      clientInfo: {
        name: "content-studio",
        title: "Content Studio",
        version: "0.2.0",
      },
    });
    this.send({ method: "initialized", params: {} });
    // Read only effective server names; discard all config values, never log or persist them.
    const settings = await this.request("config/read", {
      includeLayers: false,
    });
    this.disabledServers = Object.fromEntries(
      Object.keys(settings?.config?.mcp_servers ?? {}).map((name) => [
        name,
        { enabled: false },
      ]),
    );
    const models = await this.request("model/list", {});
    const recommended = models?.data?.find(
      (model: ObjectValue) => model.isDefault,
    );
    if (typeof recommended?.model === "string")
      this.defaultModel = recommended.model;
  }
  request(method: string, params: unknown): Promise<any> {
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error("Codex did not respond. Reconnect and try again."));
      }, 20000);
      this.pending.set(id, { resolve, reject, timer, method });
      try {
        this.send({ id, method, params });
      } catch (error) {
        clearTimeout(timer);
        this.pending.delete(id);
        reject(error);
      }
    });
  }
  async account(): Promise<{ authenticated: boolean; mode: string | null }> {
    const result = await this.request("account/read", { refreshToken: false });
    return {
      authenticated: result?.account != null,
      mode: result?.account?.type ?? null,
    };
  }
  async generate(input: GenerationInput): Promise<GenerationResult> {
    if (input.signal.aborted) throw new Error("Research cancelled.");
    const response = input.session
      ? { thread: { id: input.session.threadId }, model: input.session.model }
      : await this.request("thread/start", {
          cwd: input.cwd,
          model: this.defaultModel,
          sandbox: "read-only",
          approvalPolicy: "never",
          ephemeral: true,
          developerInstructions: input.instructions,
          config: { web_search: "live", mcp_servers: this.disabledServers },
        });
    const threadId = response?.thread?.id;
    if (typeof threadId !== "string")
      throw new Error("Codex did not create a research session.");
    let turnId: string | undefined;
    let final = "";
    let fallback = "";
    let searched = false;
    const opened = new Set<string>();
    return new Promise<GenerationResult>((resolve, reject) => {
      let done = false;
      const finish = (error?: Error) => {
        if (done) return;
        done = true;
        clearTimeout(timer);
        this.listeners.delete(listener);
        this.failures.delete(fail);
        input.signal.removeEventListener("abort", cancel);
        if (error) reject(error);
        else
          resolve({
            text: final || fallback,
            openedUrls: [...opened],
            searched,
            model: String(response.model ?? "default"),
            threadId,
          });
      };
      const fail = (error: Error) => finish(error);
      const stop = () => {
        if (turnId)
          void this.request("turn/interrupt", { threadId, turnId }).catch(
            () => {},
          );
        setTimeout(() => this.close(), 1000).unref();
      };
      const cancel = () => {
        stop();
        finish(new Error("Research cancelled."));
      };
      const timer = setTimeout(() => {
        stop();
        finish(new Error("Research timed out. Try a more specific topic."));
      }, 300000);
      const listener = (method: string, params: ObjectValue) => {
        if (params.threadId !== threadId) return;

        if (
          method === "item/started" &&
          [
            "commandExecution",
            "fileChange",
            "mcpToolCall",
            "dynamicToolCall",
            "collabAgentToolCall",
            "imageGeneration",
          ].includes(params.item?.type)
        ) {
          stop();
          finish(
            new Error(
              "Codex requested a tool outside web research. Research stopped.",
            ),
          );
          return;
        }
        if (method === "item/completed") {
          const item = params.item;
          if (item?.type === "webSearch") {
            searched = true;
            try {
              input.onProgress?.("researching");
            } catch {
              stop();
              finish(new Error("Research progress could not be saved."));
              return;
            }
            if (
              item.action?.type === "openPage" &&
              typeof item.action.url === "string"
            )
              opened.add(item.action.url);
          }
          if (item?.type === "agentMessage" && typeof item.text === "string") {
            fallback = item.text;
            if (item.phase === "final_answer") final = item.text;
            try {
              input.onProgress?.("writing");
            } catch {
              stop();
              finish(new Error("Research progress could not be saved."));
              return;
            }
          }
        }
        if (method === "turn/completed") {
          if (params.turn?.status === "completed") finish();
          else {
            console.error(
              "Codex turn failed:",
              JSON.stringify(params.turn?.error?.codexErrorInfo ?? null),
            );
            finish(
              new Error(
                params.turn?.status === "interrupted"
                  ? "Research cancelled."
                  : "Codex research failed. Check your account allowance and try again.",
              ),
            );
          }
        }
      };
      this.listeners.add(listener);
      this.failures.add(fail);
      input.signal.addEventListener("abort", cancel, { once: true });
      if (input.signal.aborted) {
        cancel();
        return;
      }
      void this.request("turn/start", {
        threadId,
        input: [{ type: "text", text: input.prompt }],
        outputSchema: input.schema,
        sandboxPolicy: { type: "readOnly" },
        approvalPolicy: "never",
      })
        .then((result) => {
          turnId = result?.turn?.id;
          if (done && input.signal.aborted) stop();
        })
        .catch(fail);
    });
  }
  close() {
    const child = this.child;
    if (child && !child.killed) child.kill();
    this.fail(new Error("Codex stopped. Reconnect and try again."));
  }
}
export function researchCommand(executable: string): CodexCommand {
  return {
    executable,
    args: [
      "app-server",
      "-c",
      'web_search="live"',
      "-c",
      "features.shell_tool=false",
      "-c",
      "agents.enabled=false",
      "-c",
      "features.multi_agent_v2=false",
      "-c",
      "features.multi_agent=false",
      "-c",
      "features.apps=false",
      "-c",
      "features.plugins=false",
      "-c",
      "features.hooks=false",
      "-c",
      "features.code_mode=false",
      "-c",
      "features.code_mode_host=true",
      "-c",
      "features.code_mode_only=false",
      "-c",
      "tools.web_search=true",
      "-c",
      "features.view_image=false",
      "-c",
      "features.image_generation=false",
      "-c",
      "features.skill_search=false",
      "-c",
      "features.skip_host_skill_discovery=true",
      "-c",
      "features.skill_mcp_dependency_install=false",
      "-c",
      "project_doc_max_bytes=0",
      "-c",
      'shell_environment_policy.inherit="none"',
    ],
  };
}
