---
name: unreal-engine-workflows
description: "Find built-in Unreal Engine workflows for a specific UE 5.8 or 5.9 project, read installed guidance offline, or retrieve project skills from its live editor. Includes UE 5.9 Canvas and Unreal Assistant routing."
---

# Unreal Engine workflows

Identify the intended `.uproject` and engine before choosing a workflow. If several projects are possible, resolve which one the user means. A workspace path identifies a candidate for a live connection. Confirm which editor actually answers the selected Harness `unreal-mcp` connection. After a project switch, endpoint change or reconnect, discard the previous version, tool schemas and registry keys and repeat identification.

## Outside the editor

Load this skill with the Harness `skill` tool. Resolve the commands below from the returned directory `resourceBase.path`. Use `--project` with the intended descriptor when available. A numeric `EngineAssociation` supplies the project version. A custom association requires the corresponding installation or an explicit version. The reader accepts an installation root or its `Engine` directory and checks `Build/Build.version` against all supplied version hints. Unknown, unsupported or conflicting versions stop selection.

```sh
node scripts/workflows.mjs --version 5.8
node scripts/workflows.mjs --project "/path/MyGame.uproject" --engine "/path/UE" --show BlueprintBasicsSkill --source
node scripts/workflows.mjs --version 5.9 --show /Skills/Engine/unreal-log-triage
```

Use `--show ID` for the provider, relative source path and original desktop guidance. The [shared catalogue](references/shared.csv) has 21 entries. UE 5.9 also loads the [57 additions](references/ue5.9.csv). If an ID falls outside the selected version, check the target before trying it elsewhere. `--source` reads Python, Markdown or C++ text from that installation. Some text only declares a provider or generates instructions at runtime. Read Blueprint assets and project-dependent instructions through the editor.

## In a running editor

1. Load the Harness `unreal-mcp` skill. Match the responding project and engine directory to the intended target using the editor instance metadata when available. On older builds, match the listening process to its executable, project command line or startup log and the installation's `Build.version`. Stop on a mismatch or an unidentified target.
2. Inspect the advertised `mcp__unreal-mcp__` tools. With tool search enabled, use `list_toolsets` to locate `AgentSkillToolset` and describe its read tools. UE 5.8 typically offers `describe_toolset`, UE 5.9 offers `describe_toolsets` / `describe_tools`. Dispatch through `call_tool`. When the registry tools are exposed directly, use their advertised handles and schemas.
3. Call `ListSkills`. Choose a matching description and pass the **exact returned key** to `GetSkills` using its current input schema. This also finds project-specific entries outside these CSVs. Class names and asset filenames in the catalogue help search the listing. If the provider is absent, report that the current project does not expose the workflow. A matching installed source can still be read offline.
4. Use the returned instructions for the requested work. Builds, Live Coding, PIE, asset changes and saves require the user's authorization for those actions.

For UE 5.9 canvas nodes, extension authoring, or instructions active on a canvas, use the [Canvas and Assistant guide](references/canvas-assistant.md).
