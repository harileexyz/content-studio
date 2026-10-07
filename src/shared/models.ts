export type Destination = 'youtube_short' | 'instagram_reel' | 'instagram_feed_post'
export interface Brand { id: string; name: string; colors: [string, string, string]; voice: string }
export type BrandInput = Omit<Brand, 'id'>
export interface Asset { id: string; filename: string; hash: string; mime: 'image/svg+xml'; width: number; height: number }
export interface Approval { targetId: string; revision: number; assetHash: string; caption: string; destination: Destination; approvedAt: string }
export interface Target { id: string; destination: Destination; caption: string; asset: Asset | null; approval: Approval | null }
export interface Revision { revision: number; targets: Target[]; savedAt: string }
export interface ContentPack { id: string; requestId: string; topic: string; sample: true; revision: number; createdAt: string; brand: Brand; targets: Target[]; history: Revision[]; sources: { url: string; claim: string }[] }
export interface Job { id: string; packId: string; stage: 'ready'; error: string | null }
export interface ProviderStatus { installed: boolean; version: string | null; connected: false; message: string }
export interface PackView extends ContentPack { graphicPreview: string | null; assetError: string | null }
export interface StudioState { brand: Brand | null; packs: PackView[]; provider: ProviderStatus }
export interface CreateInput { topic: string; requestId: string }
export interface ApproveInput { packId: string; targetId: string; expectedRevision: number }
export interface ReviseInput extends ApproveInput { caption: string }
export interface StudioBridge {
  getState(): Promise<StudioState>
  saveBrand(input: BrandInput): Promise<StudioState>
  createSamplePack(input: CreateInput): Promise<StudioState>
  reviseTarget(input: ReviseInput): Promise<StudioState>
  approveTarget(input: ApproveInput): Promise<StudioState>
  detectProvider(): Promise<StudioState>
}
