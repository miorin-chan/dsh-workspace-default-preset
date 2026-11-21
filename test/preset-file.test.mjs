import assert from 'node:assert/strict'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { after, test } from 'node:test'

import {
  MAX_PRESET_ID_LENGTH,
  PRESET_RELATIVE_PATH,
  normalizePresetId,
  parsePresetDocument,
  presetDocumentPath,
  readWorkspacePreset,
  writeWorkspacePreset,
} from '../lib/preset-file.js'
import { createWorkspaceAgentPresetService } from '../lib/service.js'

const roots = []
const temporaryRoot = async () => {
  const directory = await mkdtemp(join(tmpdir(), 'dsh-workspace-default-preset-'))
  roots.push(directory)
  return directory
}
after(async () => {
  await Promise.all(roots.map(directory => rm(directory, { recursive: true, force: true })))
})

test('normalizes preset ids without accepting unusable values', () => {
  assert.equal(normalizePresetId('  standard  '), 'standard')
  assert.equal(normalizePresetId('human-tone'), 'human-tone')
  assert.equal(normalizePresetId(''), null)
  assert.equal(normalizePresetId('   '), null)
  assert.equal(normalizePresetId(undefined), null)
  assert.equal(normalizePresetId(42), null)
  assert.equal(normalizePresetId('a\nb'), null)
  assert.equal(normalizePresetId('x'.repeat(MAX_PRESET_ID_LENGTH + 1)), null)
})

test('parses strict documents and ignores malformed ones', () => {
  assert.equal(parsePresetDocument('{"agentPreset":"standard"}'), 'standard')
  assert.equal(parsePresetDocument('{"agentPreset":"  "}'), null)
  assert.equal(parsePresetDocument('{"agentPreset":42}'), null)
  assert.equal(parsePresetDocument('{"other":"standard"}'), null)
  assert.equal(parsePresetDocument('[]'), null)
  assert.equal(parsePresetDocument('null'), null)
  assert.equal(parsePresetDocument('{'), null)
  assert.equal(parsePresetDocument('{"agentPreset":"standard","extra":true}'), 'standard')
})

test('stores the document under the workspace .dsh directory', async () => {
  const workspace = await temporaryRoot()
  assert.equal(presetDocumentPath(workspace), join(workspace, PRESET_RELATIVE_PATH))
  assert.equal(await readWorkspacePreset(workspace), null)

  assert.equal(await writeWorkspacePreset(workspace, 'standard'), 'standard')
  assert.equal(await readWorkspacePreset(workspace), 'standard')
  assert.equal(JSON.parse(await readFile(presetDocumentPath(workspace), 'utf8')).agentPreset, 'standard')

  assert.equal(await writeWorkspacePreset(workspace, 'human-tone'), 'human-tone')
  assert.equal(await readWorkspacePreset(workspace), 'human-tone')

  assert.equal(await writeWorkspacePreset(workspace, null), null)
  assert.equal(await readWorkspacePreset(workspace), null)
  // Clearing an absent document is a no-op, not a failure.
  assert.equal(await writeWorkspacePreset(workspace, null), null)
})

test('a malformed workspace document reads as no workspace default', async () => {
  const workspace = await temporaryRoot()
  await mkdir(join(workspace, '.dsh'), { recursive: true })
  await writeFile(presetDocumentPath(workspace), '{not json', 'utf8')
  assert.equal(await readWorkspacePreset(workspace), null)
})

test('the service resolves workspace ids through the registry', async () => {
  const workspace = await temporaryRoot()
  const ctx = {
    workspaceRegistry: {
      get(id) {
        return id === 'ws-1' ? { id, path: workspace } : undefined
      },
    },
    get(name) {
      return name === 'agentPresets'
        ? { list: async () => [{ id: 'standard' }, { id: 'human-tone' }] }
        : undefined
    },
  }
  const service = createWorkspaceAgentPresetService(ctx)
  assert.equal(service.typertRemote.namespace, 'workspaceAgentPresets')
  assert.equal(service.typertRemote.service, service)

  assert.deepEqual(await service.read('ws-1'), { agentPreset: null })
  assert.deepEqual(await service.write('ws-1', 'human-tone'), { agentPreset: 'human-tone' })
  assert.deepEqual(await service.read('ws-1'), { agentPreset: 'human-tone' })
  assert.deepEqual(await service.write('ws-1', null), { agentPreset: null })

  await assert.rejects(service.read('missing'), /unknown workspace/)
  await assert.rejects(service.write('ws-1', 'ghost'), /unknown agent preset/)
  await assert.rejects(service.write('ws-1', '   '), /agentPreset/)
  await assert.rejects(service.read(''), /workspaceId/)
})
