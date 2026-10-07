import { afterEach, describe, expect, it } from 'vitest'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { openStore } from '../src/main/storage'
const dirs: string[] = []
function folder() { const path = mkdtempSync(join(tmpdir(), 'studio-')); dirs.push(path); return path }
afterEach(() => { for (const path of dirs.splice(0)) rmSync(path, { recursive: true, force: true }) })
describe('durable local storage', () => {
  it('recovers the saved brand after closing and reopening SQLite', async () => {
    const dir = folder(); const first = await openStore(dir)
    first.saveBrand({ name: 'My studio', colors: ['#2546E8', '#D6F369', '#F2EFD9'], voice: 'Clear and friendly' })
    first.close(); const second = await openStore(dir)
    expect(second.getBrand()?.name).toBe('My studio'); expect(second.getBrand()?.colors[0]).toBe('#2546E8'); second.close()
  })
})
