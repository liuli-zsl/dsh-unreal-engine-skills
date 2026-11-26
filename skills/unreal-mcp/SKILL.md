---
name: unreal-mcp
description: "Use this skill to perform actions inside an Unreal Engine project via a live-editor MCP connection. Trigger when the user wants to change, query, or run something in their Unreal Engine project, not for conceptual or docs questions. Concrete triggers: spawn/move/duplicate/transform actors in a level, open a `.uproject`, add things around a PlayerStart, create or edit a Blueprint/Widget/Material/Niagara/Control Rig/Sequencer/Behavior Tree/GAS ability, read or write properties on actors (e.g. `bIsLocked` on `BP_DoorActor`), Live Coding recompile after editing C++ (`AActor`, `UMyComponent::Method`, `UPROPERTY`), or modify Static/Skeletal Mesh assets. Treat as Unreal context even without the word \"Unreal\": asset prefixes `BP_`, `WBP_`, `M_`, `MI_`, `NS_`, `CR_`, `SK_`, `SM_`, `ABP_`; UE C++ types/macros; `.uproject`; Content Browser; Outliner; PlayerStart; \"in my game\" plus UE signals. Skip for: pure conceptual/docs questions, Unity, Godot, or unrelated uses of \"blueprint\"/\"sequencer\"/\"widget\"."
---

# Unreal MCP

You are wired into a live Unreal Editor through the `unreal-mcp` MCP server. The server exposes hundreds of tools across 30+ toolsets (actors, blueprints, materials, Niagara, Sequencer, Control Rigs, GAS, automation tests, Live Coding, and more) registered through Unreal's `ToolsetRegistry`. Use it to inspect and mutate live editor state instead of telling the user to do it manually.

You don't need to memorize tool names. The flow below has you discover them on demand.

In DeepSeek Harness the connection is configured by the `dsh-unreal-engine-skills` plugin (default `http://127.0.0.1:8000/mcp`), and every server tool appears with the `mcp__unreal-mcp__` prefix. The connection can appear as a proxy when the engine's optional proxy is installed; see `references/setup.md` for installation.

## Discover and call a tool

Inspect the tools advertised by the current Harness connection. The names below omit the `mcp__unreal-mcp__` prefix. In tool-search mode, call `list_toolsets` to find the registered toolset name. Use the discovery tool that this connection offers:

| Advertised tool | How to read a schema |
| --- | --- |
| `describe_toolset` (UE 5.8) | Pass `toolset_name` as one registered name. The response includes the tool schemas. |
| `describe_toolsets` (UE 5.9.0) | Pass `toolset_names` as an array of registered names. Set `include_schemas: true` when you need parameter types. |
| `describe_tools` (UE 5.9.0) | For specific tools, pass `tool_names` as an array of fully qualified names, e.g. `ToolsetRegistry.AgentSkillToolset.ListSkills` if advertised. |

Then invoke `call_tool` with the exact registered `toolset_name`, the short `tool_name` and an `arguments` object matching the schema. For example, if listed, call `ToolsetRegistry.AgentSkillToolset` / `ListSkills` with `{}`. Omit the toolset name only for top-level tools. Recursive dispatch of `call_tool` is rejected. If the server exposes domain tools directly (tool search disabled), use their advertised handles and input schemas.

Missing tools do not prove that the editor is stopped. Check the `unreal-mcp` connection in the Harness plugin inventory and follow `references/operations.md`. A proxy can stay connected while Unreal is unavailable, and a client can keep a stale catalog after recovery. `unreal_mcp_status` reports the proxy's session state, not current reachability. Verify recovery with a read-only Unreal tool call. For first-time configuration, follow `references/setup.md`.

## Safety rules

Follow these rules to protect live editor state.

- **Save first, then save again.** Tell the user to save the project (or call `AssetTools` save APIs) before any bulk change, and again after. MCP edits are not always undoable, especially across compilation boundaries. Treat anything that touches multiple assets as a destructive operation that needs a recovery point.
- **Wait for compilation.** If C++ or shader compilation is in flight, wait for it before issuing dependent calls. Start a build or `LiveCodingToolset.CompileLiveCoding` only with the user's authorization. For an authorized Live Coding run, wait for its result and read the compiler diagnostics.
- **Control concurrent calls.** MCP accepts concurrent requests and handles dispatch synchronization. Asynchronous tools can overlap, and request order does not guarantee execution or completion order. Serialize dependent calls and mutations that can affect the same asset or editor state. Use parallel calls only for independent work when the tools support safe overlap. Multiple agents can use one editor, but their conflicting changes can cause adverse effects.
- **Always check the result.** Blueprint compilation, widget creation, material edits: many tools return a status that flips between success and failure with no exception thrown on the wire. Read the response before moving on. Treat anything that isn't an explicit success as a stop.
- **Mind PIE.** Editor-only tools (asset creation in particular) behave differently while Play-in-Editor is active. If a result looks wrong, check whether PIE is running and stop it if so.

## Project skills

A project or plugin can register **Agent Skills**: named bundles of instructions that capture workflow knowledge the agent wouldn't otherwise have (a project's naming conventions, folder layout, required setup steps, or the canonical sequence for a multi-step task). These are separate from the toolsets themselves and are reached through the agent skill toolset (`AgentSkillToolset`), not through `list_toolsets`.

Check for them the same way you discover tools, and do it whenever you start unfamiliar work in a project rather than just once:

1. Identify the responding project and engine using the [editor identification steps](references/operations.md#identify-the-editor). After switching projects, endpoints or editor instances, discard previously discovered keys and schemas. Stop if the responding target conflicts with the intended one.
2. Call `AgentSkillToolset.ListSkills` using the dispatch mode above. Match the descriptions, then pass the exact key returned by this project to `AgentSkillToolset.GetSkills` using its advertised schema. Use the returned instructions within the scope of the user's request.
3. If nothing matches, fall back to the tool-discovery flow above.

A relevant project skill's instructions take precedence over your generic defaults: it exists precisely because the project's way of doing something differs from the obvious one. (Authoring or editing these skills is a separate task covered by the `unreal-skill` companion skill below.)

## Reference files

- `references/setup.md`: first-time MCP server setup, Harness connection configuration, and optional proxy installation.
- `references/operations.md`: console commands, settings, proxy recovery, and troubleshooting for missing tools or failed calls.

## Companion skills

- **`unreal-engine-workflows`** finds UE 5.8 or 5.9 engine workflows, their installed sources and the UE 5.9 Canvas routes. Use it to check version applicability or to read guidance without an editor.
- **`create-toolset`**: use when authoring a new toolset or adding tools to an existing one. Covers design principles, C++ and Python conventions, registration, error handling, and testing.
- **`unreal-skill`**: use when creating, updating, or reviewing an Agent Skill. Covers what makes a good skill and how to structure one.
