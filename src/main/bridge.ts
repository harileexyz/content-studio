import { ipcMain, type BrowserWindow } from 'electron'
import { ZodError } from 'zod'
import { isTrustedFrame, parseRequest, schemas, type Method } from '../shared/contracts'
import type { Workflow } from './workflow'
import type { Store } from './storage'
import type { StudioState, ProviderStatus, CreateInput, ReviseInput, ApproveInput, BrandInput } from '../shared/models'
import { detectCodex } from './provider'
export function registerBridge(window: BrowserWindow, expectedUrl: string, store: Store, workflow: Workflow) {
  let provider: ProviderStatus = { installed: false, connected: false, version: null, message: 'Check whether Codex is installed.' }
  const state = (): StudioState => ({ brand: store.getBrand(), packs: workflow.getPackViews(), provider })
  for (const method of Object.keys(schemas) as Method[]) {
    ipcMain.removeHandler('studio:' + method)
    ipcMain.handle('studio:' + method, async (event, input: unknown) => {
      if (event.sender !== window.webContents || !isTrustedFrame(event.senderFrame?.url ?? '', expectedUrl, event.senderFrame === window.webContents.mainFrame)) return { ok: false, error: 'This window cannot access the studio.' }
      try {
        const valid = parseRequest(method, input)
        switch (method) {
          case 'saveBrand': store.saveBrand(valid as BrandInput); break
          case 'createSamplePack': workflow.createSamplePack(valid as CreateInput); break
          case 'reviseTarget': workflow.reviseTarget(valid as ReviseInput); break
          case 'approveTarget': workflow.approveTarget(valid as ApproveInput); break
          case 'detectProvider': provider = await detectCodex(); break
        }
        return { ok: true, value: state() }
      } catch (error) {
        if (error instanceof ZodError) return { ok: false, error: 'Check your entries. A required value is missing or invalid.' }
        const message = error instanceof Error ? error.message : ''
        const safe = /^(Save your brand|This (content pack|destination|pack|asset|request)|Create and review)/.test(message)
        console.error('Studio operation failed:', method, error instanceof Error ? error.name : 'Unknown')
        return { ok: false, error: safe ? message : 'The change could not be saved. Check available disk space and try again.' }
      }
    })
  }
}
