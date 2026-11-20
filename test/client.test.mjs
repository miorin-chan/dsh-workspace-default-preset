import assert from 'node:assert/strict'
import { test } from 'node:test'

/** Capture the module registration the browser module loader would receive. */
let registration
globalThis.window = {
  __ModuleLoader__: {
    load(entry) {
      registration = entry
    },
  },
}
await import('../client.js')

assert.equal(registration.id, 'dsh-workspace-agent-preset')
const plugin = registration.factory()

/** Read `{name}` placeholders the way the shared locale formatter does. */
const translate = (dictionary) => (key, values = {}) =>
  String(dictionary[key] ?? key).replace(/\{(\w+)\}/g, (_, name) => String(values[name] ?? `{${name}}`))

const PRESETS = [
  { id: 'standard', isDefault: true },
  { id: 'human-tone', name: 'Human tone', isDefault: false },
  { id: 'cordis' },
]

/** Copy `ui-agent-preset` publishes for shipped presets, keyed as its namespace. */
const DISPLAY_DICTIONARY = {
  en: {
    presetStandardName: 'Standard mode',
    presetPtcName: 'PTC mode',
    presetMinimalName: 'Minimal mode',
    presetCordisName: 'Creator mode',
  },
}

/**
 * A minimal Client host: recorded effects, a locale service, a mounted Remote
 * namespace, the Session and Workspace services, and a context menu registry.
 */
function fakeContext({ stored = 'human-tone', roster = PRESETS, display = true } = {}) {
  const effects = []
  const namespaces = new Map()
  if (display) namespaces.set('settings.agentPreset', DISPLAY_DICTIONARY)
  const icons = []
  const menus = []
  const notices = []
  const created = []
  const writes = []
  let mounts = 0

  const selected = []
  const sessions = {
    async create(options = {}) {
      created.push({ ...options })
      return 'session-1'
    },
    list: {
      getSnapshot: () => ({
        ids: ['blank-1'],
        byId: { 'blank-1': { blank: true, cwd: '/tmp/ws-1' } },
      }),
    },
    scope: id => (id === 'blank-1' ? {} : undefined),
  }
  sessions.create = sessions.create.bind(sessions)

  const api = {
    async read(workspaceId) {
      reads.push(workspaceId)
      return { ok: true, value: { agentPreset: stored } }
    },
    async write(workspaceId, agentPreset) {
      writes.push({ workspaceId, agentPreset })
      stored = agentPreset
      return { ok: true, value: { agentPreset } }
    },
  }
  const reads = []

  const ctx = {
    effect(install) {
      const dispose = install()
      effects.push(dispose)
      return dispose
    },
    get(key) {
      if (key === 'sessions') return sessions
      if (key === 'workspaces') {
        return { list: { getSnapshot: () => ({ items: [{ workspaceId: 'ws-1', path: '/tmp/ws-1' }] }) } }
      }
      if (key === 'remote.workspaceAgentPresets') return namespaces.get(key)
      return undefined
    },
    locale: {
      register(namespace, labels) {
        namespaces.set(namespace, labels)
        return () => namespaces.delete(namespace)
      },
      bind(namespace) {
        const dictionaries = namespaces.get(namespace)
        return dictionaries === undefined ? translate({}) : translate(dictionaries.en)
      },
    },
    remote: {
      async $mount(contribution) {
        mounts += 1
        assert.equal(contribution.package, 'dsh-workspace-agent-preset')
        namespaces.set('remote.workspaceAgentPresets', api)
        return () => namespaces.delete('remote.workspaceAgentPresets')
      },
      agentPresets: {
        async list() {
          return { ok: true, value: { presets: roster } }
        },
        async select(sessionId, agentPreset) {
          selected.push({ sessionId, agentPreset })
          return { ok: true, value: agentPreset }
        },
      },
    },
    slots: {
      inject(key, callback) {
        assert.equal(key, 'contextMenu.icon')
        return callback()
      },
      register(options) {
        icons.push(options)
        return () => undefined
      },
    },
    contextMenus: {
      register(contribution) {
        menus.push(contribution)
        return () => undefined
      },
      notify(text, success) {
        notices.push({ text, success })
      },
    },
    sessionCreateCount: () => created.length,
    created,
    writes,
    reads,
    selected,
    icons,
    menus,
    notices,
    mounts: () => mounts,
  }
  ctx.effects = effects
  return ctx
}

/** Run `apply` and wait for the asynchronous Remote mount. */
async function mount(context) {
  plugin.apply(context)
  await Promise.resolve()
  await Promise.resolve()
}

const menuContribution = context => context.menus.find(entry => entry.id === 'workspace.agent-preset')
const workspaceTarget = { workspaceId: 'ws-1', path: '/tmp/ws-1', displayTitle: 'ws-1' }

test('declares the services it injects', () => {
  assert.deepEqual(plugin.inject, ['locale', 'contextMenus', 'slots', 'remote', 'remote.agentPresets', 'sessions', 'workspaces'])
})

