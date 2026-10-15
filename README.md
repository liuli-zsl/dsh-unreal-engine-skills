# dsh-unreal-engine-skills

DeepSeek Harness port of Epic Games' [Unreal Engine Skills for Claude Code](https://github.com/EpicGames/unreal-engine-skills-for-claude-code-plugin) plugin (MIT license, upstream version 3.1.1).

One bundle, three capabilities:

1. **Skills** — registers `unreal-mcp`, `create-toolset`, and `unreal-skill` as Harness skills (same SKILL.md set as upstream, adapted to Harness tool naming `mcp__unreal-mcp__*`).
2. **MCP connection** — inserts a `@deepseek-ai/dsh-mcp-client` row named `unreal-mcp` pointing at the Unreal Editor's `ModelContextProtocol` server (`http://127.0.0.1:8000/mcp`). The client reconnects with exponential backoff while the editor is down, and every server tool surfaces as `mcp__unreal-mcp__<tool>`.
3. **Unreal project context** — a port of the upstream `SessionStart` hook: a dynamic system-prompt runtime context detects an Unreal project (`.uproject` or `GenerateProjectFiles.*`, walking up from the session's working directory) and injects a short UE-convention note each model step.

## Install

```text
plugin_manager: action install_bundle, target <this directory>
```

or, from a shell with `dsh` on PATH, install the directory as a bundle and enable it.

## Editor-side setup (one time per project)

1. Enable the `ModelContextProtocol` and `AllToolsets` plugins in the project's `.uproject`.
2. Auto-start the server:

   ```ini
   ; <Project>/Saved/Config/<Platform>Editor/EditorPerProjectUserSettings.ini
   [/Script/ModelContextProtocolEngine.ModelContextProtocolSettings]
   bAutoStartServer=True
   ```

   or run `ModelContextProtocol.StartServer` in the editor console.
3. Verify: ask for `mcp__unreal-mcp__list_toolsets` (or "List all actors in the current level").

Full details: the `unreal-mcp` skill's `references/setup.md` and `references/operations.md` (load the skill first, then read the references).

## Configuration

- **Port / URL change**: edit the installed bundle's `unreal-mcp` row config (Settings → Plugins inventory) so `url` matches `ModelContextProtocol.StartServer <port>`, then re-apply.
- **Proxy (editor recovery)**: replace the row's `transport`/`url` with `transport: stdio`, `command: <unreal_mcp_proxy binary>`, `args: ["--mcp-json", "<path>"]`; see `references/setup.md` step 4.
- Tool call timeout is 300 s (Live Coding compiles can exceed the 60 s default); reconnect budget is ~1 hour at the 30 s cap.

## Security

This bundle gives the agent broad, live access to the running Unreal Editor, including `ProgrammaticToolset.execute_tool_script`, which executes arbitrary Python inside the editor process. Treat that access the same way you would treat running arbitrary code from an assistant. Save and commit before long MCP-driven sessions; review the diff afterwards. The upstream [README](https://github.com/EpicGames/unreal-engine-skills-for-claude-code-plugin#security) covers the full threat model.

## Attribution

Skill content and the hook logic are adapted from [EpicGames/unreal-engine-skills-for-claude-code-plugin](https://github.com/EpicGames/unreal-engine-skills-for-claude-code-plugin) (MIT, © Epic Games). Changes: Claude Code tool/hook mechanics replaced with Harness equivalents (`mcp__unreal-mcp__*` tool names, `systemPrompt` runtime context instead of the bash SessionStart hook, MCP client row instead of generated `.mcp.json`).
