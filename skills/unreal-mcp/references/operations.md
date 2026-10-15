# Operations: Console Commands, Settings, Recovery

Read this when something is misbehaving with the MCP server (tools missing, port collision, stale tool registry), or when you need a non-default configuration.

## Console commands

Run these from the Unreal Editor console (`~`).

| Command                                              | Use it for                                                                                               |
|------------------------------------------------------|----------------------------------------------------------------------------------------------------------|
| `ModelContextProtocol.StartServer [port]`            | Start the MCP server. Pass a port to override the default (e.g. when 8000 is in use).                    |
| `ModelContextProtocol.StopServer`                    | Stop the server. Useful if the registry is in a bad state and you want a clean restart.                  |
| `ModelContextProtocol.RefreshTools`                  | Re-register every toolset. Run this after the user enables a new toolset plugin.                         |
| `ModelContextProtocol.GenerateClientConfig <client>` | Regenerate the per-client config file. Args: `ClaudeCode`, `Cursor`, `VSCode`, `Gemini`, `Codex`, `All`. DeepSeek Harness does not read these files; the `dsh-unreal-engine-skills` plugin connects directly. |

## Tool-search mode

The MCP server's tool list has two modes, controlled by the `bEnableToolSearch` UPROPERTY on `UModelContextProtocolSettings` (default `true`):

- **`True`** (default): the server returns only `list_toolsets`, `describe_toolset`, `call_tool` (surfacing in the Harness as `mcp__unreal-mcp__*`). Toolset tools are dispatched server-side through `call_tool` and stay out of the prompt; the catalog never changes mid-session, so the prompt cache stays warm.
- **`False`**: every toolset tool is registered as a native MCP tool at startup, schemas visible upfront. Used by the hash-mapping commandlet.

Override in the same `.ini` used for `bAutoStartServer`:

```ini
[/Script/ModelContextProtocolEngine.ModelContextProtocolSettings]
bEnableToolSearch=False
```

## Proxy recovery

With the optional proxy, the client connects to the proxy instead of directly to `unreal-mcp` (see `setup.md` step 4). The proxy keeps that client session open while it reconnects to Unreal. Do not replace it with a second direct connection during normal recovery.

- `unreal_mcp_status` reports whether the proxy holds an initialized upstream session. It does not test current reachability.
- Visible tools can come from a stored catalog. Verify live access with a read-only Unreal tool call.
- With no stored catalog and no upstream session, the proxy exposes only `unreal_mcp_status`. After recovery, it sends `notifications/tools/list_changed`.
- Clients must fetch `tools/list` again after that notification. The `@deepseek-ai/dsh-mcp-client` supervises reconnects and re-syncs the tool registry; if a stale catalog persists, restart the Harness (or toggle the `unreal-mcp` row) to force a fresh generation.
- Killing the proxy closes the client's stdio connection. `Transport closed` then needs client reconnection; starting an unrelated proxy process cannot repair that connection. Ask before stopping active proxies.

If calls still fail, check the editor's MCP startup log, the configured endpoint, and proxy stderr. With multiple editors, identify which process owns the configured port. A running editor alone does not prove that the proxy targets its MCP server. Follow the recorded endpoint in the `unreal-mcp` row config and the engine's `Extras/Proxy/README.md` for your build's transport limits.

## Troubleshooting matrix

| Symptom                                               | What to do                                                                                                                                                                                                                                                                                                          |
|-------------------------------------------------------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Unreal tools are missing, or `list_toolsets` errors | Check the `unreal-mcp` row in the Harness plugin inventory and its endpoint. Check the editor's MCP startup log. For a proxy connection, follow **Proxy recovery** above before concluding that the editor is stopped. |
| Editor logs "Failed to listen on port"                | Another process holds the default port. Change `ServerPortNumber` in the per-user `EditorPerProjectUserSettings.ini` (see `setup.md`), or pass `-ModelContextProtocolPort=<port>` on the next launch; restart the editor, and update the `unreal-mcp` row's `url` in the Harness plugin inventory. |
| A toolset you expect (e.g. `NiagaraTools`) is missing | Run `ModelContextProtocol.RefreshTools`. If still missing, the toolset's plugin may not be enabled in the `.uproject`. Check there.                                                                                                                                                                                 |
| Tool calls hang or return errors                      | Editor may be busy compiling, loading a level, or in PIE. Wait and retry. For long compiles, prefer `LiveCodingToolset.CompileLiveCoding`. It returns when the compile actually finishes.                                                                                                                           |
| `AIAssistantToolset.GetDockedContext` returns empty   | The AI assistant tab must be docked inside an asset editor (Blueprint, Material, etc.) to provide docked context. If undocked, that tool has nothing to report.                                                                                                                                                      |
| Concurrent tool calls produce conflicting results     | MCP accepts concurrent requests and handles dispatch synchronization. Serialize dependent calls and mutations that affect the same state. Use parallel calls only for independent work when the tools support safe overlap.                                                                                         |
