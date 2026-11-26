# First-Time MCP Server Setup

Read this for first-time MCP configuration or optional proxy installation. Steps 1-2 configure the Unreal side. Step 3 explains the DeepSeek Harness connection (already wired by the `dsh-unreal-engine-skills` plugin). Step 4 adds a proxy that keeps the client session open while Unreal is unavailable.

The goal is three things:
1. Enable the `ModelContextProtocol` and `AllToolsets` plugins in the project.
2. Check the server startup settings for the target engine.
3. Confirm the Harness `unreal-mcp` connection reaches the editor.

Check the effective settings first. Confirm the target project before changing its plugin configuration.

## 1. Enable the plugins in the `.uproject`

First confirm that this engine build contains both plugins; this Harness package does not install
engine plugins or make an older engine support these APIs.

UE 5.8 ships `ModelContextProtocol` disabled by default. UE 5.9.0 ships it enabled. Check the project's effective plugin settings. Enable `AllToolsets` for the full tool catalog or enable the individual toolset plugins you need. For the full catalog, merge these entries into the project's existing `Plugins` array and preserve other entries:

```json
{
  "Plugins": [
    { "Name": "ModelContextProtocol", "Enabled": true },
    { "Name": "AllToolsets", "Enabled": true }
  ]
}
```

Restart the editor if prompted after changing its plugins.

## 2. Enable auto-start

In Editor Preferences, open **Model Context Protocol** and check **Auto Start Server**. UE 5.8 defaults to off. UE 5.9.0 enables it in the engine's base editor configuration. The project or user can override that value. To start the server for one session, run `ModelContextProtocol.StartServer [port]` in the editor console.

For a persistent override, use `<Project>/Saved/Config/<Platform>Editor/EditorPerProjectUserSettings.ini`. Choose the section for your engine:

| Engine | Section |
| --- | --- |
| UE 5.8 | `[/Script/ModelContextProtocolEngine.ModelContextProtocolSettings]` |
| UE 5.9.0 | `[/Script/ModelContextProtocol.ModelContextProtocolSettings]` |

Under that section, set `bAutoStartServer=True` to enable startup. The default endpoint uses `ServerPortNumber=8000` and `ServerUrlPath=/mcp`. Override the port or path there when needed.

A command-line alternative also works: pass `-ModelContextProtocolStartServer` (and optionally `-ModelContextProtocolPort=<port>`) to the editor. Prefer the `.ini` because it's persistent.

## 3. The Harness connection

The `dsh-unreal-engine-skills` plugin bundles a `@deepseek-ai/dsh-mcp-client` row named `unreal-mcp` pointing at the editor's default endpoint, `http://127.0.0.1:8000/mcp`. No `.mcp.json` or client-config generation is needed: the editor's `ModelContextProtocol.GenerateClientConfig` console command writes configs for other clients (ClaudeCode, Cursor, VSCode, …), which DeepSeek Harness does not read.

If you changed the port or path in step 2, open 插件 → **Unreal Engine 技能** in DeepSeek Harness and set the port (and URL path) in the MCP connection form on the bundle page — saving hot-switches the connection, no restart. Alternatively set `UNREAL_MCP_URL=http://127.0.0.1:9999/mcp` before starting the Harness; the environment variable always wins. The client reconnects with exponential backoff, so the editor does not need to be running when the Harness starts. On a Harness build whose Loader does not announce volatile config updates, the saved endpoint takes effect on the next reload or restart.

Use an integer port from 1 to 65535 and a path starting with `/` (default `/mcp`). Query strings,
fragments, spaces and backslashes are rejected; percent-encode other non-path characters. Changing
the endpoint preserves the MCP row's explicit headers, timeout and reconnect settings.

## 4. Optional: install the proxy

Use this option if you want the client session to survive editor shutdown and startup. The editor must still run for live tool calls.

Check whether your engine includes `Engine/Plugins/Experimental/ModelContextProtocol/Extras/Proxy`. If it is absent, keep the direct HTTP setup.

Choose the binary for the operating system where the MCP client runs:

| Platform | Binary under `Extras/Proxy` |
|---|---|
| Windows x64 | `Bin/Win64/unreal_mcp_proxy.exe` |
| macOS arm64 | `Bin/Mac/unreal_mcp_proxy` |
| Linux x64 | `Bin/Linux/unreal_mcp_proxy` |
| Linux arm64 | `Bin/LinuxArm64/unreal_mcp_proxy` |

The proxy is a stdio MCP server: replace the `unreal-mcp` row's `transport`/`url` with `transport: stdio`, `command: <proxy binary path>`, and `args: ["--mcp-json", "<path to a generated .mcp.json>"]` (run `ModelContextProtocol.GenerateClientConfig ClaudeCode` in the editor console once to produce that file). The `@deepseek-ai/dsh-mcp-client` row schema accepts `command`, `args`, `env`, and `cwd` for stdio servers. Configure one Unreal connection, not both the proxy and a duplicate direct HTTP connection.

The proxy stores catalogs in the operating system's user cache directory. Scope includes configuration path, proxy binary path, engine build identity, and client protocol version. It does not supply a fixed Unreal tool catalog. See the engine's `Extras/Proxy/README.md` for cache behavior and transport limits in your build.

## Multiple editors

Assign each project or engine checkout a fixed editor port, for example `8100` and `8101`. Set `ServerPortNumber` per project (step 2) or launch with `-ModelContextProtocolPort=<port>`. A client configured for an occupied port can reach the first editor even if the second editor failed to start its server.

Each Harness profile has one bundled `unreal-mcp` row. Select the target port on the Plugins page when switching editors. For simultaneous independent sessions, use separate Harness profiles with their own endpoint. When using the optional stdio proxy, point each profile's proxy at its own generated client config. Confirm the responding editor as described in [operations](operations.md#identify-the-editor) before editing assets.

## Verifying

With the editor running and its MCP server started:

- The Output Log shows MCP server startup messages.
- With tool search enabled, `list_toolsets` succeeds, the advertised discovery tool returns a schema, and a read-only `call_tool` operation returns the expected project or level. With tool search disabled, use the advertised read-only tool directly.
- The Harness plugin inventory lists the `unreal-mcp` connection as healthy.

A connected proxy or visible cached tools do not prove that Unreal is reachable. Confirm with a successful read-only Unreal tool call.

If any of these fail, see `operations.md` for recovery commands.
