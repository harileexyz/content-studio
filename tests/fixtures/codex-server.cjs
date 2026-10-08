const readline = require("node:readline");
let initialized = false;
function send(message) {
  process.stdout.write(JSON.stringify(message) + "\n");
}
readline.createInterface({ input: process.stdin }).on("line", (line) => {
  const m = JSON.parse(line);
  if (m.method === "initialize")
    send({ id: m.id, result: { userAgent: "fixture" } });
  else if (m.method === "initialized") initialized = true;
  else if (m.method === "config/read")
    send({
      id: m.id,
      result: {
        config: { mcp_servers: { personal: { command: "private-command" } } },
      },
    });
  else if (m.method === "model/list")
    send({
      id: m.id,
      result: {
        data: [{ model: "default-model", isDefault: true }],
        nextCursor: null,
      },
    });
  else if (m.method === "account/read")
    send({
      id: m.id,
      result: {
        account: {
          type: "chatgpt",
          email: "private@example.test",
          planType: "plus",
        },
        requiresOpenaiAuth: true,
      },
    });
  else if (m.method === "thread/start") {
    if (
      !initialized ||
      m.params.config.mcp_servers.personal.enabled !== false ||
      m.params.model !== "default-model"
    )
      send({ id: m.id, error: { code: -1, message: "Missing handshake" } });
    else
      send({
        id: m.id,
        result: { thread: { id: "thread-one" }, model: "default-model" },
      });
  } else if (m.method === "turn/start") {
    send({
      id: m.id,
      result: { turn: { id: "turn-one", status: "inProgress" } },
    });
    if (m.params.input[0].text === "HOLD") return;
    if (m.params.input[0].text === "AGENT") {
      send({
        method: "item/started",
        params: {
          threadId: "thread-one",
          item: { type: "collabAgentToolCall" },
        },
      });
      return;
    }
    if (m.params.input[0].text === "UNSUPPORTED") {
      send({
        id: 998,
        method: "account/chatgptAuthTokens/refresh",
        params: {},
      });
      return;
    }
    send({
      id: 999,
      method: "item/commandExecution/requestApproval",
      params: { threadId: "thread-one", turnId: "turn-one" },
    });
  } else if (m.id === 999) {
    if (m.result?.decision !== "decline") process.exit(2);
    send({
      method: "item/completed",
      params: {
        threadId: "thread-one",
        turnId: "turn-one",
        item: {
          type: "webSearch",
          id: "web-one",
          action: {
            type: "openPage",
            url: "https://docs.python.org/3/library/stdtypes.html",
          },
        },
      },
    });
    send({
      method: "item/completed",
      params: {
        threadId: "thread-one",
        turnId: "turn-one",
        item: {
          type: "agentMessage",
          id: "msg-one",
          phase: "final_answer",
          text: '{"answer":"Research complete"}',
        },
      },
    });
    send({
      method: "turn/completed",
      params: {
        threadId: "thread-one",
        turn: { id: "turn-one", status: "completed", items: [], error: null },
      },
    });
  } else if (m.method === "turn/interrupt") {
    send({ id: m.id, result: {} });
    send({
      method: "turn/completed",
      params: {
        threadId: "thread-one",
        turn: { id: "turn-one", status: "interrupted", items: [] },
      },
    });
  } else if (m.method === "exit-test") process.exit(1);
  else if (m.method === "malformed-test") send(null);
  else if (m.method === "oversized-test")
    process.stdout.write("x".repeat(4_100_000));
  else if (m.method === "error-test")
    send({
      id: m.id,
      error: { code: -1, message: "private detail should not reach users" },
    });
});
