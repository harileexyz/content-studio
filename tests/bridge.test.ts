import { describe, expect, it } from "vitest";
import { parseRequest, isTrustedFrame } from "../src/shared/contracts";
describe("desktop boundary", () => {
  it("rejects empty topics", () =>
    expect(() =>
      parseRequest("createSamplePack", { topic: " ", requestId: "request-1" }),
    ).toThrow());
  it("rejects destinations supplied in place of a target", () =>
    expect(() =>
      parseRequest("approveTarget", {
        packId: "p",
        targetId: "t",
        expectedRevision: 1,
        destination: "arbitrary-account",
      }),
    ).toThrow());
  it("rejects malformed color input", () =>
    expect(() =>
      parseRequest("saveBrand", {
        name: "Test",
        colors: ["javascript:alert(1)"],
        voice: "Clear",
      }),
    ).toThrow());
  it("accepts only the two fixed Codex setup commands", () => {
    expect(
      parseRequest("copyCodexCommand", { command: "install" }),
    ).toEqual({ command: "install" });
    expect(() =>
      parseRequest("copyCodexCommand", { command: "arbitrary" }),
    ).toThrow();
  });
  it("accepts a trimmed topic and bounded identifier", () =>
    expect(
      parseRequest("createSamplePack", {
        topic: " Learn shortcuts ",
        requestId: "request-1",
      }),
    ).toEqual({ topic: "Learn shortcuts", requestId: "request-1" }));
  it("rejects other frames, remote origins and lookalike local paths", () => {
    expect(
      isTrustedFrame("file:///app/index.html", "file:///app/index.html", true),
    ).toBe(true);
    expect(
      isTrustedFrame(
        "file:///app/index.html?bad=1",
        "file:///app/index.html",
        true,
      ),
    ).toBe(false);
    expect(
      isTrustedFrame("https://evil.test", "file:///app/index.html", true),
    ).toBe(false);
    expect(
      isTrustedFrame("file:///app/index.html", "file:///app/index.html", false),
    ).toBe(false);
  });
});
