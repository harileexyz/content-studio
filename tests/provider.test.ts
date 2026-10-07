import { afterEach, expect, it } from 'vitest'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { detectCodex } from '../src/main/provider'
const dirs: string[] = []
afterEach(() => dirs.splice(0).forEach(dir => rmSync(dir, { recursive: true, force: true })))
it('missing Codex gives an actionable disconnected status', async () => {
  const status = await detectCodex(['/missing/studio-codex']); expect(status.installed).toBe(false); expect(status.connected).toBe(false); expect(status.message).toMatch(/install/i)
})
it('a version command proves installation without claiming authentication', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'studio-cli-')); dirs.push(dir)
  const path = join(dir, 'codex'); writeFileSync(path, '#!/bin/sh\nprintf "codex-cli 1.2.3\\n"\n', { mode: 0o700 })
  const status = await detectCodex([path]); expect(status.installed).toBe(true); expect(status.version).toBe('codex-cli 1.2.3'); expect(status.connected).toBe(false)
})
