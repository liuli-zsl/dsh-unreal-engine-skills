# dsh-unreal-engine-skills

English | [中文](README.zh.md)

Unofficial [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) port of Epic Games'
[Unreal Engine Skills for Claude Code](https://github.com/EpicGames/unreal-engine-skills-for-claude-code-plugin)
(MIT, upstream 3.1.1). One bundle gives an agent three things:

- **Three runtime skills.** `unreal-mcp` (discover and call Editor toolsets), `create-toolset`
  (author AI-callable C++/Python toolsets) and `unreal-skill` (author UE Agent Skills inside the
  editor), registered from [`skills/`](skills/).
- **The Unreal MCP connection.** A `unreal-mcp` row using `@deepseek-ai/dsh-mcp-client` connects to
  the editor's `ModelContextProtocol` server (default `http://127.0.0.1:8000/mcp`). The port and URL
  path are editable on the Harness Plugins page and take effect on save, without restarting.
- **Unreal project context.** When a session's working directory is inside an Unreal project, a
  short UE-specific context note is added to the system prompt (the directory is detected by
  walking upward for a `.uproject` or `GenerateProjectFiles.*`).

Current version: **1.0.8**. See [Status and verification boundary](#status-and-verification-boundary)
for what has and has not been verified.

## Install

Requires DeepSeek Harness `>=0.2.0-rc.2 <0.3.0` (declared as `engines.dsh` in
[`package.json`](package.json)).

### From GitHub

```sh
dsh plugin --profile <your-profile> add github:liuli-zsl/dsh-unreal-engine-skills
```

For `dsh web`, use the `web` profile. On the official Desktop app, prefer the app's **Plugins**
page and enter the GitHub source there. Command-line management of `desktop` requires the command
installed by Desktop, an initialized profile, and fully quitting the app first; the npm CLI cannot
manage that profile. See the [official CLI reference](https://github.com/deepseek-ai/deepseek-harness/blob/master/apps/cli/README.md).
The bundle patch adds two loader rows: `unreal-engine-skills` (this package) and `unreal-mcp`
(`@deepseek-ai/dsh-mcp-client`).

### From the plugin market

This plugin is planned for submission to the community catalog used by `dshmarket`; it is not yet
listed. After acceptance, users of that catalog can search for "Unreal Engine Skills". Harness
0.2.1+ also supports this catalog in **Plugins → Discover → Index sources**; it must be added there
if not already configured. See [`docs/publishing.md`](docs/publishing.md) for the source and submission.

### From a local checkout (development)

Point the Harness plugin manager's `install_bundle` at this directory, or add the directory with
`dsh plugin add`. When installed as a link to this checkout, run `pnpm install --frozen-lockfile`
here first: the host-side dependency (`@deepseek-ai/schemastery`) must be present in this
repository's `node_modules`, otherwise the plugin row silently stays inactive and none of the
skills, context injection or port form work.

## Editor setup (once per project)

Your engine build must actually contain the `ModelContextProtocol` and `AllToolsets` plugins.
This package does not install them, and does not claim support for every UE5 release. The exact
engine version/branch and Windows/Linux behavior have not yet been recorded as verified.

1. Enable the `ModelContextProtocol` and `AllToolsets` plugins in the project's `.uproject`.
   Without `AllToolsets` the server starts but exposes no tools.
2. Start the MCP server when the editor runs: either set `bAutoStartServer=True` under
   `[/Script/ModelContextProtocolEngine.ModelContextProtocolSettings]` in
   `<Project>/Saved/Config/<Platform>Editor/EditorPerProjectUserSettings.ini`, or run
   `ModelContextProtocol.StartServer [port]` in the editor console.
3. The default port is `8000`.

## Port configuration

- **Plugins page form (recommended).** Port and URL path are volatile config of the
  `unreal-engine-skills` row. Saving goes through Harness settings (`settings.mutate` →
  `configEditor.edit`); the host half then synchronizes the `unreal-mcp` row's `url` to
  `http://127.0.0.1:<port><path>` and the MCP client reconnects, without a restart. The sync runs
  both for a settings save (the Loader announces committed volatile changes) and after a plugin
  reload, and writes only when the url actually changes. It preserves current explicit settings
  (including headers, timeouts and reconnect policy), with bundle defaults for fields that have not
  been overridden (`failOnStartupError`, 300 s tool timeout, ~1 h backoff reconnect budget). On a
  Harness build that does not announce volatile updates, a saved endpoint takes effect on the next
  reload or restart.
- **Valid input.** Port must be an integer from 1 to 65535. The path must start with `/`, contain
  no spaces, backslashes, query or fragment, and use percent encoding for characters outside the
  RFC 3986 path set (for example `/mcp%20endpoint`). Both the form and host schema validate it.
- **Environment variable.** `UNREAL_MCP_URL=http://127.0.0.1:9999/mcp` set before starting
  Harness. It is process-wide (restart required) and always takes precedence over the form.
- **Custom transport guard.** If you change the `unreal-mcp` row to a stdio proxy
  (`transport: stdio` with `command`/`args`), the port sync leaves that row untouched.
- **Patch entry caveat.** In a profile patch, an entry with the same `id` *replaces* the row's
  config instead of merging. A hand-written patch must repeat `serverName` / `transport` / `url`;
  writing only `url` fails schema validation and the plugin will not activate. Prefer the form or
  the environment variable.
- The sync relies on the HMR transaction around `configEditor.edit()`: it escapes the nested
  transaction check with `hmr.executing.exit()` and runs on the HMR queue
  (`HMR transactions cannot be nested` is a design constraint, not a defect).

## Verify

With the editor running, ask the agent to call `mcp__unreal-mcp__list_toolsets` (or "list all actors
in the current level"). On the Plugins page the `unreal-mcp` row should be running, and the editor
output log should show the MCP server startup message.

## Security

The bundle gives an agent broad live access to a running editor, including
`ProgrammaticToolset.execute_tool_script` (arbitrary Python inside the editor process). Treat it
like "letting an assistant run arbitrary code". Commit or shelve before long MCP sessions and
review the diff afterwards. The upstream
[README](https://github.com/EpicGames/unreal-engine-skills-for-claude-code-plugin#security) has the
full threat model.

## Status and verification boundary

Version 1.0.8 has automated Node tests for schema validation, preservation of custom MCP settings,
environment-variable precedence, transport protection, HMR transaction escape, skill registration,
project context, and the volatile-settings sync path. Browser tests evaluate the actual bundle
against shared-primitives contract shims; they do not render the real Harness UI.

Earlier releases were checked online against DeepSeek Harness 0.2.1-rc.2: schema visibility, port
sync, client bundle delivery and slot registration. Those historical results are recorded in
[CHANGELOG.md](CHANGELOG.md) and are not a fresh acceptance of 1.0.8.

Live verification of 1.0.6 confirmed the form, the invalid-value blocking and the settings write,
but found that a saved endpoint did not reach the MCP row until a restart; 1.0.7 fixed that and the
save flow was re-checked live on 2026-10-21: a 9999 → 8000 save updated `unreal-mcp.url` in the same
process, with no restart and no write loop. Still required for 1.0.8: a clean-profile install and a
successful read-only tool call against a running editor. The sync depends on DSH internals
(`configEditor`, the HMR queue, `hmr.executing.exit()`, `loader/volatile-update`); re-check after DSH
upgrades. Evidence is recorded in [CHANGELOG.md](CHANGELOG.md).

## Repository layout

| Path | Purpose |
| --- | --- |
| [`package.json`](package.json) | Package manifest: `dsh.bundle.patch`, `dsh.client` (browser half and its `inject` modules), `exports["./client"]`, and the `engines.dsh` compatibility range. |
| [`cordis.patch.yml`](cordis.patch.yml) | Bundle patch layer: inserts the `unreal-engine-skills` row and the `unreal-mcp` row (whose `url` defaults to `UNREAL_MCP_URL` via a `!!js` expression). |
| [`lib/index.js`](lib/index.js) | Host half: skill registration from `skills/`, Unreal project detection and system-prompt context injection, the volatile `Config` (`port`, `path`) and the url sync. |
| [`lib/client.js`](lib/client.js) | Browser half: a hand-written `__ModuleLoader__.load` bundle (no build step) rendering the port form on the bundle page and the "Configure" entry on the `unreal-mcp` row. |
| [`skills/`](skills/) | The three skills' `SKILL.md` files and the `unreal-mcp` reference documents (`setup.md`, `operations.md`). |
| `locale/` | Localization dictionaries. |
| [`docs/publishing.md`](docs/publishing.md) | Release, npm and plugin-market submission steps. |
| [`LICENSE`](LICENSE), [`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md) | License and upstream attribution. |

## Related projects

- [EpicGames/unreal-engine-skills-for-claude-code-plugin](https://github.com/EpicGames/unreal-engine-skills-for-claude-code-plugin)
  — the upstream Claude Code plugin (MIT). This repository is a port of it.
- [PeterTXPan/dsh-unreal-mcp](https://github.com/PeterTXPan/dsh-unreal-mcp) — another unofficial
  DeepSeek Harness bundle for the Unreal MCP server, independently maintained. This project
  differs in its plugin-page port form with hot reload and its targeting of the current 0.2.x
  Harness line; the two can be evaluated independently.

## Development

There is no build step. Repo conventions (version bump, documentation sync, verification scope) are
in [AGENTS.md](AGENTS.md); changes are recorded in [CHANGELOG.md](CHANGELOG.md). Publishing and
marketplace steps are in [`docs/publishing.md`](docs/publishing.md).

Run `pnpm install --frozen-lockfile --ignore-scripts`, then `pnpm test`. The tests use Node's built-in
runner and do not compile code. The CI workflow runs the same checks on Node 22 and 24; its remote
result must be checked after pushing.

## License

[MIT](LICENSE) © 2026 liuli-zsl. Adapted skill material retains Epic Games' MIT notice; see
[THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md). Unreal Engine is a trademark of Epic Games, Inc.
This project is unofficial and is not affiliated with or endorsed by Epic Games.
