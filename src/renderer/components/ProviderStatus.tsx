import { Cable, RefreshCw } from "lucide-react";
import type { ProviderStatus as Status } from "../../shared/models";
export function ProviderStatus({
  provider,
  busy,
  onCheck,
  onConnect,
}: {
  provider: Status;
  busy: boolean;
  onCheck: () => Promise<void>;
  onConnect: () => Promise<void>;
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
        <div className="connection-note">
          <h3>Install the Codex command-line tool</h3>
          <p>
            If Node.js is installed, run this in your terminal, then check the
            installation again:
          </p>
          <pre className="install-command">npm install -g @openai/codex</pre>
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
