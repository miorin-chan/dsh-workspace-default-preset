/**
 * Browser half of `dsh-workspace-agent-preset`.
 *
 * DSH exposes one Agent-preset default for the whole installation: the
 * registry resolves an omitted `agentPreset` to `selectedDefault`, then to the
 * deployment default. A Workspace therefore has no default of its own. This
 * module adds that layer without touching the Host resolution order:
 *
 * - Every new Session passes through one Client method, `sessions.create`.
 *   It is the choke point used by `uiWorkspace.startSession`,
 *   `openWorkspace`, `connectWorkspace` and the Workspace picker. Wrapping it
 *   injects the Workspace preset only when the caller supplied none, so an
 *   explicit choice (the creator flow, a restored blank Session, another
 *   plugin) keeps precedence.
 * - The Workspace context menu gains a `默认预设` submenu. The value is stored
 *   by the Host half in `<workspace>/.dsh/agent-preset.json` through a
 *   hand-written Remote namespace mounted below (`remote.workspaceAgentPresets`).
 *
 * The submenu speaks the product's own preset vocabulary: shipped presets
 * resolve their names through the `settings.agentPreset` dictionary that
 * ui-agent-preset registers (the shipped-id keys `presetDisplayText` uses),
 * custom presets keep the name they published, and every row carries the preset glyph
 * from `@deepseek-ai/dsh-client-ui-primitives` through the shared
 * `contextMenu.icon` slot. Both are optional: an unavailable module leaves the
 * menu working with the roster name/id and no glyph.
 *
 * Fail-safety: a missing namespace, unreadable file, or stale preset id
 * degrades to the global default. A rejected explicit preset is retried once
 * without it. None of these paths throws into the Session-opening UI.
 *
 * Seam: `sessions.create` is a public `ISessions` method on a plain object
 * service. The context menu target `workspace` is declared by ui-workspace
 * and resolved against `{ workspaceId, path, displayTitle }`; the menu action
 * shape is the documented `MenuContribution`. Only the shared Client modules
 * `react` and `@deepseek-ai/dsh-client-ui-primitives` are required; both are
 * optional at runtime.
 */
