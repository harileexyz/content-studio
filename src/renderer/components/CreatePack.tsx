import { useRef, useState } from 'react'
import { ArrowUpRight, Film, Image, Link2, Sparkles } from 'lucide-react'
import type { CreateInput } from '../../shared/models'
const suggestions = ['Explain a useful coding shortcut', 'Make sense of AI costs', 'Introduce a helpful app']
export function CreatePack({ hasBrand, busy, onCreate, openBrand }: { hasBrand: boolean; busy: boolean; onCreate: (input: CreateInput) => Promise<void>; openBrand: () => void }) {
  const [topic, setTopic] = useState(''); const request = useRef<{ topic: string; id: string } | null>(null)
  async function submit() {
    const trimmed = topic.trim(); if (!trimmed || busy) return
    if (!request.current || request.current.topic !== trimmed) request.current = { topic: trimmed, id: crypto.randomUUID() }
    await onCreate({ topic: trimmed, requestId: request.current.id })
  }
  return <section className="create-page">
    <div className="page-intro"><span className="studio-note"><span className="status-dot" /> Your local creative workspace</span><h1>Your next idea<br />starts here.</h1><p>Give it a topic. Shape the story. Make something worth sharing.</p></div>
    <div className="create-layout"><div><form className="topic-form" onSubmit={e => { e.preventDefault(); void submit() }}>
      <label htmlFor="topic">What would you like to explain?</label><textarea id="topic" required maxLength={120} rows={4} placeholder="A useful app, a coding tip, or a big idea made simple…" value={topic} onChange={e => setTopic(e.target.value)} />
      <div className="topic-footer"><span>{topic.length}/120</span><button className="primary" disabled={busy || !hasBrand || !topic.trim()}><Sparkles size={17} />{busy ? 'Creating…' : 'Create sample pack'}</button></div>
    </form>
    {!hasBrand && <div className="setup-callout"><p>Set your brand before creating your first pack.</p><button className="text-button" onClick={openBrand}>Set up my brand <ArrowUpRight size={16} /></button></div>}
    <div className="suggestions"><span>Start with an idea</span>{suggestions.map(suggestion => <button key={suggestion} onClick={() => setTopic(suggestion)}>{suggestion}<ArrowUpRight size={15} /></button>)}</div>
    <div className="sample-note"><strong>This version creates sample graphics.</strong><p>Try the creation and review flow. Live research, narration, video generation and publishing are coming next.</p></div>
    </div><div className="idea-art" aria-label="An original illustration of an idea becoming a story"><span className="art-label">From a thought to a story</span><div className="art-headline">Small ideas.<br />Clear stories.</div><div className="idea-diagram"><div className="idea-node"><span>?</span><small>The idea</small></div><div className="diagram-line"/><div className="story-stack"><div/><div/><div><i/><i/><i/></div></div></div><span className="art-bottom">Made to explain, not just fill a feed.</span></div></div>
    <div className="output-strip"><div><Film /><span><strong>A short video</strong><small>Video creation comes next</small></span></div><div><Image /><span><strong>A matching graphic</strong><small>A real, locally made sample</small></span></div><div><Link2 /><span><strong>Sources and captions</strong><small>Evidence stays beside the work</small></span></div></div>
  </section>
}
