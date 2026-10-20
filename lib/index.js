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
import z from '@deepseek-ai/schemastery'

export const name = 'unreal-engine-skills'

// RFC 3986 path characters and percent escapes; require the actual end of input.
const MCP_PATH_PATTERN = /^\/(?:[A-Za-z0-9._~!$&'()*+,;=:@/-]|%[0-9A-Fa-f]{2})*(?![\s\S])/

/**
 * Live-editable connection settings. `volatile()` marks the fields the
 * settings framework projects into a form; the browser half of this bundle
 * renders that form on the Plugins page (`plugins.bundle.config` slot).
 */
export const Config = z.object({
  port: z.number().min(1).max(65535).step(1).volatile().default(8000),
  path: z.string().pattern(MCP_PATH_PATTERN).volatile().default('/mcp'),
})

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
  note += ' The `dsh-unreal-engine-skills` plugin wires the `unreal-mcp` MCP connection (default http://127.0.0.1:8000/mcp); change the port on the Plugins page or via the UNREAL_MCP_URL environment variable. If its tools are missing, run `ModelContextProtocol.StartServer [port]` in the editor console.'
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
// unreal-mcp row url sync
// ---------------------------------------------------------------------------

const MCP_ROW_ID = 'unreal-mcp'
const MCP_ROW_NAME = '@deepseek-ai/dsh-mcp-client'

/**
 * Keep the bundle's `unreal-mcp` row url in step with this plugin's port/path
 * settings (or the UNREAL_MCP_URL environment variable, which always wins).
 *
 * Only writes when the resolved url differs; retain current explicit settings
 * over the inherited defaults. A custom transport (e.g. the stdio proxy) is
 * never touched.
 * Runs after apply() returns: configEditor.edit() reconciles the Loader and
 * awaits every fiber, including this one.
 *
 * `state.requested` de-duplicates the two request paths (a normal apply and a
 * committed volatile settings change) so one desired url produces one write.
 */
function syncMcpUrl(ctx, config, state) {
  const editor = ctx.get('configEditor')
  if (editor === undefined) return
  const rows = editor.configuration()
  const mcp = rows.find((row) => row.entry.options.id === MCP_ROW_ID && row.entry.options.name === MCP_ROW_NAME)
  if (mcp === undefined || mcp.entry.fiber === undefined) return
  const resolved = mcp.entry.fiber.config
  if (resolved === undefined) return
  if (resolved.transport !== undefined && resolved.transport !== 'streamable-http') return
  // Volatile schema fields resolve to { get: () => value } wrappers.
  const unwrap = (value) => typeof value === 'object' && value !== null && typeof value.get === 'function' ? value.get() : value
  const port = unwrap(config.port)
  const path = unwrap(config.path)
  const desired = process.env.UNREAL_MCP_URL ?? localMcpUrl(port, path)
  // One desired url produces one write, even when a reload and a committed
  // volatile settings change both request a sync.
  if (state !== undefined && state.requested === desired) return
  if (state !== undefined) state.requested = desired
  if (resolved.url === desired) return
  const run = () => editor.edit(mcp.entry, (current, inherited) => ({ ...inherited, ...current, url: desired })).catch((error) => {
    if (state !== undefined) state.requested = undefined
    ctx.logger?.warn?.(`dsh-unreal-engine-skills: could not sync ${MCP_ROW_ID} url: ${String(error)}`)
  })
  // configEditor.edit() runs inside hmr.runExclusive, which rejects nested
  // transactions — and a settings save or hot reload that re-ran this apply is
  // itself such a transaction. hmr.executing.exit() runs a callback outside
  // the current transaction's AsyncLocalStorage context, so the guard accepts
  // the call and the HMR queue serializes it after the outer transaction.
  const hmr = ctx.get('hmr')
  if (hmr === undefined) {
    void run()
    return
  }
  hmr.executing.exit(() => {
    void run()
  })
}

function localMcpUrl(port, path) {
  if (!Number.isInteger(port) || port < 1 || port > 65535 || typeof path !== 'string' || !MCP_PATH_PATTERN.test(path)) {
    throw new TypeError('Expected an integer port (1-65535) and an absolute URL path without a query or fragment')
  }
  const value = `http://127.0.0.1:${port}${path}`
  const url = new URL(value)
  if (url.protocol !== 'http:' || url.hostname !== '127.0.0.1' || Number(url.port || 80) !== port || url.username || url.password || url.search || url.hash) {
    throw new TypeError('The form endpoint must stay on HTTP loopback')
  }
  return value
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

export function apply(ctx, config) {
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
  try {
    // This bundle ships its own Plugins-page form, so no auto-generated page.
    ctx.inject(['settings'], (child) => {
      child.effect(() => child.settings.configure({ auto: false }, ctx.fiber))
    })
  } catch {
    // Settings service absent: the plugin still works, the page just isn't served.
  }
  // Deferred past this fiber's activation, and after the Loader tree settles:
  // configEditor.edit() reconciles the Loader and awaits every fiber, so the
  // sync must run from outside apply(), and waiting for settlement avoids
  // racing the unreal-mcp row's own activation at startup.
  const loader = ctx.root.loader
  const syncState = {}
  const requestSync = () => {
    const settled = loader === undefined ? Promise.resolve() : loader.await().catch(() => {})
    settled.then(() => {
      try {
        syncMcpUrl(ctx, config, syncState)
      } catch (error) {
        ctx.logger?.warn?.(`dsh-unreal-engine-skills: unreal-mcp url sync failed: ${String(error)}`)
      }
    })
  }
  requestSync()
  // Saving the volatile port/path updates the running config in place without
  // re-mounting this plugin, so a settings save never reaches apply() again.
  // The Loader announces committed volatile changes on this fiber's context
  // (`loader/volatile-update`); sync on those so a saved endpoint reaches the
  // MCP row without a restart. Full reloads still use the requestSync above.
  try {
    ctx.effect(() => ctx.on('loader/volatile-update', (paths) => {
      const touched = Array.isArray(paths) && paths.some((path) => Array.isArray(path) && (path[0] === 'port' || path[0] === 'path'))
      if (touched) requestSync()
    }), 'unreal-engine-skills: volatile endpoint sync')
  } catch (error) {
    ctx.logger?.warn?.(`dsh-unreal-engine-skills: volatile update hook unavailable: ${String(error)}`)
  }
}





