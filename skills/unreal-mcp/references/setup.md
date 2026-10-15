# First-Time MCP Server Setup

Read this for first-time MCP configuration or optional proxy installation. Steps 1-2 configure the Unreal side. Step 3 explains the DeepSeek Harness connection (already wired by the `dsh-unreal-engine-skills` plugin). Step 4 adds a proxy that keeps the client session open while Unreal is unavailable.

The goal is three things:
1. Enable the `ModelContextProtocol` and `AllToolsets` plugins in the project.
2. Make the editor auto-start the MCP server on launch.
3. Confirm the Harness `unreal-mcp` connection reaches the editor.

Walk the user through them in order. Do not skip the user's `.uproject` edit silently. Confirm the file path first.

## 1. Enable the plugins in the `.uproject`

Two plugins are required. `ModelContextProtocol` is the server and transport; `AllToolsets` provides the tools. With only `ModelContextProtocol` enabled the server starts but exposes no tools.

Open the project's `.uproject` file. In the `Plugins` array, ensure both entries:

```json
{
  "Name": "ModelContextProtocol",
  "Enabled": true
},
{
  "Name": "AllToolsets",
  "Enabled": true
}
```

If the array doesn't exist, create it. If either entry exists with `"Enabled": false`, flip it to `true`.

`AllToolsets` is an editor-only aggregator with `EnabledByDefault` off, so it must be enabled explicitly. To expose only a subset of tools, enable the specific toolset plugins you want instead of `AllToolsets`.

## 2. Enable auto-start

The default is for the MCP server to stay stopped. To start it manually in a session, run `ModelContextProtocol.StartServer` from the editor console.

To start it automatically on every editor launch, add the snippet below to the per-user editor config file:

`<Project>/Saved/Config/<Platform>Editor/EditorPerProjectUserSettings.ini`

This is the file the editor writes when you toggle the setting in Editor Preferences. It is per-user and not source-controlled.

```ini
[/Script/ModelContextProtocolEngine.ModelContextProtocolSettings]
bAutoStartServer=True
```

Optional overrides if the defaults conflict with another local service:

```ini
ServerPortNumber=8000
ServerUrlPath=/mcp
```

A command-line alternative also works: pass `-ModelContextProtocolStartServer` (and optionally `-ModelContextProtocolPort=<port>`) to the editor. Prefer the `.ini` because it's persistent.

## 3. The Harness connection

The `dsh-unreal-engine-skills` plugin bundles a `@deepseek-ai/dsh-mcp-client` row named `unreal-mcp` pointing at the editor's default endpoint, `http://127.0.0.1:8000/mcp`. No `.mcp.json` or client-config generation is needed: the editor's `ModelContextProtocol.GenerateClientConfig` console command writes configs for other clients (ClaudeCode, Cursor, VSCode, …), which DeepSeek Harness does not read.

If you changed the port or path in step 2, edit the installed bundle's `unreal-mcp` row config in the Harness plugin inventory (Settings → Plugins) so the `url` matches, then re-apply. The client reconnects with exponential backoff, so the editor does not need to be running when the Harness starts.

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

## Verifying

After the editor is running with the plugin enabled and auto-start on:

- The Output Log shows MCP server startup messages.
- `mcp__unreal-mcp__list_toolsets` (one of the three tool-search meta-tools) returns successfully.
- The Harness plugin inventory lists the `unreal-mcp` connection as healthy.

A connected proxy or visible cached tools do not prove that Unreal is reachable. Confirm with a successful read-only Unreal tool call.

If any of these fail, see `operations.md` for recovery commands.
