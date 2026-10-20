import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import vm from 'node:vm'

// Contract shims for DSH's shared primitives; these tests do not render a real UI.
function loadClient() {
  let fields, plugin, component, dictionaries
  const primitives = {
    SettingsForm: 'form', SettingsValueField: 'field',
    settingsNumberField: (field) => ({ field, format: String, parse: (text) => text.trim() === '' ? { kind: 'clear' } : Number.isFinite(Number(text)) ? { kind: 'set', value: Number(text) } : undefined }),
    settingsTextField: (field) => ({ field, format: String, parse: (text) => text.trim() === '' ? { kind: 'clear' } : { kind: 'set', value: text.trim() } }),
    SettingsFormModel: class {
      constructor(_scope, specs) { fields = specs }
      bind() { return {} }
      shell() { return { writable: true } }
      field() { return {} }
      actions() { return {} }
      dispose() {}
    },
  }
  const jsx = (type, props) => ({ type, props })
  const window = { __ModuleLoader__: { load: ({ factory }) => { plugin = factory((name) => name === 'react/jsx-runtime' ? { jsx, jsxs: jsx } : primitives) } } }
  vm.runInNewContext(readFileSync(new URL('../lib/client.js', import.meta.url), 'utf8'), { window })
  plugin.apply({
    effect: (fn) => fn(),
    locale: { bind: () => (key) => key, register: (_ns, values) => { dictionaries = values } },
    configForms: { get: () => ({}), whileServed: (_ns, fn) => fn() },
    slots: { inject: (_name, fn) => fn(), register: (_slot, view) => { component = view; return () => {} } },
  })
  return { fields, component, dictionaries }
}

test('port form rejects fractional and out-of-range values before saving', () => {
  const { fields } = loadClient()
  const field = fields.find((spec) => spec.field === 'port')
  for (const text of ['8000.5', '0', '65536', 'NaN', 'Infinity', 'bad']) assert.equal(field.parse(text), undefined, text)
  for (const text of ['1', '8000', '65535']) assert.equal(field.parse(text).value, Number(text))
  assert.equal(field.parse('').kind, 'clear')
})

test('path form rejects host substitution, queries, fragments and malformed escapes', () => {
  const { fields } = loadClient()
  const field = fields.find((spec) => spec.field === 'path')
  for (const text of ['@example.com/mcp', 'mcp', '/mcp?q=x', '/mcp#x', '/mcp\\other', '/%ZZ', '/mcp\0']) assert.equal(field.parse(text), undefined, text)
  for (const text of ['/', '/mcp', '/custom/mcp', '/mcp%20endpoint']) assert.equal(field.parse(text).value, text)
  assert.equal(field.parse('  /mcp  ').value, '/mcp')
  assert.equal(field.parse('').kind, 'clear')
})

test('the path field has a bilingual validation error message', () => {
  const { component, dictionaries } = loadClient()
  const view = component({ t: (key) => key, useUnrealCard: () => ({ writable: true, port: {}, path: {} }) })
  const path = view.props.children.find((child) => child.props.id === 'plugin-config-unreal-mcp-path')
  assert.equal(path.props.invalidLabel, 'invalidPath')
  assert.ok(dictionaries.en.invalidPath)
  assert.ok(dictionaries.zh.invalidPath)
})
