# dsh-unreal-engine-skills

English | [中文](README.zh.md)

Connect DeepSeek Harness to Unreal Editor to read the open level and work with actors, assets and editor toolsets.
Version **1.1.2** is an unofficial Harness port of Epic Games' Unreal Engine Skills for Claude Code 3.1.2 (MIT).
[DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) · [Epic's original plugin](https://github.com/EpicGames/unreal-engine-skills-for-claude-code-plugin)

## Install

Use DeepSeek Harness `>=0.2.0-rc.2 <0.3.0` and an editor build that includes Unreal MCP and the toolsets you need. [Package manifest](package.json) · [Engine versions checked](#status-and-verification-boundary)

### From the plugin market

1. Open **Discover** in `dshmarket` and install `dsh-unreal-engine-skills` by `liuli-zsl`. The market installs from the public `main` branch. [Catalog entry](https://awesome-dsh-plugin.com/p/liuli-zsl/dsh-unreal-engine-skills/)
2. Open the target Unreal project. Enable Unreal MCP and All Toolsets (or the individual toolsets you need) and restart the editor if prompted. If the MCP server is stopped, run `ModelContextProtocol.StartServer` in the editor console. [Editor setup](#editor-setup-once-per-project)
3. In Harness, ask **“Use Unreal MCP to read the name of the current level.”** Compare the returned name with the level open in that editor. [Connection checks](#verify)

Existing GitHub installs can check for updates in `dshmarket`. For installation or connection problems, contact the maintainer, `liuli-zsl`, through [GitHub Issues](https://github.com/liuli-zsl/dsh-unreal-engine-skills/issues).

### From GitHub

```sh
dsh plugin --profile web add github:liuli-zsl/dsh-unreal-engine-skills
```

The command above targets `dsh web`. On the official Desktop app, prefer the app's **Plugins**
page and enter the GitHub source there. Command-line management of `desktop` requires the command
installed by Desktop, an initialized profile, and fully quitting the app first; the npm CLI cannot
manage that profile. See the [official CLI reference](https://github.com/deepseek-ai/deepseek-harness/blob/master/apps/cli/README.md).
The bundle patch adds two loader rows: `unreal-engine-skills` (this package) and `unreal-mcp`
(`@deepseek-ai/dsh-mcp-client`).

### From a local checkout (development)

Point the Harness plugin manager's `install_bundle` at this directory, or add the directory with
`dsh plugin add`. When installed as a link to this checkout, run `pnpm install --frozen-lockfile`
here first: the host-side dependency (`@deepseek-ai/schemastery`) must be present in this
repository's `node_modules`, otherwise the plugin row silently stays inactive and none of the
skills, context injection or port form work.

## Editor setup (once per project)

The engine supplies the `ModelContextProtocol` plugin and editor toolsets. The bundle connects Harness to that server.

1. Check that Unreal MCP is enabled and enable All Toolsets (or the individual toolset plugins you need). Restart the editor if prompted.
2. In Editor Preferences, check **Model Context Protocol → Auto Start Server**. Stock UE 5.8 defaults to off. The UE 5.9 Preview base configuration enables it. To start it for this session, run `ModelContextProtocol.StartServer [port]` in the editor console. The [setup guide](skills/unreal-mcp/references/setup.md) lists the `.ini` section for each version.
3. The default port is `8000`. When running multiple editors, assign a fixed port to each workspace and select the matching endpoint in Harness. See [setup](skills/unreal-mcp/references/setup.md#multiple-editors).

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

With the editor running, ask the agent to read the current level. With tool search enabled it lists toolsets, reads the tool schema using the discovery tools advertised by the editor, and invokes the read-only tool through `call_tool`. UE 5.8 provides `describe_toolset`. UE 5.9 Preview provides `describe_toolsets` and `describe_tools`. Confirm the level belongs to the intended project.

## What the bundle provides

- **Three runtime skills.** `unreal-mcp` discovers and calls editor toolsets, `create-toolset` helps author AI-callable C++ or Python toolsets, and `unreal-skill` helps author UE Agent Skills in the editor. [Skill files](skills/)
- **The Unreal MCP connection.** A `unreal-mcp` row uses `@deepseek-ai/dsh-mcp-client` to reach the editor at `http://127.0.0.1:8000/mcp` by default. The Harness Plugins page lets you set the port and URL path. [Port configuration](#port-configuration)
- **Unreal project context.** The bundle walks up from the session's working directory to find a `.uproject` or `GenerateProjectFiles.*` file and adds a short UE-specific note to the system prompt.

## Security

The bundle gives an agent broad live access to a running editor, including
`ProgrammaticToolset.execute_tool_script` (arbitrary Python inside the editor process). Treat it
like "letting an assistant run arbitrary code". Commit or shelve before long MCP sessions and
review the diff afterwards. The upstream
[README](https://github.com/EpicGames/unreal-engine-skills-for-claude-code-plugin#security) has the
full threat model.

## Status and verification boundary

The discovery and configuration instructions were checked against UE 5.8.4 and UE 5.9 Preview source and base configuration. A clean-profile Harness installation and a read-only editor call are still pending for this version. [UE 5.8 MCP reference](https://dev.epicgames.com/documentation/en-us/unreal-engine/unreal-mcp-in-unreal-editor?application_version=5.8) · [UE 5.9 MCP reference](https://dev.epicgames.com/documentation/unreal-engine/unreal-mcp-in-unreal-editor?application_version=5.9) · [Verification history](Docs/CHANGELOG.md)

## Repository layout

| Path | Purpose |
| --- | --- |
| [`package.json`](package.json) | Package manifest: `dsh.bundle.patch`, `dsh.client` (browser half and its `inject` modules), `exports["./client"]`, and the `engines.dsh` compatibility range. |
| [`cordis.patch.yml`](cordis.patch.yml) | Bundle patch layer: inserts the `unreal-engine-skills` row and the `unreal-mcp` row (whose `url` defaults to `UNREAL_MCP_URL` via a `!!js` expression). |
| [`lib/index.js`](lib/index.js) | Host half: skill registration from `skills/`, Unreal project detection and system-prompt context injection, the volatile `Config` (`port`, `path`) and the url sync. |
| [`lib/client.js`](lib/client.js) | Browser half: a hand-written `__ModuleLoader__.load` bundle (no build step) rendering the port form on the bundle page and the "Configure" entry on the `unreal-mcp` row. |
| [`skills/`](skills/) | The three skills' `SKILL.md` files and the `unreal-mcp` reference documents (`setup.md`, `operations.md`). |
| `locale/` | Localization dictionaries. |
| [`Docs/publishing.md`](Docs/publishing.md) | Release, npm and plugin-market submission steps. |
| [`LICENSE`](LICENSE), [`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md) | License and upstream attribution. |

## Related projects

- [EpicGames/unreal-engine-skills-for-claude-code-plugin](https://github.com/EpicGames/unreal-engine-skills-for-claude-code-plugin)
  — the upstream Claude Code plugin (MIT). This repository is a port of it.
- [PeterTXPan/dsh-unreal-mcp](https://github.com/PeterTXPan/dsh-unreal-mcp) — another unofficial
  DeepSeek Harness bundle for the Unreal MCP server, independently maintained. This project
  differs in its plugin-page port form with hot reload and its targeting of the current 0.2.x
  Harness line; the two can be evaluated independently.

## Development

Public installs use `main`. The maintainer's local checkout also has `5.8` and `5.9` maintenance branches. In a checkout that already contains those branches, use `git switch 5.8` or `git switch 5.9` before testing a change for that engine line. The `5.9` line starts with the UE 5.9 MegaJam Preview interface.

The bundle ships as JavaScript. [Repository conventions](AGENTS.md) · [Changelog](Docs/CHANGELOG.md) · [Publishing guide](Docs/publishing.md)

Run `pnpm install --frozen-lockfile --ignore-scripts`, then `pnpm test`. The tests use Node's built-in
runner and do not compile code. The CI workflow runs the same checks on Node 22 and 24; its remote
result must be checked after pushing.

## License

[MIT](LICENSE) © 2026 liuli-zsl. Adapted skill material retains Epic Games' MIT notice; see
[THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md). Unreal Engine is a trademark of Epic Games, Inc.
This project is unofficial and is not affiliated with or endorsed by Epic Games.
