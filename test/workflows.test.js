import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import { catalogFor, lookup, resolveTarget } from '../skills/unreal-engine-workflows/scripts/workflows.mjs'

const script = fileURLToPath(new URL('../skills/unreal-engine-workflows/scripts/workflows.mjs', import.meta.url))
const logTriage = '/Skills/Engine/unreal-log-triage'

function tempInstallation(t, minor) {
  const root = mkdtempSync(join(tmpdir(), 'dsh-workflows-'))
  t.after(() => rmSync(root, { recursive: true, force: true }))
  const engine = join(root, 'Engine')
  const buildFile = join(engine, 'Build', 'Build.version')
  mkdirSync(dirname(buildFile), { recursive: true })
  writeFileSync(buildFile, '\uFEFF' + JSON.stringify({ MajorVersion: 5, MinorVersion: minor, PatchVersion: 0 }))
  return { root, engine, buildFile }
}

test('5.8 selects all shared workflows and rejects each of the 57 additions', () => {
  const shared = catalogFor('5.8')
  const all = catalogFor('5.9')
  assert.equal(shared.length, 21)
  assert.equal(all.length, 78)
  assert.equal(new Set(all.map(row => row.id)).size, 78)
  assert.deepEqual(all.slice(0, shared.length), shared)
  for (const row of all) {
    assert.ok(row.provider && row.source && row.workflow)
    assert.ok(lookup({ version: '5.9', show: row.id }).includes(row.workflow))
    if (shared.some(entry => entry.id === row.id)) {
      assert.ok(lookup({ version: '5.8', show: row.id }).includes(row.workflow))
    } else {
      assert.throws(() => lookup({ version: '5.8', show: row.id }), /outside the UE 5\.8 catalogue/)
    }
  }
})

test('unknown, unsupported, missing and conflicting target evidence stop lookup', t => {
  const { root, engine, buildFile } = tempInstallation(t, 8)
  const project = join(root, 'Example.uproject')
  writeFileSync(project, '{"EngineAssociation":"{custom-build}"}')
  assert.throws(() => lookup({}), /Unknown Unreal version/)
  assert.throws(() => lookup({ project }), /Unknown Unreal version/)
  assert.throws(() => lookup({ version: '5.10' }), /Unsupported Unreal version/)
  assert.throws(() => lookup({ version: '5.8', engine: join(root, 'missing') }), /Missing Build.version/)
  assert.deepEqual(resolveTarget({ project, engine: root, version: '5.8' }), { series: '5.8', engineDir: engine })
  assert.deepEqual(resolveTarget({ engine }), resolveTarget({ engine: root }))
  assert.throws(() => lookup({ version: '5.8.4', engine }), /version conflict/)
  writeFileSync(project, '{"EngineAssociation":"5.9"}')
  assert.match(lookup({ project }), /78 workflows/)
  assert.throws(() => lookup({ project, engine }), /version conflict/)
  assert.throws(() => lookup({ project, version: '5.8' }), /version conflict/)
  writeFileSync(buildFile, '{"MajorVersion":5,"MinorVersion":"9","PatchVersion":0}')
  assert.throws(() => lookup({ engine, version: '5.9' }), /Invalid engine version/)
})

test('local text comes only from the selected install and binary assets require the live registry', t => {
  const { engine } = tempInstallation(t, 9)
  for (const extension of ['.py', '.md', '.cpp', '.h']) {
    const row = catalogFor('5.9').find(entry => entry.source.endsWith(extension))
    const file = join(engine, row.source)
    mkdirSync(dirname(file), { recursive: true })
    writeFileSync(file, `\uFEFFfixture for ${row.id}`)
    assert.ok(lookup({ engine, show: row.id, source: true }).endsWith(`\nfixture for ${row.id}`))
  }
  assert.throws(() => lookup({ version: '5.9', source: true, show: logTriage }), /requires --engine/)
  assert.throws(() => lookup({ engine, source: true }), /--show/)
  assert.throws(() => lookup({ engine, source: true, show: 'Skill_PCGGraphGeneration' }), /ListSkills and GetSkills/)
  assert.throws(() => lookup({ version: '5.8', source: true, show: 'Skill_PCGGraphGeneration' }), /ListSkills and GetSkills/)
  assert.throws(() => lookup({ engine, source: true, show: 'SequencerCameraSkill' }), /Source missing/)
  assert.throws(() => lookup({ engine, source: true, show: '../Build/Build.version' }), /outside the UE 5\.9 catalogue/)
})

test('installed CLI runs from another working directory and emits no guidance on a conflict', t => {
  const { root, engine } = tempInstallation(t, 9)
  const run = (...args) => spawnSync(process.execPath, [script, ...args], { cwd: root, encoding: 'utf8' })
  const selected = run('--engine', engine, '--show', logTriage)
  assert.equal(selected.status, 0, selected.stderr)
  assert.match(selected.stdout, /unreal-log-triage.*AgentTools/)
  const conflict = run('--version', '5.8', '--engine', engine, '--show', logTriage, '--source')
  assert.equal(conflict.status, 1)
  assert.equal(conflict.stdout, '')
  assert.match(conflict.stderr, /version conflict/)
})
