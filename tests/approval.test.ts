import { afterEach, describe, expect, it } from 'vitest'
import { mkdtempSync, rmSync, writeFileSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { openStore } from '../src/main/storage'
import { Workflow } from '../src/main/workflow'
const dirs: string[] = []
afterEach(() => { for (const path of dirs.splice(0)) rmSync(path, { recursive: true, force: true }) })
async function studio() {
  const dir = mkdtempSync(join(tmpdir(), 'studio-')); dirs.push(dir)
  const store = await openStore(dir); store.saveBrand({ name: 'semicolon', colors: ['#2546E8', '#D6F369', '#F2EFD9'], voice: 'Clear and friendly' })
  return { dir, store, workflow: new Workflow(store, dir) }
}
describe('pack creation and exact approvals', () => {
  it('requires a brand before creation', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'studio-')); dirs.push(dir); const store = await openStore(dir)
    expect(() => new Workflow(store, dir).createSamplePack({ topic: 'Shortcuts', requestId: 'one' })).toThrow(/brand/i); store.close()
  })
  it('repeated requests and restart do not duplicate a pack', async () => {
    const { dir, store, workflow } = await studio()
    const pack = workflow.createSamplePack({ topic: 'Shortcuts', requestId: 'one' })
    expect(workflow.createSamplePack({ topic: 'Shortcuts', requestId: 'one' }).id).toBe(pack.id)
    expect(store.getPacks()).toHaveLength(1); store.close()
    const reopened = await openStore(dir)
    expect(new Workflow(reopened, dir).createSamplePack({ topic: 'Shortcuts', requestId: 'one' }).id).toBe(pack.id); reopened.close()
  })
  it('rejects reusing a request identifier for different content', async () => {
    const { store, workflow } = await studio(); workflow.createSamplePack({ topic: 'Shortcuts', requestId: 'one' })
    expect(() => workflow.createSamplePack({ topic: 'Other', requestId: 'one' })).toThrow(/different/i); store.close()
  })
  it('creates three separate targets but only a real graphic can be approved', async () => {
    const { store, workflow } = await studio(); const pack = workflow.createSamplePack({ topic: 'Shortcuts', requestId: 'one' })
    expect(pack.targets.map(t => t.destination)).toEqual(['youtube_short', 'instagram_reel', 'instagram_feed_post'])
    expect(() => workflow.approveTarget({ packId: pack.id, targetId: pack.targets[0].id, expectedRevision: 1 })).toThrow(/asset/i)
    const approved = workflow.approveTarget({ packId: pack.id, targetId: pack.targets[2].id, expectedRevision: 1 })
    expect(approved.targets[2].approval?.caption).toBe(pack.targets[2].caption)
    expect(approved.targets[2].approval?.assetHash).toMatch(/^[a-f0-9]{64}$/); store.close()
  })
  it('invalidates approval when its caption changes and preserves earlier revision', async () => {
    const { store, workflow } = await studio(); const pack = workflow.createSamplePack({ topic: 'Shortcuts', requestId: 'one' })
    workflow.approveTarget({ packId: pack.id, targetId: pack.targets[2].id, expectedRevision: 1 })
    const changed = workflow.reviseTarget({ packId: pack.id, targetId: pack.targets[2].id, caption: 'A changed caption', expectedRevision: 1 })
    expect(changed.revision).toBe(2); expect(changed.targets[2].approval).toBeNull()
    expect(changed.history[0].targets[2].caption).toBe(pack.targets[2].caption)
    expect(() => workflow.approveTarget({ packId: pack.id, targetId: pack.targets[2].id, expectedRevision: 1 })).toThrow(/changed/i); store.close()
  })
  it('preserves another target approval and avoids no-op revisions', async () => {
    const { store, workflow } = await studio(); const pack = workflow.createSamplePack({ topic: 'Shortcuts', requestId: 'one' })
    workflow.approveTarget({ packId: pack.id, targetId: pack.targets[2].id, expectedRevision: 1 })
    const changed = workflow.reviseTarget({ packId: pack.id, targetId: pack.targets[0].id, caption: 'New video caption', expectedRevision: 1 })
    expect(changed.targets[2].approval).not.toBeNull()
    expect(workflow.reviseTarget({ packId: pack.id, targetId: pack.targets[0].id, caption: 'New video caption', expectedRevision: 2 }).revision).toBe(2); store.close()
  })
  it('rejects approval if file bytes have changed and never exposes old preview as current', async () => {
    const { dir, store, workflow } = await studio(); const pack = workflow.createSamplePack({ topic: 'Shortcuts', requestId: 'one' })
    const asset = pack.targets[2].asset!
    writeFileSync(join(dir, 'assets', asset.filename), 'tampered')
    expect(() => workflow.approveTarget({ packId: pack.id, targetId: pack.targets[2].id, expectedRevision: 1 })).toThrow(/changed/i)
    expect(() => workflow.previewAsset(asset)).toThrow(/changed/i); store.close()
  })
  it('escapes topic and brand text in the generated graphic', async () => {
    const { dir, store, workflow } = await studio(); const pack = workflow.createSamplePack({ topic: '<script>alert(1)</script>', requestId: 'one' })
    const graphic = readFileSync(join(dir, 'assets', pack.targets[2].asset!.filename), 'utf8')
    expect(graphic).not.toContain('<script>'); expect(graphic).toContain('&lt;script&gt;'); expect(graphic).toContain('width="1080" height="1350"'); store.close()
  })
})
