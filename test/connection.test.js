import assert from 'node:assert/strict'
import { AsyncLocalStorage } from 'node:async_hooks'
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { apply, Config } from '../lib/index.js'

const defaults = {
  serverName: 'unreal-mcp',
  transport: 'streamable-http',
  url: 'http://127.0.0.1:8000/mcp',
  failOnStartupError: false,
  toolCallTimeoutMs: 300000,
  reconnect: { enabled: true, initialDelayMs: 1000, maxDelayMs: 30000, maxAttempts: 120 },
}

const validPaths = ['/', '/mcp', '/custom/mcp/', '/mcp-v2_1', '/%E4%B8%AD', '/mcp%20endpoint', '//still-a-path']
const invalidPaths = ['', 'mcp', '@example.com/mcp', 'http://example.com/mcp', '/mcp?key=value', '/mcp#fragment', '/mcp\\other', '/mcp endpoint', '/mcp\n', '/mcp\r', '/mcp\0', '/%ZZ', '/%']

async function runPlugin({ raw = {}, config: preparedConfig, current = structuredClone(defaults), env, noEditor = false, noHmr = false, rejectEdit = false, currentAtEdit } = {}) {
  const writes = [], warnings = [], skills = [], contexts = []
  const handlers = new Map()
  const transaction = new AsyncLocalStorage()
  const entry = { options: { id: 'unreal-mcp', name: '@deepseek-ai/dsh-mcp-client' }, fiber: { config: current } }
  const services = {
    skills: { register: (skill) => { skills.push(skill); return () => {} } },
    systemPrompt: { context: (context) => { contexts.push(context); return () => {} } },
    ...(!noEditor && { configEditor: {
      configuration: () => [{ entry }],
      edit: async (_entry, change) => {
        assert.equal(transaction.getStore(), undefined, 'config writes must leave the apply transaction')
        if (rejectEdit) throw new Error('fixture edit failure')
        writes.push(change(currentAtEdit ?? current, structuredClone(defaults)))
      },
    } }),
    ...(!noHmr && { hmr: { executing: transaction } }),
  }
  const ctx = {
    get: (name) => services[name], effect: (fn) => fn(), inject: () => {},
    on: (event, handler) => { handlers.set(event, handler); return () => {} },
    root: { loader: { await: () => Promise.resolve() } },
    logger: { warn: (message) => warnings.push(message) },
  }
  const result = await Config['~standard'].validate(raw)
  assert.equal(result.issues, undefined, 'fixture config must validate')
  const activeConfig = preparedConfig ?? result.value
  const previous = process.env.UNREAL_MCP_URL
  try {
    if (env === undefined) delete process.env.UNREAL_MCP_URL
    else process.env.UNREAL_MCP_URL = env
    if (noHmr) apply(ctx, activeConfig)
    else transaction.run('apply', () => apply(ctx, activeConfig))
    await new Promise((resolve) => setImmediate(resolve))
  } finally {
    if (previous === undefined) delete process.env.UNREAL_MCP_URL
    else process.env.UNREAL_MCP_URL = previous
  }
  return { writes, warnings, skills, contexts, handlers }
}

test('Config defaults remain volatile and accept integer port boundaries', async () => {
  const result = await Config['~standard'].validate({})
  assert.equal(result.value.port.get(), 8000)
  assert.equal(result.value.path.get(), '/mcp')
  for (const port of [1, 80, 8000, 65535]) {
    assert.equal((await Config['~standard'].validate({ port })).issues, undefined)
  }
})

test('Config rejects fractional, non-finite, out-of-range and non-number ports', async () => {
  for (const port of [0, -1, 65536, 8000.5, NaN, Infinity, '8000']) {
    assert.ok((await Config['~standard'].validate({ port })).issues, String(port))
  }
})

test('Config accepts endpoint paths and rejects URLs, queries, fragments and malformed escapes', async () => {
  for (const path of validPaths) assert.equal((await Config['~standard'].validate({ path })).issues, undefined, path)
  for (const path of invalidPaths) assert.ok((await Config['~standard'].validate({ path })).issues, JSON.stringify(path))
})

test('changing the endpoint preserves current headers, timeout and reconnect overrides', async () => {
  const current = { ...structuredClone(defaults), headers: { 'X-Review': 'placeholder' }, toolCallTimeoutMs: 600000, reconnect: { enabled: false } }
  const before = structuredClone(current)
  const result = await runPlugin({ raw: { port: 9999, path: '/custom' }, current })
  assert.deepEqual(result.writes, [{ ...before, url: 'http://127.0.0.1:9999/custom' }])
  assert.deepEqual(current, before, 'the config edit must not mutate the source object')
})

