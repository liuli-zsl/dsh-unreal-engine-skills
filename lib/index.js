/**
 * dsh-unreal-engine-skills — DeepSeek Harness port of Epic Games'
 * "Unreal Engine Skills for Claude Code" plugin (MIT).
 *
 * Upstream: https://github.com/EpicGames/unreal-engine-skills-for-claude-code-plugin
 *
 * What this bundle provides:
 *   1. Runtime skills. The skills/ directory's SKILL.md files are parsed at
 *      apply() and registered
 *      with the Host `skills` service, mirroring the upstream skill set
 *      (unreal-mcp, create-toolset, unreal-skill). Reference files resolve
 *      against each skill's directory through `resourceBase`.
 *   2. The `unreal-mcp` MCP connection. cordis.patch.yml inserts a
 *      @deepseek-ai/dsh-mcp-client row; its tools surface as
 *      `mcp__unreal-mcp__<tool>` and reconnect with backoff while the editor
 *      is down.
 *   3. Unreal project context (port of the upstream SessionStart hook).
 *      A dynamic system-prompt runtime context walks up from the session's
 *      working directory; when it finds an Unreal project it injects a short
 *      UE-convention note, re-evaluated per model step with a per-cwd cache.
 */

import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

export const name = 'unreal-engine-skills'

const pluginDir = dirname(fileURLToPath(import.meta.url))
const skillsRoot = join(pluginDir, '..', 'skills')

/** Order after the core runtime contexts (SANDBOX 110 / APPROVAL 115 / SUBAGENT 120). */
const UNREAL_CONTEXT_NAME = 'unreal-engine-project'
const UNREAL_CONTEXT_ORDER = 130

// ---------------------------------------------------------------------------
// SKILL.md frontmatter parsing (minimal single-line YAML subset: name + description)
// ---------------------------------------------------------------------------

const FRONTMATTER = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/

