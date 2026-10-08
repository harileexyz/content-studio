import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { join, delimiter } from "node:path";
import type { ProviderStatus } from "../shared/models";
const execute = promisify(execFile);
export async function findCodex(
  candidates?: string[],
): Promise<{ path: string; version: string } | null> {
  const paths = candidates ?? [
    ...new Set([
      "/opt/homebrew/bin/codex",
      "/usr/local/bin/codex",
      ...(process.env.PATH ?? "")
        .split(delimiter)
        .filter(Boolean)
        .map((dir) => join(dir, "codex")),
    ]),
  ];
  for (const path of paths) {
    try {
      const { stdout } = await execute(path, ["--version"], {
        timeout: 2000,
        maxBuffer: 4096,
        windowsHide: true,
      });
      const version = stdout.trim();
      if (!/^codex(?:-cli)?\s+[\w.+-]+$/.test(version)) continue;
      return { path, version };
    } catch {
      /* A missing or unresponsive executable is not an authenticated connection. */
    }
  }
  return null;
}

export async function detectCodex(
  candidates?: string[],
): Promise<ProviderStatus> {
  const found = await findCodex(candidates);
  return found
    ? {
        installed: true,
        connected: false,
        version: found.version,
        message: "Codex is installed. Connect to check your sign-in.",
      }
    : {
        installed: false,
        connected: false,
        version: null,
        message:
          "Install the Codex command-line tool to create researched content. Sample packs work without it.",
      };
}
