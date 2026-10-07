import { createHash, randomUUID } from 'node:crypto'
import { lstatSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import type { ApproveInput, Asset, ContentPack, CreateInput, ReviseInput } from '../shared/models'
import { parseRequest } from '../shared/contracts'
import type { Store } from './storage'
import { makeGraphic } from './graphic'
export class Workflow {
  constructor(private store: Store, private dir: string) {}
  createSamplePack(input: CreateInput): ContentPack {
    const valid = parseRequest('createSamplePack', input); const prior = this.store.getByRequest(valid.requestId)
    if (prior) { if (prior.topic !== valid.topic) throw new Error('This request was already used for different content. Start a new request.'); return prior }
    const brand = this.store.getBrand(); if (!brand) throw new Error('Save your brand before creating a pack.')
    const id = randomUUID(); const assetId = randomUUID(); const filename = assetId + '.svg'
    mkdirSync(join(this.dir, 'assets'), { recursive: true, mode: 0o700 })
    const bytes = Buffer.from(makeGraphic(valid.topic, brand)); const path = join(this.dir, 'assets', filename)
    writeFileSync(path, bytes, { mode: 0o600, flag: 'wx' })
    const asset: Asset = { id: assetId, filename, hash: createHash('sha256').update(bytes).digest('hex'), mime: 'image/svg+xml', width: 1080, height: 1350 }
    const pack: ContentPack = { id, requestId: valid.requestId, topic: valid.topic, sample: true, revision: 1, createdAt: new Date().toISOString(), brand, sources: [], history: [], targets: ['youtube_short', 'instagram_reel', 'instagram_feed_post'].map(destination => ({ id: randomUUID(), destination: destination as ContentPack['targets'][number]['destination'], caption: `Sample: ${valid.topic}\n\nA content idea from ${brand.name}. Review and replace this sample copy before publishing.`, asset: destination === 'instagram_feed_post' ? asset : null, approval: null })) }
    try { this.store.insertPack(pack, { id: randomUUID(), packId: id, stage: 'ready', error: null }) } catch (error) { unlinkSync(path); throw error }
    return pack
  }
  private editable(input: ApproveInput) {
    const pack = this.store.getPack(input.packId); if (!pack) throw new Error('This content pack was not found.')
    if (pack.revision !== input.expectedRevision) throw new Error('This pack changed. Refresh the review before continuing.')
    const target = pack.targets.find(target => target.id === input.targetId); if (!target) throw new Error('This destination was not found.')
    return { pack, target }
  }
  private bytes(asset: Asset) {
    if (!/^[a-f0-9-]{36}\.svg$/.test(asset.filename)) throw new Error('This asset is not valid.')
    const path = join(this.dir, 'assets', asset.filename)
    try {
      const stat = lstatSync(path); if (!stat.isFile() || stat.isSymbolicLink() || stat.size > 2_000_000) throw new Error('Invalid asset file')
      const bytes = readFileSync(path)
      if (createHash('sha256').update(bytes).digest('hex') !== asset.hash) throw new Error('Hash mismatch')
      return bytes
    } catch { throw new Error('This asset is missing or changed. It needs a new review.') }
  }
  previewAsset(asset: Asset) { return `data:${asset.mime};base64,${this.bytes(asset).toString('base64')}` }
  reviseTarget(input: ReviseInput): ContentPack {
    const valid = parseRequest('reviseTarget', input); const { pack, target } = this.editable(valid)
    if (target.caption === valid.caption) return pack
    pack.history.push({ revision: pack.revision, targets: structuredClone(pack.targets), savedAt: new Date().toISOString() })
    target.caption = valid.caption; target.approval = null; pack.revision++
    this.store.updatePack(pack); return pack
  }
  approveTarget(input: ApproveInput): ContentPack {
    const valid = parseRequest('approveTarget', input); const { pack, target } = this.editable(valid)
    if (!target.asset) throw new Error('Create and review the actual video asset before approving it.')
    this.bytes(target.asset)
    target.approval = { targetId: target.id, revision: pack.revision, assetHash: target.asset.hash, caption: target.caption, destination: target.destination, approvedAt: new Date().toISOString() }
    this.store.updatePack(pack); return pack
  }
  getPackViews() {
    return this.store.getPacks().map(pack => {
      const asset = pack.targets.find(t => t.destination === 'instagram_feed_post')?.asset
      let graphicPreview: string | null = null; let assetError: string | null = null
      try { if (asset) graphicPreview = this.previewAsset(asset) } catch (error) { assetError = (error as Error).message }
      const invalidApprovals = pack.targets.filter(target => {
        if (!target.approval) return false
        if (!target.asset || target.approval.targetId !== target.id || target.approval.assetHash !== target.asset.hash || target.approval.caption !== target.caption || target.approval.destination !== target.destination) return true
        try { this.bytes(target.asset); return false } catch { return true }
      })
      if (invalidApprovals.length) {
        pack.history.push({ revision: pack.revision, targets: structuredClone(pack.targets), savedAt: new Date().toISOString() })
        for (const target of invalidApprovals) target.approval = null
        pack.revision++
        this.store.updatePack(pack)
      }
      return { ...pack, graphicPreview, assetError }
    })
  }
}
