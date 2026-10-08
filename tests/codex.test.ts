import { expect, it } from "vitest";
import { resolve } from "node:path";
import { CodexClient } from "../src/main/codex/client";
const command = {
  executable: process.execPath,
  args: [resolve("tests/fixtures/codex-server.cjs")],
};
it("handshakes, denies command approval and collects final output and opened sources", async () => {
  const client = new CodexClient(command);
  try {
    await client.start();
    const auth = await client.account();
    expect(auth).toEqual({ authenticated: true, mode: "chatgpt" });
    const activity: Array<{ kind: string; label: string; detail?: string }> =
      [];
    const result = await client.generate({
      cwd: process.cwd(),
      instructions: "Research only",
      prompt: "Test",
      schema: { type: "object" },
      signal: new AbortController().signal,
      onActivity: (event: any) => activity.push(event),
    });
    expect(result.text).toBe('{"answer":"Research complete"}');
    expect(result.openedUrls).toEqual([
      "https://docs.python.org/3/library/stdtypes.html",
    ]);
    expect(result.model).toBe("default-model");
    expect(activity).toEqual([
      {
        kind: "search",
        label: "Searching the web",
      },
      {
        kind: "source",
        label: "Opened a source",
        detail: "docs.python.org",
        url: "https://docs.python.org/3/library/stdtypes.html",
      },
      { kind: "writing", label: "Writing the draft" },
    ]);
  } finally {
    client.close();
  }
});
it("does not expose search text or unsafe source URLs in activity", async () => {
  const client = new CodexClient(command);
  const activity: Array<{ kind: string; label: string; detail?: string; url?: string }> = [];
  try {
    await client.start();
    await client.generate({
      cwd: process.cwd(),
      instructions: "Research only",
      prompt: "PRIVATE_ACTIVITY",
      schema: { type: "object" },
      signal: new AbortController().signal,
      onActivity: (event: any) => activity.push(event),
    });
    expect(activity).toEqual([
      { kind: "search", label: "Searching the web" },
      {
        kind: "source",
        label: "Opened a source",
        detail: "docs.python.org",
        url: "https://docs.python.org/private",
      },
      { kind: "writing", label: "Writing the draft" },
    ]);
    expect(JSON.stringify(activity)).not.toMatch(
      /Users|secret|access_token|account|internal\.example/,
    );
  } finally {
    client.close();
  }
});
it("fails cancelled work without waiting for a process timeout", async () => {
  const client = new CodexClient(command);
  const controller = new AbortController();
  controller.abort();
  try {
    await client.start();
    await expect(
      client.generate({
        cwd: process.cwd(),
        instructions: "",
        prompt: "",
        schema: {},
        signal: controller.signal,
      }),
    ).rejects.toThrow(/cancel/i);
  } finally {
    client.close();
  }
});
it("never exposes remote error details and rejects pending calls on process exit", async () => {
  const client = new CodexClient(command);
  try {
    await client.start();
    await expect(client.request("error-test", {})).rejects.toThrow(
      "Codex could not complete the request.",
    );
    await expect(client.request("exit-test", {})).rejects.toThrow(/stopped/i);
  } finally {
    client.close();
  }
});

it("interrupts an in-progress turn when cancelled", async () => {
  const client = new CodexClient(command);
  const controller = new AbortController();
  try {
    await client.start();
    const pending = client.generate({
      cwd: process.cwd(),
      instructions: "",
      prompt: "HOLD",
      schema: {},
      signal: controller.signal,
    });
    setTimeout(() => controller.abort(), 40);
    await expect(pending).rejects.toThrow(/cancel/i);
  } finally {
    client.close();
  }
});
it("fails closed on an unsupported credential-refresh request", async () => {
  const client = new CodexClient(command);
  try {
    await client.start();
    await expect(
      client.generate({
        cwd: process.cwd(),
        instructions: "",
        prompt: "UNSUPPORTED",
        schema: {},
        signal: new AbortController().signal,
      }),
    ).rejects.toThrow(/unsupported/i);
  } finally {
    client.close();
  }
});

for (const method of ["malformed-test", "oversized-test"])
  it(`fails safely on ${method} provider output`, async () => {
    const client = new CodexClient(command);
    try {
      await client.start();
      await expect(client.request(method, {})).rejects.toThrow(
        /invalid response|too much data/,
      );
    } finally {
      client.close();
    }
  });

it("stops when Codex attempts to invoke another agent", async () => {
  const client = new CodexClient(command);
  try {
    await client.start();
    await expect(
      client.generate({
        cwd: process.cwd(),
        instructions: "",
        prompt: "AGENT",
        schema: {},
        signal: new AbortController().signal,
      }),
    ).rejects.toThrow(/outside web research/);
  } finally {
    client.close();
  }
});
it("continues source verification in the same research session", async () => {
  const client = new CodexClient(command);
  try {
    await client.start();
    const input = {
      cwd: process.cwd(),
      instructions: "",
      prompt: "Test",
      schema: {},
      signal: new AbortController().signal,
    };
    const first = await client.generate(input);
    const next = await client.generate({
      ...input,
      session: { threadId: first.threadId, model: first.model },
    });
    expect(next.threadId).toBe(first.threadId);
    expect(next.searched).toBe(true);
  } finally {
    client.close();
  }
});