function parseFrontmatter(source) {
  const match = FRONTMATTER.exec(source)
  if (match === null) return undefined
  const data = {}
  for (const line of match[1].split(/\r?\n/)) {
    const colon = line.indexOf(':')
    if (colon === -1) continue
    const key = line.slice(0, colon).trim()
    let value = line.slice(colon + 1).trim()
    if (value.length >= 2 && value.startsWith('"') && value.endsWith('"')) {
      value = value.slice(1, -1).replace(/\\"/g, '"').replace(/\\\\/g, '\\')
    } else if (value.length >= 2 && value.startsWith("'") && value.endsWith("'")) {
      value = value.slice(1, -1)
    }
    data[key] = value
  }
  return { data, body: source.slice(match[0].length).trim() }
}

// ---------------------------------------------------------------------------
// Skill registration
// ---------------------------------------------------------------------------

function registerSkills(ctx) {
  const skills = ctx.get('skills')
  if (skills === undefined || typeof skills.register !== 'function') {
    ctx.logger?.warn?.('dsh-unreal-engine-skills: skills service unavailable — skills not registered')
    return
  }

  let entries
  try {
    entries = readdirSync(skillsRoot, { withFileTypes: true })
  } catch (error) {
    ctx.logger?.warn?.(`dsh-unreal-engine-skills: cannot read skills directory ${skillsRoot}: ${String(error)}`)
    return
  }

  for (const entry of entries) {
    if (!entry.isDirectory()) continue
    const skillDir = join(skillsRoot, entry.name)
    const skillFile = join(skillDir, 'SKILL.md')
    let source
    try {
      source = readFileSync(skillFile, 'utf8')
    } catch (error) {
      ctx.logger?.warn?.(`dsh-unreal-engine-skills: cannot read ${skillFile}: ${String(error)}`)
      continue
    }
    const parsed = parseFrontmatter(source)
    if (parsed === undefined) {
      ctx.logger?.warn?.(`dsh-unreal-engine-skills: ${skillFile} has no YAML frontmatter — skipped`)
      continue
    }
    const skillName = parsed.data.name
    const description = parsed.data.description
    if (typeof skillName !== 'string' || skillName.length === 0 || typeof description !== 'string' || description.length === 0) {
      ctx.logger?.warn?.(`dsh-unreal-engine-skills: ${skillFile} frontmatter requires name and description — skipped`)
      continue
    }
    ctx.effect(() => skills.register({
      name: skillName,
      description,
      source: 'runtime',
      content: parsed.body,
      resourceBase: { kind: 'directory', path: skillDir },
    }), `unreal-engine-skills: register skill ${skillName}`)
  }
}

// ---------------------------------------------------------------------------
// Unreal project detection (port of upstream hooks/unreal-context.sh)
// ---------------------------------------------------------------------------

/** Reliable top-level markers only; a bare `Engine` directory is NOT a marker. */
function isProjectRoot(dir) {
  if (existsSync(join(dir, 'GenerateProjectFiles.bat'))
    || existsSync(join(dir, 'GenerateProjectFiles.sh'))
    || existsSync(join(dir, 'GenerateProjectFiles.command'))) {
    return true
  }
  try {
    return readdirSync(dir).some((file) => file.endsWith('.uproject'))
  } catch {
    return false
  }
}

function findProjectRoot(start) {
  let dir = start
  for (let depth = 0; depth < 16 && dir.length > 0; depth += 1) {
    if (isProjectRoot(dir)) return dir
    const parent = dirname(dir)
    if (parent === dir) return undefined
    dir = parent
  }
  return undefined
}

function buildUnrealNote(root) {
  const engineTree = existsSync(join(root, 'Engine'))
  let uproject = ''
  try {
    uproject = readdirSync(root).find((file) => file.endsWith('.uproject')) ?? ''
  } catch { /* best-effort */ }

  let note = 'This working directory is an Unreal Engine project.'
  if (engineTree) {
    note += ' It is an Engine source tree.'
  } else if (uproject.length > 0) {
    note += ` The project is \`${uproject}\`.`
  }
  note += ' Prefer Unreal Engine conventions (C++/UObject patterns, Slate, UHT reflection) when suggesting code.'
  note += ' Use the `unreal-mcp` skill for tasks that involve driving the Unreal Editor via MCP.'
  note += ' The `dsh-unreal-engine-skills` plugin wires the `unreal-mcp` MCP connection (default http://127.0.0.1:8000/mcp); if its tools are missing, run `ModelContextProtocol.StartServer [port]` in the editor console.'
  return note
}

/** Per-cwd memoized detection; the text provider must stay synchronous. */
const projectCache = new Map()

function unrealNoteFor(cwd) {
  if (typeof cwd !== 'string' || cwd.length === 0) return ''
  const cached = projectCache.get(cwd)
  if (cached !== undefined) return cached ?? ''
  let note = ''
  try {
    const root = findProjectRoot(cwd)
    note = root === undefined ? '' : buildUnrealNote(root)
  } catch {
    note = ''
  }
  if (projectCache.size > 64) projectCache.clear()
  projectCache.set(cwd, note || null)
  return note
}

function registerUnrealContext(ctx) {
  const systemPrompt = ctx.get('systemPrompt')
  if (systemPrompt === undefined || typeof systemPrompt.context !== 'function') {
    ctx.logger?.warn?.('dsh-unreal-engine-skills: systemPrompt service unavailable — Unreal context not injected')
    return
  }
  ctx.effect(() => systemPrompt.context({
    name: UNREAL_CONTEXT_NAME,
    order: UNREAL_CONTEXT_ORDER,
    text: ({ agent }) => unrealNoteFor(agent?.session?.header?.cwd),
  }), 'unreal-engine-skills: unreal project context')
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

export function apply(ctx) {
  try {
    registerSkills(ctx)
  } catch (error) {
    ctx.logger?.warn?.(`dsh-unreal-engine-skills: skill registration failed: ${String(error)}`)
  }
  try {
    registerUnrealContext(ctx)
  } catch (error) {
    ctx.logger?.warn?.(`dsh-unreal-engine-skills: Unreal context registration failed: ${String(error)}`)
  }
}
