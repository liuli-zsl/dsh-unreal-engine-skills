# Canvas and Unreal Assistant in UE 5.9

Identify the UE 5.9 project and editor first. The inspected Unreal Canvas distribution is 0.24.0, under `Engine/Plugins/Developer/UnrealCanvas/UnrealCanvasBridge/Binaries/`. Canvas and the editor expose separate skill registries.

| Task | Where to look |
| --- | --- |
| Author a Canvas extension | The Canvas service supplies `unrealcanvas-extension-author` to its local agent. From Harness, inspect the connected Canvas host's `get_help` schema and request the `extension-authoring` topic if available. Check the extension manifest and the API for the contribution being added. |
| Find or use skills on a canvas | Discover a Canvas connection or the editor's advertised Canvas bridge. Use `list_skills` for the library, `get_skill` with a returned identifier for its body and `resolve_skills` for the effective selection on this canvas. Attached, shared and extension-provided entries depend on the current service and document. |
| Work with an editor scene or Unreal asset | Use the selected Harness `unreal-mcp` connection. Read the editor's `AgentSkillToolset.ListSkills` and `GetSkills` before applying a matching workflow. |
| Use Unreal Assistant | The Assistant uses the current editor's skill registry and its project context. Domain instructions come from that registry. The host integration is under `Engine/Plugins/Experimental/AIAssistant/`. |

If the connected tools do not expose Canvas, use this overview for offline planning and identify which live capability is missing. Canvas service instructions and user libraries are read from that installation or session. The 78 engine workflow entries count each PCG document once and exclude these Canvas and Assistant routes.
