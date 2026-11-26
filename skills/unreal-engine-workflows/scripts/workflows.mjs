import { existsSync, readFileSync, realpathSync } from 'node:fs'
import { basename, extname, isAbsolute, join, relative, resolve, sep } from 'node:path'
import { pathToFileURL } from 'node:url'
import { parseArgs } from 'node:util'

function readJson(file) {
  return JSON.parse(readFileSync(file, 'utf8').replace(/^\uFEFF/, ''))
}

function supportedVersion(value) {
  if (typeof value !== 'string' || !/^5\.[89](?:\.\d+)?$/.test(value)) {
    throw new Error(`Unsupported Unreal version "${value}". Select UE 5.8 or 5.9.`)
  }
  return value
}

/** A project association may be a custom build identifier rather than a version. */
function projectVersion(file) {
  if (extname(file).toLowerCase() !== '.uproject') throw new Error('Select a .uproject file.')
  const { EngineAssociation } = readJson(file)
  if (typeof EngineAssociation === 'string' && /^\d+(?:\.\d+)+$/.test(EngineAssociation)) {
    return supportedVersion(EngineAssociation)
  }
}

/** Resolve every supplied hint before reading the catalogue or any engine text. */
export function resolveTarget({ project, version, engine } = {}) {
  const evidence = []
  if (version !== undefined) evidence.push(['--version', supportedVersion(version)])
  if (project !== undefined) {
    const association = projectVersion(project)
    if (association) evidence.push([basename(project), association])
  }

  let engineDir
  if (engine !== undefined) {
    const root = resolve(engine)
    engineDir = existsSync(join(root, 'Engine', 'Build', 'Build.version')) ? join(root, 'Engine') : root
    const buildFile = join(engineDir, 'Build', 'Build.version')
    if (!existsSync(buildFile)) throw new Error(`Missing Build.version in the selected installation: ${buildFile}`)
    const { MajorVersion, MinorVersion, PatchVersion } = readJson(buildFile)
    if (![MajorVersion, MinorVersion, PatchVersion].every(n => Number.isInteger(n) && n >= 0)) {
      throw new Error(`Invalid engine version in ${buildFile}`)
    }
    evidence.push(['Build.version', supportedVersion(`${MajorVersion}.${MinorVersion}.${PatchVersion}`)])
  }

  if (!evidence.length) throw new Error('Unknown Unreal version. Identify the target installation or supply --version 5.8 or 5.9.')
  const versions = evidence.map(([, value]) => value)
  const exact = new Set(versions.filter(value => value.split('.').length === 3))
  const series = new Set(versions.map(value => value.split('.').slice(0, 2).join('.')))
  if (series.size !== 1 || exact.size > 1) {
    throw new Error(`Unreal version conflict: ${evidence.map(([label, value]) => `${label}=${value}`).join(', ')}. Re-identify the target.`)
  }
  return { series: [...series][0], engineDir }
}

function readCatalogFile(name) {
  const csv = readFileSync(new URL(`../references/${name}`, import.meta.url), 'utf8')
  const [header, ...lines] = csv.trimEnd().split(/\r?\n/)
  if (header !== 'id,provider,source,workflow') throw new Error(`Invalid columns in ${name}`)
  return lines.map((line, index) => {
    // The first three fields are identifiers/paths. Only the one-line guidance can contain CSV quotes or commas.
    const match = /^([^",]+),([^",]+),([^",]+),(?:"((?:[^"]|"")*)"|([^",]+))$/.exec(line)
    if (!match) throw new Error(`Invalid row in ${name} on line ${index + 2}`)
    const [, id, provider, source, quoted, plain] = match
    return { id, provider, source, workflow: quoted === undefined ? plain : quoted.replaceAll('""', '"') }
  })
}

export function catalogFor(series) {
  supportedVersion(series)
  const rows = readCatalogFile('shared.csv')
  if (series.split('.')[1] === '9') rows.push(...readCatalogFile('ue5.9.csv'))
  return rows
}

function installedText(engineDir, row) {
  if (!['.py', '.md', '.cpp', '.h'].includes(extname(row.source))) {
    throw new Error('Read this asset in its editor using ListSkills and GetSkills with a returned key.')
  }
  if (!engineDir) throw new Error('Reading installed text requires --engine pointing to the target installation.')
  const root = realpathSync(engineDir)
  const candidate = join(root, row.source)
  if (!existsSync(candidate)) throw new Error(`Source missing from the selected installation: ${row.source}`)
  const source = realpathSync(candidate)
  const within = relative(root, source)
  if (isAbsolute(within) || within === '..' || within.startsWith('..' + sep)) {
    throw new Error(`Source resolves outside the selected engine: ${row.source}`)
  }
  return readFileSync(source, 'utf8').replace(/^\uFEFF/, '')
}

export function lookup({ project, version, engine, show, source = false }) {
  const { series, engineDir } = resolveTarget({ project, version, engine })
  const rows = catalogFor(series)
  if (show === undefined) {
    if (source) throw new Error('Select one catalogue ID with --show to read its installed text.')
    return [`UE ${series} (${rows.length} workflows)`, ...rows.map(row => `${row.id}\t${row.provider}`)].join('\n')
  }
  const row = rows.find(candidate => candidate.id === show)
  if (!row) throw new Error(`"${show}" is outside the UE ${series} catalogue. Re-identify the target before selecting another version.`)
  const lines = [`UE ${series} | ${row.id} | ${row.provider}`, `Engine/${row.source}`, row.workflow]
  if (source) lines.push(installedText(engineDir, row))
  return lines.join('\n')
}

const isMain = import.meta.main ?? (process.argv[1] && existsSync(process.argv[1])
  && pathToFileURL(realpathSync(process.argv[1])).href === import.meta.url)
if (isMain) {
  try {
    const { values } = parseArgs({ options: {
      project: { type: 'string' }, version: { type: 'string' }, engine: { type: 'string' },
      show: { type: 'string' }, source: { type: 'boolean' },
    } })
    console.log(lookup(values))
  } catch (error) {
    console.error(error.message)
    process.exitCode = 1
  }
}
