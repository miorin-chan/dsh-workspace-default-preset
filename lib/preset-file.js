/**
 * Reads and writes one Workspace's default Agent preset.
 *
 * The file lives inside the Workspace so the choice travels with the
 * directory: `<workspace>/.dsh/agent-preset.json`. A missing, unreadable, or
 * malformed file means "no Workspace default" and never blocks a new Session.
 */

import { mkdir, readFile, rename, unlink, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'

/** Relative path of the Workspace-owned preset document. */
export const PRESET_RELATIVE_PATH = join('.dsh', 'agent-preset.json')

/** Longest preset id accepted from the document or the Client. */
export const MAX_PRESET_ID_LENGTH = 200

/**
 * Absolute path of the preset document inside one Workspace directory.
 * @param directory - absolute Workspace directory.
 * @returns the document path.
 */
export function presetDocumentPath(directory) {
  return join(directory, PRESET_RELATIVE_PATH)
}

/**
 * Normalize one preset id from untrusted input.
 * @param value - candidate preset id.
 * @returns the trimmed id, or null when it cannot be a preset id.
 */
export function normalizePresetId(value) {
  if (typeof value !== 'string') return null
  const id = value.trim()
  if (id.length === 0 || id.length > MAX_PRESET_ID_LENGTH) return null
  // Preset ids are single-line slugs; a newline would only split our file.
  if (/[\u0000-\u001f\u007f]/u.test(id)) return null
  return id
}

/**
 * Parse one preset document.
 * @param text - file contents.
 * @returns the declared preset id, or null for an absent or malformed value.
 */
export function parsePresetDocument(text) {
  let document
  try {
    document = JSON.parse(text)
  } catch {
    return null
  }
  if (document === null || typeof document !== 'object' || Array.isArray(document)) return null
  return normalizePresetId(document.agentPreset)
}

/**
 * Read one Workspace's default preset.
 * @param directory - absolute Workspace directory.
 * @returns the declared preset id, or null when the Workspace has none.
 */
export async function readWorkspacePreset(directory) {
  try {
    return parsePresetDocument(await readFile(presetDocumentPath(directory), 'utf8'))
  } catch {
    return null
  }
}

/**
 * Write or clear one Workspace's default preset.
 * @param directory - absolute Workspace directory.
 * @param presetId - preset to store, or null to remove the Workspace default.
 * @returns the value now stored.
 */
export async function writeWorkspacePreset(directory, presetId) {
  const file = presetDocumentPath(directory)
  if (presetId === null) {
    try {
      await unlink(file)
    } catch (error) {
      if (error?.code !== 'ENOENT') throw error
    }
    return null
  }
  await mkdir(dirname(file), { recursive: true })
  const temporary = `${file}.${process.pid}.${Date.now()}.tmp`
  try {
    await writeFile(temporary, JSON.stringify({ agentPreset: presetId }, null, 2) + '\n', 'utf8')
    await rename(temporary, file)
  } catch (error) {
    await unlink(temporary).catch(() => undefined)
    throw error
  }
  return presetId
}