window.__ModuleLoader__.load({
  id: 'dsh-workspace-agent-preset',
  factory(require) {
    const NS = 'dsh-workspace-agent-preset'
    const PACKAGE = 'dsh-workspace-agent-preset'
    const NAMESPACE = 'workspaceAgentPresets'
    const REMOTE_KEY = 'remote.' + NAMESPACE
    const MENU_ORDER = 250
    const ICON_KEY = NS + '.preset'
    const DISPLAY_NAMESPACE = 'settings.agentPreset'
    const PRESET_ERROR_CODES = new Set(['agent-preset/not-found', 'agent-preset/invalid'])

    let React
    let primitives
    try { React = require('react') } catch { React = undefined }
    try { primitives = require('@deepseek-ai/dsh-client-ui-primitives') } catch { primitives = undefined }
    const PresetGlyph = React !== undefined
      && typeof primitives?.IconAgentPresetOutlineRegular === 'function'
      ? () => React.createElement(primitives.IconAgentPresetOutlineRegular, { size: 16 })
      : () => null

    /** Visible text this module renders itself; plugin-meta text lives in locale/*.json. */
    const LABELS = {
      en: {
        menuTitle: 'Default: {current}',
        menuGlobal: 'Use global default ({preset})',
        menuGlobalPlain: 'Global default',
        menuUnavailable: 'No agent presets are available',
        noticeSaved: 'New sessions in this workspace use {preset}',
        noticeGlobal: 'Workspace default cleared; new sessions use the global default',
        noticeFailed: 'Could not save the workspace default',
        failure: 'Reopen the workspace menu to try again',
      },
      zh: {
        menuTitle: '默认：{current}',
        menuGlobal: '使用全局默认（{preset}）',
        menuGlobalPlain: '全局默认',
        menuUnavailable: '当前没有可用的 Agent 预设',
        noticeSaved: '该工作区的新会话将使用「{preset}」',
        noticeGlobal: '已清除工作区默认；新会话使用全局默认',
        noticeFailed: '无法保存工作区默认值',
        failure: '请从工作区菜单重试',
      },
      ja: {
        menuTitle: '既定: {current}',
        menuGlobal: 'グローバル既定値を使用 ({preset})',
        menuGlobalPlain: 'グローバル既定値',
        menuUnavailable: '利用できる Agent プリセットがありません',
        noticeSaved: 'このワークスペースの新規セッションは {preset} を使用します',
        noticeGlobal: 'ワークスペース既定値を解除しました。新規セッションはグローバル既定値を使用します',
        noticeFailed: 'ワークスペース既定値を保存できませんでした',
        failure: 'ワークスペースメニューから再試行してください',
      },
      de: {
        menuTitle: 'Standard: {current}',
        menuGlobal: 'Globalen Standard verwenden ({preset})',
        menuGlobalPlain: 'Globaler Standard',
        menuUnavailable: 'Keine Agent-Presets verfügbar',
        noticeSaved: 'Neue Sitzungen in diesem Arbeitsbereich verwenden {preset}',
        noticeGlobal: 'Arbeitsbereichsstandard entfernt; neue Sitzungen verwenden den globalen Standard',
        noticeFailed: 'Der Arbeitsbereichsstandard konnte nicht gespeichert werden',
        failure: 'Öffnen Sie das Arbeitsbereichsmenü erneut',
      },
      es: {
        menuTitle: 'Predeterminado: {current}',
        menuGlobal: 'Usar el predeterminado global ({preset})',
        menuGlobalPlain: 'Predeterminado global',
        menuUnavailable: 'No hay presets de agente disponibles',
        noticeSaved: 'Las sesiones nuevas de este espacio de trabajo usan {preset}',
        noticeGlobal: 'Predeterminado del espacio de trabajo borrado; las sesiones nuevas usan el global',
        noticeFailed: 'No se pudo guardar el predeterminado del espacio de trabajo',
        failure: 'Vuelve a abrir el menú del espacio de trabajo',
      },
      fr: {
        menuTitle: 'Par défaut : {current}',
        menuGlobal: 'Utiliser la valeur globale ({preset})',
        menuGlobalPlain: 'Valeur globale',
        menuUnavailable: 'Aucun preset d’agent disponible',
        noticeSaved: 'Les nouvelles sessions de cet espace de travail utilisent {preset}',
        noticeGlobal: 'Valeur par défaut de l’espace de travail effacée ; les nouvelles sessions utilisent la valeur globale',
        noticeFailed: 'Impossible d’enregistrer la valeur par défaut de l’espace de travail',
        failure: 'Rouvrez le menu de l’espace de travail',
      },
      pt: {
        menuTitle: 'Padrão: {current}',
        menuGlobal: 'Usar o padrão global ({preset})',
        menuGlobalPlain: 'Padrão global',
        menuUnavailable: 'Nenhum preset de agente disponível',
        noticeSaved: 'Novas sessões neste espaço de trabalho usam {preset}',
        noticeGlobal: 'Padrão do espaço de trabalho removido; novas sessões usam o global',
        noticeFailed: 'Não foi possível salvar o padrão do espaço de trabalho',
        failure: 'Abra novamente o menu do espaço de trabalho',
      },
      ru: {
        menuTitle: 'По умолчанию: {current}',
        menuGlobal: 'Использовать глобальный ({preset})',
        menuGlobalPlain: 'Глобальный по умолчанию',
        menuUnavailable: 'Нет доступных пресетов агента',
        noticeSaved: 'Новые сеансы в этом рабочем пространстве используют {preset}',
        noticeGlobal: 'Значение рабочего пространства сброшено; новые сеансы используют глобальное',
        noticeFailed: 'Не удалось сохранить значение рабочего пространства',
        failure: 'Откройте меню рабочего пространства ещё раз',
      },
    }

    /** @param {unknown} value - candidate wire value. */
    const parseWorkspaceId = (value) => {
      if (typeof value !== 'string' || value.length === 0) {
        throw new TypeError('workspaceId must be a non-empty string')
      }
      return value
    }

    /** @param {unknown} value - candidate wire value. */
    const parsePresetOrNull = (value) => {
      if (value === null) return null
      if (typeof value !== 'string' || value.trim().length === 0 || value.length > 200) {
        throw new TypeError('agentPreset must be a non-empty preset id or null')
      }
      return value
    }

    /** @param {unknown} value - candidate result. */
    const parseResult = (value) => {
      if (value === null || typeof value !== 'object' || Array.isArray(value)) {
        throw new TypeError('agent preset result must be an object')
      }
      const agentPreset = value.agentPreset
      if (agentPreset !== null && typeof agentPreset !== 'string') {
        throw new TypeError('agentPreset must be a string or null')
      }
      return { agentPreset }
    }

    const strictCodec = (name, parse) => ({
      mode: 'strict',
      typeSymbol: PACKAGE + '#' + name,
      schema: { parse },
      create: () => ({ parse }),
    })
    const jsonParameter = (name, parse) => ({
      name,
      wire: name,
      source: 'json',
      codec: strictCodec(name, parse),
    })
    const resultCodec = strictCodec('WorkspaceAgentPreset', parseResult)

    /** Host-for-Client contribution mounted in `apply`; mirrors the package's `./typert`. */
    const CONTRIBUTION = {
      package: PACKAGE,
      descriptors: [
        {
          id: PACKAGE + '#' + NAMESPACE + '/read',
          service: NAMESPACE,
          namespace: NAMESPACE,
          method: 'read',
          invocation: { kind: 'direct' },
          parameters: [jsonParameter('workspaceId', parseWorkspaceId)],
          result: resultCodec,
        },
        {
          id: PACKAGE + '#' + NAMESPACE + '/write',
          service: NAMESPACE,
          namespace: NAMESPACE,
          method: 'write',
          invocation: { kind: 'direct' },
          parameters: [
            jsonParameter('workspaceId', parseWorkspaceId),
            jsonParameter('agentPreset', parsePresetOrNull),
          ],
          result: resultCodec,
        },
      ],
    }

    /**
     * Read the rejection code from a `sessions.create` failure.
     * `SessionCreateError` exposes the Host `rpcError`; other failures carry no
     * preset meaning and must propagate.
     * @param {unknown} error - thrown value.
     * @returns {string | undefined} the Remote code, when present.
     */
    const presetErrorCode = (error) => {
      if (error === null || typeof error !== 'object') return undefined
      const direct = error.code
      if (typeof direct === 'string') return direct
      const rpc = error.rpcError
      return rpc !== null && typeof rpc === 'object' && typeof rpc.code === 'string' ? rpc.code : undefined
    }

    return {
      inject: ['locale', 'contextMenus', 'slots', 'remote', 'remote.agentPresets', 'sessions', 'workspaces'],
      apply(ctx) {
        ctx.effect(() => ctx.locale.register(NS, LABELS), `${NS}: locale`)
        const t = ctx.locale.bind(NS)
        /** Display copy owned by ui-agent-preset; absent when that plugin is off. */
        const displayT = (() => {
          try { return ctx.locale.bind(DISPLAY_NAMESPACE) } catch { return undefined }
        })()
        ctx.effect(() => ctx.slots.inject('contextMenu.icon', () => ctx.slots.register({
          name: 'contextMenu.icon',
          key: ICON_KEY,
        }, PresetGlyph)), `${NS}: preset icon`)
        const warned = new Set()
        const warnOnce = (topic, detail) => {
          if (warned.has(topic)) return
          warned.add(topic)
          console.warn(`[${NS}] ${topic}:`, detail)
        }

        let api
        let mountFailure
        const mounting = ctx.remote.$mount(CONTRIBUTION).then(
          (dispose) => {
            api = ctx.get(REMOTE_KEY)
            if (api === undefined) warnOnce('namespace', 'mount finished without ' + REMOTE_KEY)
            return dispose
          },
          (error) => {
            mountFailure = error
            warnOnce('mount', error)
            return undefined
          },
        )
        ctx.effect(() => () => {
          mounting.then(dispose => dispose?.()).catch(() => undefined)
        }, `${NS}: remote contribution`)

        /** @returns {Promise<object | undefined>} the mounted namespace service. */
        const namespace = async () => {
          await mounting
          return api
        }

        const defaults = new Map()
        const presetOf = (workspaceId, { fresh = false } = {}) => {
          if (!fresh && defaults.has(workspaceId)) return Promise.resolve(defaults.get(workspaceId))
          return (async () => {
            const service = await namespace()
            if (service === undefined) return null
            try {
              const result = await service.read(workspaceId)
              if (!result.ok) {
                warnOnce('read', result.error)
                return defaults.get(workspaceId) ?? null
              }
              const value = result.value.agentPreset
              defaults.set(workspaceId, value)
              return value
            } catch (error) {
              warnOnce('read', error)
              return defaults.get(workspaceId) ?? null
            }
          })()
        }

        const workspaceIdOfPath = (cwd) => {
          if (typeof cwd !== 'string') return undefined
          const items = ctx.get('workspaces')?.list.getSnapshot().items ?? []
          return items.find(item => item.path === cwd)?.workspaceId
        }

        const sessions = ctx.get('sessions')
        const originalCreate = sessions.create
        const patchedCreate = async (options = {}) => {
          if (options.agentPreset !== undefined) return originalCreate.call(sessions, options)
          const workspaceId = options.workspaceId ?? workspaceIdOfPath(options.cwd)
          if (workspaceId === undefined) return originalCreate.call(sessions, options)
          const preset = await presetOf(workspaceId)
          if (preset === null) return originalCreate.call(sessions, options)
          try {
            return await originalCreate.call(sessions, { ...options, agentPreset: preset })
          } catch (error) {
            if (!PRESET_ERROR_CODES.has(presetErrorCode(error))) throw error
            // The stored preset is stale: forget it and let the Host resolve its default.
            warnOnce('stale:' + workspaceId, error)
            defaults.delete(workspaceId)
            return originalCreate.call(sessions, options)
          }
        }
        sessions.create = patchedCreate
        ctx.effect(() => () => {
          if (sessions.create === patchedCreate) sessions.create = originalCreate
        }, `${NS}: sessions.create`)

        /**
         * Mirror the registry's `presetDisplayText` fold: shipped presets
         * publish no name and take the product dictionary, custom presets keep
         * the name they published, and an unavailable dictionary leaves the id.
         */
        const BUILT_IN_NAME_KEYS = {
          standard: 'presetStandardName',
          ptc: 'presetPtcName',
          minimal: 'presetMinimalName',
          cordis: 'presetCordisName',
        }
        const displayName = (preset) => {
          if (preset === undefined) return undefined
          if (preset.name !== undefined) return preset.name
          const key = BUILT_IN_NAME_KEYS[preset.id]
          const localized = key === undefined ? undefined : displayT?.(key)
          return localized === undefined || localized === key ? preset.id : localized
        }

        /**
         * Move the retained blank Session of this Workspace onto the new
         * default. The Host only accepts a preset while a Session is blank, so
         * a started Session keeps its recorded composition.
         * @param target - clicked Workspace.
         * @param presetId - new Workspace default, or null for the global one.
         * @param globalId - Host-effective global default id, when known.
         */
        const syncBlank = async (target, presetId, globalId) => {
          const desired = presetId ?? globalId
          if (desired === undefined) return
          const sessions = ctx.get('sessions')
          const list = sessions.list?.getSnapshot?.()
          if (list === undefined) return
          const candidate = list.ids.find((id) => {
            const summary = list.byId[id]
            return summary?.blank === true && summary.cwd === target.path && sessions.scope?.(id) !== undefined
          })
          if (candidate === undefined) return
          try {
            const result = await ctx.remote.agentPresets.select(candidate, desired)
            if (!result.ok) warnOnce('sync-blank', result.error)
          } catch (error) {
            warnOnce('sync-blank', error)
          }
        }

        const save = async (target, presetId, label, globalId) => {
          const service = await namespace()
          if (service === undefined) throw new Error(t('menuUnavailable'))
          const result = await service.write(target.workspaceId, presetId)
          if (!result.ok) throw new Error(result.error?.message ?? t('noticeFailed'))
          defaults.set(target.workspaceId, result.value.agentPreset)
          await syncBlank(target, presetId, globalId)
          ctx.contextMenus.notify(
            presetId === null ? t('noticeGlobal') : t('noticeSaved', { preset: label ?? presetId }),
            true,
          )
        }

        ctx.effect(() => ctx.contextMenus.register({
          id: 'workspace.agent-preset',
          target: 'workspace',
          order: MENU_ORDER,
          resolve: async (target, signal) => {
            const unavailable = (reason) => {
              if (reason !== undefined) warnOnce('unavailable', reason)
              return [{ id: 'unavailable', label: t('menuUnavailable'), disabled: true }]
            }
            const service = await namespace()
            if (service === undefined) {
              return unavailable(mountFailure instanceof Error ? mountFailure.message : String(mountFailure))
            }
            let presets
            try {
              const roster = await ctx.remote.agentPresets.list()
              if (!roster.ok) {
                warnOnce('roster', roster.error)
                return unavailable(roster.error.message)
              }
              presets = roster.value.presets
              if (signal.aborted) return []
              await presetOf(target.workspaceId, { fresh: true })
            } catch (error) {
              warnOnce('resolve', error)
              return unavailable(error instanceof Error ? error.message : String(error))
            }
            if (signal.aborted) return []
            const current = defaults.get(target.workspaceId) ?? null
            const known = presets.find(preset => preset.id === current)
            const global = presets.find(preset => preset.isDefault)
            if (current !== null && known === undefined) {
              warnOnce('missing:' + target.workspaceId, `preset "${current}" is no longer declared`)
            }
            const currentName = current === null
              ? t('menuGlobalPlain')
              : (displayName(known) ?? current)
            return [{
              id: 'default',
              label: t('menuTitle', { current: currentName }),
              icon: { key: ICON_KEY },
              children: [
                {
                  id: 'global',
                  label: global === undefined ? t('menuGlobalPlain') : t('menuGlobal', { preset: displayName(global) }),
                  icon: { key: ICON_KEY },
                  ...(current === null ? { disabled: true } : {}),
                  failureLabel: t('failure'),
                  run: () => save(target, null, undefined, global?.id),
                },
                ...presets.map((preset, index) => ({
                  id: 'preset:' + preset.id,
                  label: displayName(preset) + (current === preset.id ? ' ✓' : ''),
                  icon: { key: ICON_KEY },
                  ...(index === 0 ? { separatorBefore: true } : {}),
                  failureLabel: t('failure'),
                  run: () => save(target, preset.id, displayName(preset), global?.id),
                })),
              ],
            }]
          },
        }), `${NS}: workspace menu`)
      },
    }
  },
})
