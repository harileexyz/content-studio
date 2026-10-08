import type { ResearchDraft } from "./research";
export type Destination =
  "youtube_short" | "instagram_reel" | "instagram_feed_post";
export interface Brand {
  id: string;
  name: string;
  colors: [string, string, string];
  voice: string;
}
export type BrandInput = Omit<Brand, "id">;
export interface Asset {
  id: string;
  filename: string;
  hash: string;
  mime: "image/svg+xml";
  width: number;
  height: number;
}
export interface Approval {
  targetId: string;
  revision: number;
  assetHash: string;
  caption: string;
  destination: Destination;
  approvedAt: string;
}
export interface Target {
  id: string;
  destination: Destination;
  caption: string;
  asset: Asset | null;
  approval: Approval | null;
}
export interface Revision {
  revision: number;
  targets: Target[];
  savedAt: string;
}
export type ResearchActivityKind =
  "status" | "search" | "source" | "writing" | "complete" | "error";
export interface ResearchActivity {
  id: string;
  at: string;
  kind: ResearchActivityKind;
  label: string;
  detail?: string;
  url?: string;
}
export type ResearchActivityInput = Omit<ResearchActivity, "id" | "at">;
export interface ContentPack {
  id: string;
  requestId: string;
  topic: string;
  sample: boolean;
  research?: ResearchDraft;
  model?: string;
  revision: number;
  createdAt: string;
  brand: Brand;
  targets: Target[];
  history: Revision[];
  sources: {
    url: string;
    claim: string;
    title?: string;
    checkedAt?: string;
    openedByCodex?: boolean;
  }[];
}
export interface Job {
  id: string;
  packId: string;
  stage:
    | "ready"
    | "researching"
    | "writing"
    | "failed"
    | "cancelled"
    | "interrupted";
  error: string | null;
  kind?: "research";
  topic?: string;
  requestId?: string;
  createdAt?: string;
  activity?: ResearchActivity[];
}
export interface ProviderStatus {
  installed: boolean;
  version: string | null;
  connected: boolean;
  authMode?: string | null;
  message: string;
}
export interface PackView extends ContentPack {
  graphicPreview: string | null;
  assetError: string | null;
}
export interface StudioState {
  brand: Brand | null;
  packs: PackView[];
  provider: ProviderStatus;
  jobs?: Job[];
}
export interface CreateInput {
  topic: string;
  requestId: string;
}
export interface ApproveInput {
  packId: string;
  targetId: string;
  expectedRevision: number;
}
export interface ReviseInput extends ApproveInput {
  caption: string;
}
export interface StudioBridge {
  getState(): Promise<StudioState>;
  saveBrand(input: BrandInput): Promise<StudioState>;
  createSamplePack(input: CreateInput): Promise<StudioState>;
  reviseTarget(input: ReviseInput): Promise<StudioState>;
  approveTarget(input: ApproveInput): Promise<StudioState>;
  detectProvider(): Promise<StudioState>;
  connectProvider(): Promise<StudioState>;
  createResearchPack(input: CreateInput): Promise<StudioState>;
  cancelResearch(input: { jobId: string }): Promise<StudioState>;
  openSource(input: { packId: string; sourceIndex: number }): Promise<void>;
  openResearchSource(input: {
    jobId: string;
    activityId: string;
  }): Promise<void>;
  copyCodexCommand(input: {
    command: "install" | "signin";
  }): Promise<StudioState>;
  openCodexInstallGuide(): Promise<StudioState>;
  openTerminal(): Promise<StudioState>;
}
