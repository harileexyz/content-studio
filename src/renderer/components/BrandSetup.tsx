import { useState } from 'react'
import { Palette, Check } from 'lucide-react'
import type { Brand, BrandInput } from '../../shared/models'
export function BrandSetup({ brand, busy, onSave }: { brand: Brand | null; busy: boolean; onSave: (brand: BrandInput) => Promise<void> }) {
  const [name, setName] = useState(brand?.name ?? 'My studio')
  const [colors, setColors] = useState<[string, string, string]>(brand?.colors ?? ['#4364F7', '#D6F369', '#F2EFD9'])
  const [voice, setVoice] = useState(brand?.voice ?? 'Clear, friendly and practical')
  return <section className="brand-page">
    <div className="page-intro"><Palette size={26} /><h1>Make it yours.</h1><p>A familiar look, a consistent voice. Set the starting point for every pack.</p></div>
    <div className="brand-layout"><form className="brand-form" onSubmit={event => { event.preventDefault(); void onSave({ name, colors, voice }) }}>
      <label>Brand name<input required maxLength={50} value={name} onChange={e => setName(e.target.value)} /></label>
      <fieldset><legend>Your colours</legend><div className="color-inputs">{colors.map((color, i) => <label key={i}><input type="color" aria-label={['Primary colour', 'Accent colour', 'Paper colour'][i]} value={color} onChange={e => setColors(previous => previous.map((c, j) => j === i ? e.target.value : c) as [string, string, string])} /><span>{['Primary', 'Accent', 'Paper'][i]}</span></label>)}</div></fieldset>
      <label>Writing voice<textarea required maxLength={200} rows={3} value={voice} onChange={e => setVoice(e.target.value)} /></label>
      <p className="muted">Your settings stay on this computer. Each pack keeps the brand settings it was created with.</p>
      <button className="primary" disabled={busy} type="submit"><Check size={17} />{busy ? 'Saving…' : 'Save brand'}</button>
    </form><div className="brand-preview" style={{ background: colors[0] }}><span className="preview-label">Brand preview</span><span className="brand-glyph" style={{ background: colors[1] }}>;</span><h2>{name || 'Your studio'}</h2><p>Good ideas deserve<br />a clear explanation.</p><div className="preview-paper" style={{ background: colors[2] }}><span>One topic.</span><span>One useful takeaway.</span></div></div></div>
  </section>
}
