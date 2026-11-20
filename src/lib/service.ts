/**
 * Host service behind `remote.workspaceAgentPresets`.
 *
 * The service is a plain object with a manual `typertRemote` binding; the
 * matching `./typert` manifest gives the Gateway strict codecs. It resolves a
 * Workspace id through the durable registry, so no path ever arrives from the
 * browser.
 */

import type { Context } from '@deepseek-ai/cordis'
import type { WorkspaceId } from '@deepseek-ai/dsh-workspace/types'
import type { WorkspaceAgentPresetValue } from './typert.js'
import { normalizePresetId, readWorkspacePreset, writeWorkspacePreset } from './preset-file.js'

/** The service bound to the `workspaceAgentPresets` namespace. */
export interface WorkspaceAgentPresetService {
  read(workspaceId: string): Promise<WorkspaceAgentPresetValue>
  write(workspaceId: string, agentPreset: string | null): Promise<WorkspaceAgentPresetValue>
  /** Wire binding the Gateway reads to mount the namespace. Internal shape, verified against 0.2.2-rc.5. */
  readonly typertRemote: {
    readonly service: WorkspaceAgentPresetService
    readonly serviceKey: 'workspaceAgentPresets'
    readonly namespace: 'workspaceAgentPresets'
  }
}

/**
 * Build the Workspace-scoped preset service.
 * @param ctx - Host context carrying the Workspace registry and Agent presets.
 * @returns the service bound to the `workspaceAgentPresets` namespace.
 */
export function createWorkspaceAgentPresetService(ctx: Context): WorkspaceAgentPresetService {
  const workspaceOf = (workspaceId: string) => {
    if (typeof workspaceId !== 'string' || workspaceId.length === 0) {
      throw new Error('workspace-agent-preset: workspaceId must be a non-empty string')
    }
    // The wire codec already validated a non-empty id; the Workspace id's brand
    // is compile-time only, so this is the one boundary that re-admits it.
    const workspace = ctx.workspaceRegistry.get(workspaceId as WorkspaceId)
    if (workspace === undefined) {
      throw new Error(`workspace-agent-preset: unknown workspace "${workspaceId}"`)
    }
    return workspace
  }

  const service = {
    async read(workspaceId: string): Promise<WorkspaceAgentPresetValue> {
      const workspace = workspaceOf(workspaceId)
      return { agentPreset: await readWorkspacePreset(workspace.path) }
    },

    async write(workspaceId: string, agentPreset: string | null): Promise<WorkspaceAgentPresetValue> {
      const workspace = workspaceOf(workspaceId)
      if (agentPreset === null) {
        await writeWorkspacePreset(workspace.path, null)
        return { agentPreset: null }
      }
      const preset = normalizePresetId(agentPreset)
      if (preset === null) {
        throw new Error('workspace-agent-preset: agentPreset must be a non-empty preset id or null')
      }
      const presets = ctx.get('agentPresets')
      if (presets !== undefined) {
        const known = await presets.list()
        if (!known.some(candidate => candidate.id === preset)) {
          throw new Error(`workspace-agent-preset: unknown agent preset "${preset}"`)
        }
      }
      return { agentPreset: await writeWorkspacePreset(workspace.path, preset) }
    },
  }

  Object.defineProperty(service, 'typertRemote', {
    configurable: false,
    enumerable: false,
    writable: false,
    value: { service, serviceKey: 'workspaceAgentPresets', namespace: 'workspaceAgentPresets' },
  })
  return service as WorkspaceAgentPresetService
}
