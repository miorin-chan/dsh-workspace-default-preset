/**
 * Host-side Typert manifest for `dsh-workspace-default-preset`.
 *
 * Hand-written in the shape the generator emits: `typert-loader` imports this
 * module from the package's `./typert` export and registers the invocation
 * records, while the service's `typertRemote` binding names the same namespace.
 * Codecs are strict; only plain JSON crosses the wire.
 *
 * The descriptor interfaces below are the local structural shape of a generated
 * manifest — Typert publishes no type for one (`TYPERT` is typed `unknown` in
 * every generated artifact). Builds only encode behavior, so the shape mirrors
 * what this bundle's registry call consumes.
 */

const PACKAGE = 'dsh-workspace-default-preset'

/** Strict boundary codec carried by one parameter or result. Internal shape, verified against 0.2.2-rc.5. */
interface StrictCodec<Value = unknown> {
  readonly mode: 'strict'
  readonly typeSymbol: string
  readonly schema: { parse(value: unknown): Value }
  create(): { parse(value: unknown): Value }
}

/**
 * Build one strict codec around a parser.
 * @param name - type symbol suffix.
 * @param parse - boundary parser.
 * @returns a strict codec with the schema factory the loader requires.
 */
const codec = <Value>(name: string, parse: (value: unknown) => Value): StrictCodec<Value> => ({
  mode: 'strict',
  typeSymbol: `${PACKAGE}#${name}`,
  schema: { parse },
  create: () => ({ parse }),
})

/** One JSON-source parameter of a direct invocation. Internal shape, verified against 0.2.2-rc.5. */
interface TypertParameter<Value = unknown> {
  readonly name: string
  readonly wire: string
  readonly source: 'json'
  readonly codec: StrictCodec<Value>
}

/** One direct invocation record of the manifest. Internal shape, verified against 0.2.2-rc.5. */
interface TypertInvocation {
  readonly id: string
  readonly service: string
  readonly namespace: string
  readonly method: string
  readonly invocation: { readonly kind: 'direct' }
  readonly parameters: readonly TypertParameter[]
  readonly result: StrictCodec
}

/** Generated-service reflection of one package face; this hand-written manifest reflects none. */
interface TypertModel {
  readonly services: readonly never[]
  readonly events: readonly never[]
  readonly objects: readonly never[]
}

/** Strict manifest registered by `typert-loader` from the package's `./typert` export. */
export interface TypertManifest {
  readonly package: string
  readonly face: 'host'
  readonly schemas: readonly never[]
  readonly model: TypertModel
  readonly invocations: readonly TypertInvocation[]
  readonly events: readonly never[]
  readonly objects: readonly never[]
}

/** @param value - candidate wire value. */
const workspaceId = (value: unknown): string => {
  if (typeof value !== 'string' || value.length === 0) {
    throw new TypeError('workspaceId must be a non-empty string')
  }
  return value
}

/** @param value - candidate wire value. */
const presetOrNull = (value: unknown): string | null => {
  if (value === null) return null
  if (typeof value !== 'string' || value.trim().length === 0 || value.length > 200) {
    throw new TypeError('agentPreset must be a non-empty preset id or null')
  }
  return value
}

/** One decoded preset result. */
export interface WorkspaceAgentPresetValue {
  readonly agentPreset: string | null
}

/** @param value - candidate result. */
const presetResult = (value: unknown): WorkspaceAgentPresetValue => {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError('agent preset result must be an object')
  }
  const agentPreset: unknown = Reflect.get(value, 'agentPreset')
  if (agentPreset !== null && typeof agentPreset !== 'string') {
    throw new TypeError('agentPreset must be a string or null')
  }
  return { agentPreset }
}

const presetResultCodec = codec('WorkspaceAgentPreset', presetResult)

const workspaceParameter = (name: string): TypertParameter => ({
  name,
  wire: name,
  source: 'json',
  codec: codec('WorkspaceId', workspaceId),
})

/** Strict manifest registered by `typert-loader` from the package's `./typert` export. */
export const TYPERT: TypertManifest = {
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
