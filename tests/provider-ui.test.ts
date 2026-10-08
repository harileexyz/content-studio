import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { ProviderStatus } from "../src/renderer/components/ProviderStatus";

it("guides a new user through installing and signing in to Codex", () => {
  const html = renderToStaticMarkup(
    React.createElement(ProviderStatus, {
      provider: {
        installed: false,
        connected: false,
        version: null,
        message: "Not installed",
      },
      busy: false,
      onCheck: async () => {},
      onConnect: async () => {},
      onCopyCommand: async () => {},
      onOpenGuide: async () => {},
      onOpenTerminal: async () => {},
    }),
  );
  expect(html).toContain("Copy install command");
  expect(html).toContain("Open Terminal");
  expect(html).toContain("Open official guide");
  expect(html).toContain("I installed it — check again");
});

it("explains how to finish sign-in after Codex is installed", () => {
  const html = renderToStaticMarkup(
    React.createElement(ProviderStatus, {
      provider: {
        installed: true,
        connected: false,
        version: "codex-cli 1.2.3",
        message: "Sign in",
      },
      busy: false,
      onCheck: async () => {},
      onConnect: async () => {},
      onCopyCommand: async () => {},
      onOpenGuide: async () => {},
      onOpenTerminal: async () => {},
    }),
  );
  expect(html).toContain("Finish signing in");
  expect(html).toContain("Sign in with ChatGPT");
  expect(html).toContain("Copy sign-in command");
});
