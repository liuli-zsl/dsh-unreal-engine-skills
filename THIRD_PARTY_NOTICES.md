# Third-party notices

## Epic Games — Unreal Engine Skills for Claude Code

`dsh-unreal-engine-skills` is an unofficial port of
[EpicGames/unreal-engine-skills-for-claude-code-plugin](https://github.com/EpicGames/unreal-engine-skills-for-claude-code-plugin)
(upstream version 3.1.1) to DeepSeek Harness.

Adapted material:

- the skill content under `skills/` (`unreal-mcp`, `create-toolset`, `unreal-skill`, including
  the `unreal-mcp` reference documents);
- the logic of the upstream `SessionStart` hook, reimplemented as a Harness system-prompt
  context provider in `lib/index.js`;
- the upstream MCP endpoint setup, reimplemented as an `@deepseek-ai/dsh-mcp-client` loader row
  in `cordis.patch.yml` instead of a generated `.mcp.json`.

Everything else — the Harness bundle packaging, the Plugins-page port form, the browser bundle
and the port-to-MCP-row synchronization — is original to this project.

The upstream project is distributed under the MIT License:

```text
MIT License

Copyright (c) 2026 Epic Games, Inc.

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## Trademarks and affiliation

Unreal Engine and Unreal Editor are trademarks or registered trademarks of Epic Games, Inc. in the
United States and elsewhere. This project is unofficial and is not affiliated with, endorsed by, or
sponsored by Epic Games, Inc. or DeepSeek.

The MCP tools and toolsets that this bundle connects to are provided by the Unreal Editor's own
`ModelContextProtocol` and `AllToolsets` plugins. They are not part of this package.
