import { Cable, Copy, ExternalLink, RefreshCw, Terminal } from "lucide-react";
import type { ProviderStatus as Status } from "../../shared/models";
export function ProviderStatus({
  provider,
  busy,
  onCheck,
  onConnect,
  onCopyCommand,
  onOpenGuide,
  onOpenTerminal,
}: {
  provider: Status;
  busy: boolean;
  onCheck: () => Promise<void>;
  onConnect: () => Promise<void>;
  onCopyCommand: (command: "install" | "signin") => Promise<void>;
  onOpenGuide: () => Promise<void>;
  onOpenTerminal: () => Promise<void>;
}) {
  return (
    <section className="connection-page">
      <div className="page-intro">
        <Cable size={26} />
        <h1>Connect your tools.</h1>
        <p>
          The studio does the organising. Your agent will help with the
          creation.
        </p>
      </div>
      <div className="provider-panel">
        <div className="provider-logo">C</div>
        <div>
          <h2>Codex</h2>
          <span className={"badge " + (provider.installed ? "lime" : "")}>
            {provider.connected
              ? "Connected"
              : provider.installed
                ? "Installed · not connected"
                : "Not detected"}
          </span>
          <p>{provider.message}</p>
          {provider.installed && (
            <button
              className="primary"
              disabled={busy}
              onClick={() => void onConnect()}
              style={{ marginTop: 16 }}
            >
              {provider.connected ? "Refresh connection" : "Connect Codex"}
            </button>
          )}
          {provider.version && <p className="muted">{provider.version}</p>}
        </div>
        <button
          className="secondary"
          disabled={busy}
          onClick={() => void onCheck()}
        >
          <RefreshCw size={16} />
          {busy ? "Checking…" : "Check installation"}
        </button>
      </div>
      {!provider.installed && (
        <div className="setup-guide">
          <h2>Set up Codex</h2>
          <p className="muted">
            This takes a few minutes. The studio never sees your password.
          </p>
          <ol className="setup-steps">
            <li>
              <span>1</span>
              <div>
                <h3>Install Codex</h3>
                <p>
                  Copy the official macOS installer command and run it in
                  Terminal.
                </p>
                <pre className="install-command">
                  curl -fsSL https://chatgpt.com/codex/install.sh | sh
                </pre>
                <div className="setup-actions">
                  <button
                    className="secondary"
                    onClick={() => void onCopyCommand("install")}
                  >
                    <Copy size={15} /> Copy install command
                  </button>
                  <button
                    className="secondary"
                    onClick={() => void onOpenTerminal()}
                  >
                    <Terminal size={15} /> Open Terminal
                  </button>
                  <button
                    className="text-button"
                    onClick={() => void onOpenGuide()}
                  >
                    Open official guide <ExternalLink size={14} />
                  </button>
                </div>
              </div>
            </li>
            <li>
              <span>2</span>
              <div>
                <h3>Sign in</h3>
                <p>
                  Run <code>codex</code>, then choose Sign in with ChatGPT.
                </p>
                <button
                  className="text-button"
                  onClick={() => void onCopyCommand("signin")}
                >
                  <Copy size={14} /> Copy sign-in command
                </button>
              </div>
            </li>
            <li>
              <span>3</span>
              <div>
                <h3>Check the connection</h3>
                <p>Come back here when the installation has finished.</p>
                <button
                  className="primary"
                  disabled={busy}
                  onClick={() => void onCheck()}
                >
                  <RefreshCw size={15} /> I installed it — check again
                </button>
              </div>
            </li>
          </ol>
        </div>
      )}
      {provider.installed && !provider.connected && (
        <div className="connection-note signin-guide">
          <h3>Finish signing in</h3>
          <p>
            Open Terminal, run <code>codex</code>, and choose Sign in with
            ChatGPT. Then use Connect Codex above.
          </p>
          <div className="setup-actions">
            <button
              className="secondary"
              onClick={() => void onCopyCommand("signin")}
            >
              <Copy size={15} /> Copy sign-in command
            </button>
            <button className="secondary" onClick={() => void onOpenTerminal()}>
              <Terminal size={15} /> Open Terminal
            </button>
          </div>
        </div>
      )}
      <div className="connection-note">
        <h3>Your accounts stay yours.</h3>
        <p>
          Installation detection only checks the command-line tool version. The
          connection check uses Codex’s supported account status. Creating a
          research draft sends your topic and brand voice through the connected
          account and uses its allowance or billing.
        </p>
        <p>
          Claude support and social account connections are planned for later
          versions.
        </p>
      </div>
    </section>
  );
}
