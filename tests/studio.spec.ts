import { test, expect, _electron as electron, type ElectronApplication } from '@playwright/test'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
const executable = require('electron') as string
const env = { ...process.env }; delete env.ELECTRON_RUN_AS_NODE
async function launch(dir: string) { return electron.launch({ executablePath: process.env.STUDIO_TEST_EXECUTABLE ?? executable, args: process.env.STUDIO_TEST_EXECUTABLE ? [] : ['.'], env: { ...env, CONTENT_STUDIO_DATA_DIR: dir } }) }
test('desktop persists a brand and exact approval through restart', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'studio-desktop-')); let app: ElectronApplication | undefined
  try {
    app = await launch(dir); let page = await app.firstWindow()
    await expect(page.getByRole('heading', { name: 'Your next idea starts here.' })).toBeVisible()
    const invalidResult = await page.evaluate(async () => {
      try { await window.studio!.saveBrand({ name: '', colors: ['#2546E8', '#D6F369', '#F2EFD9'], voice: 'Clear' }); return 'accepted' }
      catch (error) { return (error as Error).message }
    })
    expect(invalidResult).toMatch(/missing or invalid/)
    expect(await page.evaluate(async () => (await window.studio!.getState()).brand)).toBeNull()
    await page.getByRole('button', { name: 'Brand settings' }).click()
    await page.getByLabel('Brand name').fill('Test studio')
    await page.getByRole('button', { name: 'Save brand' }).click()
    await expect(page.getByText('Brand saved.')).toBeVisible()
    await page.getByRole('button', { name: 'Connections', exact: true }).click()
    await page.getByRole('button', { name: 'Check installation' }).click()
    await expect(page.getByText(/Codex is installed|Install the Codex command-line tool to prepare/)).toBeVisible()
    expect(await page.evaluate(async () => (await window.studio!.getState()).provider.connected)).toBe(false)
    await page.getByRole('button', { name: 'Create content' }).click()
    await page.getByLabel('What would you like to explain?').fill('Useful keyboard shortcuts')
    await page.getByRole('button', { name: 'Create sample pack' }).click()
    await expect(page.getByRole('heading', { name: 'Useful keyboard shortcuts' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Approve graphic' })).toBeEnabled()
    await expect(page.getByRole('button', { name: 'Approve video' })).toHaveCount(2)
    await expect(page.getByRole('button', { name: 'Approve video' }).nth(0)).toBeDisabled()
    await expect(page.getByRole('button', { name: 'Approve video' }).nth(1)).toBeDisabled()
    await page.getByLabel('Instagram feed caption').fill('Try these shortcuts today.')
    await page.getByRole('button', { name: 'Save caption' }).click()
    await page.getByRole('button', { name: 'Approve graphic' }).click()
    await expect(page.getByText('Approved for this version')).toBeVisible()
    await page.screenshot({ path: 'work/studio-desktop.png', fullPage: true })
    await app.close(); app = await launch(dir); page = await app.firstWindow()
    await expect(page.getByText('Useful keyboard shortcuts')).toBeVisible()
    await page.getByRole('button', { name: /Useful keyboard shortcuts/ }).click()
    await expect(page.getByText('Approved for this version')).toBeVisible()
    await expect(page.getByLabel('Instagram feed caption')).toHaveValue('Try these shortcuts today.')
    await page.getByLabel('Instagram feed caption').fill('A revised caption.')
    await page.getByRole('button', { name: 'Save caption' }).click()
    await expect(page.getByText('Approved for this version')).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Approve graphic' })).toBeEnabled()
    const permissions = await page.evaluate(() => ({
      require: typeof (globalThis as Record<string, unknown>).require,
      process: typeof (globalThis as Record<string, unknown>).process,
      bridge: Object.keys(window.studio ?? {}).sort()
    }))
    expect(permissions.require).toBe('undefined')
    expect(permissions.process).toBe('undefined')
    expect(permissions.bridge).toEqual(['approveTarget', 'createSamplePack', 'detectProvider', 'getState', 'reviseTarget', 'saveBrand'])
    await page.setViewportSize({ width: 760, height: 900 }); await page.screenshot({ path: 'work/studio-narrow.png', fullPage: true })
  } finally { if (app) await app.close(); rmSync(dir, { recursive: true, force: true }) }
})
