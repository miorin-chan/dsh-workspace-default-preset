/**
 * Host half of `dsh-workspace-agent-preset`.
 *
 * Provides `ctx.workspaceAgentPresets` beside the durable Workspace registry
 * and registers the matching Typert manifest explicitly. The manifest is
 * registered here instead of through the package's `./typert` export because
 * a linked checkout can be installed while the Host is running: Typert's
 * loader caches per-package conclusions for the process lifetime, so the
 * explicit registration is the deterministic path for this bundle.
 */

import { TYPERT } from './lib/typert.js'
import { createWorkspaceAgentPresetService } from './lib/service.js'

export const inject = ['workspaceRegistry']

/**
 * Mount the Workspace preset service and its wire contract.
 * @param ctx - Host plugin context.
 */
export function apply(ctx) {
  ctx.effect(
    () => ctx.provide('workspaceAgentPresets', createWorkspaceAgentPresetService(ctx)),
    'workspace-agent-preset: service',
  )
  ctx.inject(['typert'], (child) => {
    child.effect(() => child.typert.register(TYPERT), 'workspace-agent-preset: typert')
  })
}
