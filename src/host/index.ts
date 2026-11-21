/**
 * Host half of `dsh-workspace-default-preset`.
 *
 * Provides `ctx.workspaceAgentPresets` beside the durable Workspace registry
 * and registers the matching Typert manifest explicitly. The manifest is
 * registered here instead of through the package's `./typert` export because
 * a linked checkout can be installed while the Host is running: Typert's
 * loader caches per-package conclusions for the process lifetime, so the
 * explicit registration is the deterministic path for this bundle.
 */

import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-agent-preset-registry'
import type {} from '@deepseek-ai/dsh-typert-protocol'
import type {} from '@deepseek-ai/dsh-typert-registry'
import type {} from '@deepseek-ai/dsh-workspace'
import { TYPERT } from '../lib/typert.js'
import { createWorkspaceAgentPresetService } from '../lib/service.js'

export const inject = ['workspaceRegistry']

/**
 * Mount the Workspace preset service and its wire contract.
 * @param ctx - Host plugin context.
 */
export function apply(ctx: Context): void {
  ctx.effect(
    () => ctx.provide('workspaceAgentPresets', createWorkspaceAgentPresetService(ctx)),
    'workspace-agent-preset: service',
  )
  ctx.inject(['typert'], (child) => {
    child.effect(() => child.typert.register(TYPERT), 'workspace-agent-preset: typert')
  })
}
