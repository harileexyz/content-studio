import { Cable, RefreshCw } from 'lucide-react'
import type { ProviderStatus as Status } from '../../shared/models'
export function ProviderStatus({ provider, busy, onCheck }: { provider: Status; busy: boolean; onCheck: () => Promise<void> }) {
  return <section className="connection-page"><div className="page-intro"><Cable size={26} /><h1>Connect your tools.</h1><p>The studio does the organising. Your agent will help with the creation.</p></div>
    <div className="provider-panel"><div className="provider-logo">C</div><div><h2>Codex</h2><span className={'badge ' + (provider.installed ? 'lime' : '')}>{provider.installed ? 'Installed · not connected' : 'Not detected'}</span><p>{provider.message}</p>{provider.version && <p className="muted">{provider.version}</p>}</div><button className="secondary" disabled={busy} onClick={() => void onCheck()}><RefreshCw size={16} />{busy ? 'Checking…' : 'Check installation'}</button></div>
    <div className="connection-note"><h3>Your accounts stay yours.</h3><p>Installation detection only checks the command-line tool version. This build does not read your login, send prompts or use AI credits.</p><p>Claude support and social account connections are planned for later versions.</p></div>
  </section>
}
