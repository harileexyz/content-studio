import { contextBridge, ipcRenderer } from "electron";
import type {
  StudioBridge,
  StudioState,
  BrandInput,
  CreateInput,
  ReviseInput,
  ApproveInput,
} from "../shared/models";
async function call(method: string, input?: unknown): Promise<StudioState> {
  const result = await ipcRenderer.invoke("studio:" + method, input);
  if (!result.ok) throw new Error(result.error);
  return result.value;
}
const bridge: StudioBridge = {
  getState: () => call("getState"),
  saveBrand: (input: BrandInput) => call("saveBrand", input),
  createSamplePack: (input: CreateInput) => call("createSamplePack", input),
  reviseTarget: (input: ReviseInput) => call("reviseTarget", input),
  approveTarget: (input: ApproveInput) => call("approveTarget", input),
  detectProvider: () => call("detectProvider"),
  connectProvider: () => call("connectProvider"),
  createResearchPack: (input) => call("createResearchPack", input),
  cancelResearch: (input) => call("cancelResearch", input),
  openSource: (input) => call("openSource", input).then(() => {}),
};
contextBridge.exposeInMainWorld("studio", bridge);