test('the edit uses the latest config rather than the pre-write snapshot', async () => {
  const currentAtEdit = { ...structuredClone(defaults), toolCallTimeoutMs: 900000 }
  const result = await runPlugin({ raw: { port: 9999 }, currentAtEdit })
  assert.equal(result.writes[0].toolCallTimeoutMs, 900000)
})

test('partial current config retains inherited connection defaults', async () => {
  const result = await runPlugin({ raw: { port: 9999 }, current: { transport: 'streamable-http', url: defaults.url } })
  assert.deepEqual(result.writes, [{ ...defaults, url: 'http://127.0.0.1:9999/mcp' }])
})

test('unchanged URL does not write; custom transports are left alone', async () => {
  assert.deepEqual((await runPlugin()).writes, [])
  for (const transport of ['stdio', 'sse']) {
    assert.deepEqual((await runPlugin({ raw: { port: 9999 }, current: { transport, command: 'proxy' } })).writes, [])
  }
})

test('UNREAL_MCP_URL overrides the form while preserving other settings', async () => {
  const result = await runPlugin({ raw: { port: 9999 }, env: 'https://example.com/custom', current: { ...defaults, toolCallTimeoutMs: 600000 } })
  assert.equal(result.writes[0].url, 'https://example.com/custom')
  assert.equal(result.writes[0].toolCallTimeoutMs, 600000)
})

test('all form-built endpoints stay on HTTP loopback with no URL credentials', async () => {
  for (const path of validPaths) {
    const result = await runPlugin({ raw: { port: 9999, path } })
    const url = new URL(result.writes[0].url)
    assert.equal(url.origin, 'http://127.0.0.1:9999')
    assert.equal(url.username, '')
    assert.equal(url.password, '')
    assert.equal(url.search, '')
    assert.equal(url.hash, '')
  }
})

test('missing configEditor or HMR does not prevent skill registration', async () => {
  for (const options of [{ noEditor: true }, { noHmr: true, raw: { port: 9999 } }]) {
    const result = await runPlugin(options)
    assert.deepEqual(result.skills.map((skill) => skill.name).sort(), ['create-toolset', 'unreal-mcp', 'unreal-skill'])
    assert.equal(result.warnings.length, 0)
  }
})

test('a rejected config edit reports a warning without an unhandled rejection', async () => {
  const result = await runPlugin({ raw: { port: 9999 }, rejectEdit: true })
  assert.equal(result.writes.length, 0)
  assert.match(result.warnings[0], /could not sync unreal-mcp url.*fixture edit failure/)
})

test('project context uses the real skill files and detects parent project roots', async (t) => {
  const root = mkdtempSync(join(tmpdir(), 'dsh-unreal-test-'))
  t.after(() => rmSync(root, { recursive: true, force: true }))
  const project = join(root, 'project')
  mkdirSync(join(project, 'Source'), { recursive: true })
  writeFileSync(join(project, 'Example.uproject'), '{}')
  const result = await runPlugin()
  for (const skill of result.skills) {
    assert.ok(skill.content.length > 100)
    assert.equal(skill.resourceBase.kind, 'directory')
  }
  const note = (cwd) => result.contexts[0].text({ agent: { session: { header: { cwd } } } })
  assert.match(note(join(project, 'Source')), /Example\.uproject/)
  assert.equal(note(root), '')
  assert.equal(note(undefined), '')
})

test('a committed volatile endpoint change syncs the MCP row without a re-apply', async () => {
  // The Loader treats volatile-only config changes as a no-remount update and
  // announces them on the fiber's context; the host half must sync on that.
  const live = { port: 8000, path: '/mcp' }
  const config = { port: { get: () => live.port }, path: { get: () => live.path } }
  const result = await runPlugin({ config })
  assert.deepEqual(result.writes, [], 'the default endpoint must not write')
  const volatileUpdate = result.handlers.get('loader/volatile-update')
  assert.equal(typeof volatileUpdate, 'function')
  volatileUpdate([['path']])
  await new Promise((resolve) => setImmediate(resolve))
  assert.deepEqual(result.writes, [], 'unrelated volatile fields must not trigger a write')
  live.port = 9999
  volatileUpdate([['port']])
  await new Promise((resolve) => setImmediate(resolve))
  assert.equal(result.writes.length, 1)
  assert.equal(result.writes[0].url, 'http://127.0.0.1:9999/mcp')
  assert.equal(result.writes[0].toolCallTimeoutMs, defaults.toolCallTimeoutMs)
  volatileUpdate([['port']])
  await new Promise((resolve) => setImmediate(resolve))
  assert.equal(result.writes.length, 1, 'the same desired endpoint must not write twice')
})
