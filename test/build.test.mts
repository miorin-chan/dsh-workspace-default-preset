import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { cpSync, existsSync, mkdirSync, mkdtempSync, realpathSync, rmSync, symlinkSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { basename, dirname, join } from 'node:path'
import { test } from 'node:test'

const plugin = new URL('../', import.meta.url)

test('build recreates the runtime entries and an absent lib directory', t => {
  const tmp = realpathSync(tmpdir())
  const prefix = 'dsh-preset-build-'
  const checkout = mkdtempSync(join(tmp, prefix))
  assert.equal(dirname(realpathSync(checkout)), tmp)
  assert.ok(basename(checkout).startsWith(prefix))
  t.after(() => rmSync(checkout, { recursive: true }))

  mkdirSync(join(checkout, 'scripts'))
  for (const file of ['package.json', 'tsconfig.json', 'tsconfig.tools.json', 'scripts/build.mts', 'scripts/sync-types.mts', 'src']) {
    cpSync(new URL(file, plugin), join(checkout, file), { recursive: true })
  }
  symlinkSync(realpathSync(new URL('node_modules', plugin)), join(checkout, 'node_modules'), 'junction')
  assert.equal(existsSync(join(checkout, 'lib')), false)
  assert.equal(existsSync(join(checkout, 'scripts/build.mjs')), false)

  const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm'
  const result = spawnSync(npm, ['run', 'build'], { cwd: checkout, encoding: 'utf8', shell: process.platform === 'win32' })
  assert.ifError(result.error)
  assert.equal(result.status, 0, result.stdout + result.stderr)
  for (const file of ['scripts/build.mjs', 'index.js', 'client.js', 'lib/preset-file.js', 'lib/service.js', 'lib/typert.js']) {
    assert.ok(existsSync(join(checkout, file)), `build emits ${file}`)
  }
})
