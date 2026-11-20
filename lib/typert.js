/**
 * Host-side Typert manifest for `dsh-workspace-agent-preset`.
 *
 * Hand-written in the shape the generator emits: `typert-loader` imports this
 * module from the package's `./typert` export and registers the invocation
 * records, while the service's `typertRemote` binding names the same namespace.
 * Codecs are strict; only plain JSON crosses the wire.
 */

const PACKAGE = 'dsh-workspace-agent-preset'

/**
 * Build one strict codec around a parser.
 * @param {string} name - type symbol suffix.
 * @param {(value: unknown) => unknown} parse - boundary parser.
 * @returns a strict codec with the schema factory the loader requires.
 */
const codec = (name, parse) => ({
  mode: 'strict',
  typeSymbol: `${PACKAGE}#${name}`,
  schema: { parse },
  create: () => ({ parse }),
})

/** @param {unknown} value - candidate wire value. */
const workspaceId = (value) => {
  if (typeof value !== 'string' || value.length === 0) {
    throw new TypeError('workspaceId must be a non-empty string')
  }
  return value
}

/** @param {unknown} value - candidate wire value. */
const presetOrNull = (value) => {
  if (value === null) return null
  if (typeof value !== 'string' || value.trim().length === 0 || value.length > 200) {
    throw new TypeError('agentPreset must be a non-empty preset id or null')
  }
  return value
}

/** @param {unknown} value - candidate result. */
const presetResult = (value) => {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError('agent preset result must be an object')
  }
  const agentPreset = Reflect.get(value, 'agentPreset')
  if (agentPreset !== null && typeof agentPreset !== 'string') {
    throw new TypeError('agentPreset must be a string or null')
  }
  return { agentPreset }
}

const presetResultCodec = codec('WorkspaceAgentPreset', presetResult)

const workspaceParameter = (name) => ({
  name,
  wire: name,
  source: 'json',
  codec: codec('WorkspaceId', workspaceId),
})

/** Strict manifest registered by `typert-loader` from the package's `./typert` export. */
export const TYPERT = {
  package: PACKAGE,
  face: 'host',
  schemas: [],
  model: {
    services: [],
    events: [],
    objects: [],
  },
  invocations: [
    {
      id: `${PACKAGE}#workspaceAgentPresets/read`,
      service: 'workspaceAgentPresets',
      namespace: 'workspaceAgentPresets',
      method: 'read',
      invocation: { kind: 'direct' },
      parameters: [workspaceParameter('workspaceId')],
      result: presetResultCodec,
    },
    {
      id: `${PACKAGE}#workspaceAgentPresets/write`,
      service: 'workspaceAgentPresets',
      namespace: 'workspaceAgentPresets',
      method: 'write',
      invocation: { kind: 'direct' },
      parameters: [
        workspaceParameter('workspaceId'),
        {
          name: 'agentPreset',
          wire: 'agentPreset',
          source: 'json',
          codec: codec('AgentPresetId', presetOrNull),
        },
      ],
      result: presetResultCodec,
    },
  ],
  events: [],
  objects: [],
}

export default TYPERT