test('registers eight locales and releases them on unload', async () => {
  const ctx = fakeContext()
  await mount(ctx)
  const labels = ctx.locale.bind('dsh-workspace-agent-preset')
  for (const language of ['en', 'zh', 'ja', 'de', 'es', 'fr', 'pt', 'ru']) {
    assert.ok(labels(`missing-${language}`), 'bind returns a translator')
  }
  for (const dispose of ctx.effects) dispose()
})

test('injects the workspace default into sessions.create when the caller supplies none', async () => {
  const ctx = fakeContext()
  await mount(ctx)
  const sessions = ctx.get('sessions')
  await sessions.create({ workspaceId: 'ws-1' })
  assert.equal(ctx.created[0].agentPreset, 'human-tone')
  await sessions.create({ cwd: '/tmp/ws-1' })
  assert.equal(ctx.created[1].agentPreset, 'human-tone')
  await sessions.create({ workspaceId: 'ws-1', agentPreset: 'standard' })
  assert.equal(ctx.created[2].agentPreset, 'standard')
  await sessions.create({ cwd: '/tmp/other' })
  assert.equal(ctx.created[3].agentPreset, undefined)
  for (const dispose of ctx.effects) dispose()
})

test('falls back once when the stored workspace preset no longer resolves', async () => {
  const ctx = fakeContext({ stored: 'ghost' })
  const sessions = ctx.get('sessions')
  const original = sessions.create
  let attempts = 0
  sessions.create = async (options = {}) => {
    attempts += 1
    if (attempts === 1 && options.agentPreset === 'ghost') {
      const error = new Error('unknown agent preset')
      error.code = 'agent-preset/not-found'
      throw error
    }
    return original(options)
  }
  await mount(ctx)
  assert.equal(await sessions.create({ workspaceId: 'ws-1' }), 'session-1')
  assert.equal(attempts, 2)
  assert.equal(ctx.created.length, 1)
  assert.equal(ctx.created[0].agentPreset, undefined)
  for (const dispose of ctx.effects) dispose()
})

test('workspace menu lists presets and writes the chosen default', async () => {
  const ctx = fakeContext({ stored: null })
  await mount(ctx)
  const contribution = menuContribution(ctx)
  assert.ok(contribution, 'registers a workspace context menu contribution')
  assert.equal(contribution.target, 'workspace')

  const actions = await contribution.resolve(workspaceTarget, new AbortController().signal)
  assert.equal(actions.length, 1)
  const [parent] = actions
  assert.equal(parent.label, 'Default preset: Global default')
  assert.equal(parent.children.length, PRESETS.length + 1)
  assert.equal(parent.children[0].label, 'Use global default (Standard mode)')
  assert.equal(parent.children.find(child => child.id === 'preset:cordis').label, 'Creator mode')
  assert.equal(parent.children[0].disabled, true, 'the global action is disabled while no workspace default is set')
  for (const child of parent.children) {
    assert.deepEqual(child.icon, { key: 'dsh-workspace-agent-preset.preset' })
  }
  assert.deepEqual(ctx.icons, [{ name: 'contextMenu.icon', key: 'dsh-workspace-agent-preset.preset' }])

  const human = parent.children.find(child => child.id === 'preset:human-tone')
  assert.equal(human.label, 'Human tone')
  await human.run()
  assert.deepEqual(ctx.writes, [{ workspaceId: 'ws-1', agentPreset: 'human-tone' }])
  assert.deepEqual(ctx.selected, [{ sessionId: 'blank-1', agentPreset: 'human-tone' }])
  assert.equal(ctx.notices.at(-1).success, true)
  assert.match(ctx.notices.at(-1).text, /Human tone/)

  const refreshed = await contribution.resolve(workspaceTarget, new AbortController().signal)
  assert.equal(refreshed[0].label, 'Default preset: Human tone')
  const current = refreshed[0].children.find(child => child.id === 'preset:human-tone')
  assert.match(current.label, /✓/)
  await refreshed[0].children[0].run()
  assert.deepEqual(ctx.writes.at(-1), { workspaceId: 'ws-1', agentPreset: null })
  assert.deepEqual(ctx.selected.at(-1), { sessionId: 'blank-1', agentPreset: 'standard' })
  const cleared = await contribution.resolve(workspaceTarget, new AbortController().signal)
  assert.equal(cleared[0].label, 'Default preset: Global default')
  for (const dispose of ctx.effects) dispose()
})

test('leaves preset ids when the display dictionary is unavailable', async () => {
  const ctx = fakeContext({ stored: 'cordis', display: false })
  await mount(ctx)
  const actions = await menuContribution(ctx).resolve(workspaceTarget, new AbortController().signal)
  assert.equal(actions[0].label, 'Default preset: cordis')
  assert.equal(actions[0].children.find(child => child.id === 'preset:cordis').label, 'cordis ✓')
  for (const dispose of ctx.effects) dispose()
})

test('unloading restores sessions.create and withdraws the menu', async () => {
  const ctx = fakeContext()
  const sessions = ctx.get('sessions')
  const original = sessions.create
  await mount(ctx)
  assert.notEqual(sessions.create, original)
  for (const dispose of ctx.effects) dispose()
  await Promise.resolve()
  assert.equal(sessions.create, original)
  assert.equal(ctx.mounts(), 1)
  assert.equal(ctx.get('remote.workspaceAgentPresets'), undefined)
})
