import { useEffect, useState } from 'react'
import { Plus, Layers3, Palette, Cable, ArrowUpRight, CircleAlert, Folder, CheckCircle2 } from 'lucide-react'
import type { StudioState } from '../shared/models'
import { BrandSetup } from './components/BrandSetup'
import { CreatePack } from './components/CreatePack'
import { ProviderStatus } from './components/ProviderStatus'
import { PackReview } from './components/PackReview'
type Screen = 'create' | 'library' | 'brand' | 'connections' | 'review'
export function App() {
  const [state, setState] = useState<StudioState | null>(null); const [screen, setScreen] = useState<Screen>('create')
  const [selected, setSelected] = useState<string | null>(null); const [busy, setBusy] = useState(false)
  const [error, setError] = useState(''); const [notice, setNotice] = useState('')
  const bridge = window.studio
  useEffect(() => {
    if (!bridge) { setError('Open the desktop app to use local storage and tools.'); return }
    let active = true
    bridge.getState().then(value => { if (active) setState(value) }).catch(error => { if (active) setError(error.message) })
    return () => { active = false }
  }, [bridge])
  async function action(run: () => Promise<StudioState>, message = '') {
    if (busy) return
    setBusy(true); setError(''); setNotice('')
    try { const next = await run(); setState(next); setNotice(message) } catch (error) { setError(error instanceof Error ? error.message : 'The operation failed. Try again.') } finally { setBusy(false) }
  }
  function navigate(next: Screen) { setScreen(next); setNotice(''); setError('') }
  const pack = state?.packs.find(pack => pack.id === selected)
  const tabs = [{ screen: 'create' as const, icon: Plus, label: 'Create content' }, { screen: 'library' as const, icon: Layers3, label: 'Content library' }, { screen: 'brand' as const, icon: Palette, label: 'Brand settings' }, { screen: 'connections' as const, icon: Cable, label: 'Connections' }]
  return <div className="app-shell"><aside className="sidebar"><div className="wordmark"><span>;</span><div>content<br /><strong>studio</strong></div></div><span className="sidebar-subtitle">An idea-to-content workspace</span><nav aria-label="Studio navigation">{tabs.map(({ screen: item, icon: Icon, label }) => <button key={item} aria-current={screen === item || (item === 'library' && screen === 'review') ? 'page' : undefined} onClick={() => navigate(item)} disabled={busy}><Icon size={19} />{label}{item === 'library' && !!state?.packs.length && <span className="nav-count">{state.packs.length}</span>}</button>)}</nav>
    <div className="sidebar-bottom"><div className="local-mode"><span className="status-dot" /><span>Local workspace</span></div><p>Your work lives on<br />this computer.</p><div className="profile"><span>{(state?.brand?.name ?? 'S').slice(0, 1).toUpperCase()}</span><div><strong>{state?.brand?.name ?? 'Your studio'}</strong><small>Desktop preview · 0.1</small></div></div></div></aside>
    <main className="main-area"><header className="topbar"><span>{screen === 'review' ? 'Content library / Review' : tabs.find(tab => tab.screen === screen)?.label}</span><span className="topbar-right"><span className="badge">Early preview</span><span className="topbar-mark">;</span></span></header><div className="page-content">
    {error && <div role="alert" className="alert error"><CircleAlert size={18} />{error}</div>}{notice && <div role="status" className="alert success"><CheckCircle2 size={18} />{notice}</div>}
    {!state || !bridge ? <div className="loading-state">{error ? 'Your saved work has been kept. Restart the desktop app to try again.' : 'Opening your studio…'}</div> : <>
    {screen === 'create' && <CreatePack hasBrand={!!state.brand} busy={busy} openBrand={() => navigate('brand')} onCreate={async input => { await action(async () => { const next = await bridge.createSamplePack(input); setSelected(next.packs.find(pack => pack.requestId === input.requestId)!.id); setScreen('review'); return next }) }} />}
    {screen === 'brand' && <BrandSetup brand={state.brand} busy={busy} onSave={input => action(() => bridge.saveBrand(input), 'Brand saved.')} />}
    {screen === 'connections' && <ProviderStatus provider={state.provider} busy={busy} onCheck={() => action(() => bridge.detectProvider())} />}
    {screen === 'review' && pack && <PackReview pack={pack} busy={busy} onRevise={input => action(() => bridge.reviseTarget(input), 'Caption saved. Review this version before approval.')} onApprove={input => action(() => bridge.approveTarget(input), 'Graphic approved. Nothing has been published.')} />}
    {screen === 'library' && <section><div className="page-intro"><h1>Your stories, in progress.</h1><p>Every pack, every revision. Pick up where you left off.</p></div>{!state.packs.length ? <div className="library-empty"><Folder size={44} /><h2>A little space for your next idea.</h2><p>Create a sample pack to start building your library.</p><button className="primary" onClick={() => navigate('create')}><Plus size={17} />Create content</button></div> : <div className="pack-grid">{state.packs.map(pack => <button className="pack-card" key={pack.id} onClick={() => { setSelected(pack.id); navigate('review') }}>{pack.graphicPreview ? <div className="pack-image"><img src={pack.graphicPreview} alt="" /></div> : <div className="pack-image"><CircleAlert /></div>}<div className="pack-card-copy"><span className="badge">Sample · version {pack.revision}</span><h2>{pack.topic}</h2><p>{pack.assetError ? 'Asset needs attention' : pack.targets.some(t => t.approval) ? 'Graphic approved' : 'Waiting for review'}<ArrowUpRight size={18} /></p></div></button>)}</div>}</section>}
    {screen === 'create' && state.packs.length > 0 && <section className="recent-packs"><div className="panel-title"><h2>Pick up where you left off</h2><button className="text-button" onClick={() => navigate('library')}>View library <ArrowUpRight size={15} /></button></div>{state.packs.slice(0, 3).map(pack => <button className="recent-row" key={pack.id} onClick={() => { setSelected(pack.id); navigate('review') }}><span>{pack.topic}</span><small>Sample · version {pack.revision}</small><ArrowUpRight size={17} /></button>)}</section>}
    </>}
    </div></main></div>
}
