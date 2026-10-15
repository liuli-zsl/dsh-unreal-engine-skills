# dsh-unreal-engine-skills

dsh-unreal-engine-skills 是 Epic Games [Unreal Engine Skills for Claude Code](https://github.com/EpicGames/unreal-engine-skills-for-claude-code-plugin) 插件（MIT，上游 3.1.1）的 DeepSeek Harness 移植版。它以单个 bundle 提供三件事：注册 `unreal-mcp` / `create-toolset` / `unreal-skill` 三个运行时技能；接通指向 Unreal 编辑器 `ModelContextProtocol` 服务器的 `unreal-mcp` MCP 连接（端口可在插件页直接修改，保存即热切换）；以及在 UE 工程工作区注入 Unreal 工程上下文提示。

本工作副本的 `package.json` 标记版本为 `1.0.3`。版本标记不代表所有部署形态（本机链接安装、npm 分发、无 settings/configEditor 服务的精简 profile）都已完成实机验证。

## 从哪里开始

1. 安装并启用 bundle：在 Harness 的插件管理器中 `install_bundle` 指向本目录（或 npm 发布后的包名）。bundle 补丁会插入 `unreal-engine-skills`（host 行）与 `unreal-mcp`（`@deepseek-ai/dsh-mcp-client` 行）两行。**以本目录链接方式安装时，先在本仓库执行一次 `pnpm install`（建议 `--frozen-lockfile`；克隆后或新增依赖后都要执行）**：host 半依赖（`@deepseek-ai/schemastery` 等）落地在本仓库 `node_modules`，缺失时插件行会静默保持未激活——技能注册、UE 上下文注入与插件页端口表单全部不生效，插件管理器中表现为该行 fiber 未运行（Config 检查器 status `inactive`）。
2. 编辑器侧每个项目配置一次：在项目的 `.uproject` 中启用 `ModelContextProtocol` 与 `AllToolsets` 插件；然后在 `<Project>/Saved/Config/<Platform>Editor/EditorPerProjectUserSettings.ini` 中设置 `bAutoStartServer=True`，或在编辑器控制台执行 `ModelContextProtocol.StartServer [port]`。没有 `AllToolsets` 时服务器会启动但没有工具。
3. 端口默认是编辑器侧的 `8000`。需要换端口时，打开 插件 → **Unreal Engine 技能**：bundle 页面上的「Unreal Engine MCP 连接」表单可以直接改端口和 URL 路径，保存后 `unreal-mcp` 连接立即用新地址重连，无需重启 Harness；`unreal-mcp` 行本身也有「配置」入口打开同一表单。也可以在启动 Harness 前设置 `UNREAL_MCP_URL` 环境变量，它会覆盖表单端口。
4. 验证：编辑器运行后，让智能体调用 `mcp__unreal-mcp__list_toolsets`（或"列出当前关卡的所有 Actor"）；插件页中 `unreal-mcp` 行显示运行中，且编辑器输出日志有 MCP 服务器启动信息。

## 端口配置

- **插件页表单（推荐）**：端口与 URL 路径是 `unreal-engine-skills` 行的 volatile 配置。保存走 Harness 的设置传输（`settings.mutate` → `configEditor.edit`），行热重载后 host 半把 `unreal-mcp` 行的 `url` 同步为 `http://127.0.0.1:<port><path>`，MCP 客户端随即重连。同步只在 url 实际不同时写补丁，并继承 bundle 行自身的默认配置（`failOnStartupError`、300 秒工具超时、约 1 小时退避重连预算）。
- **环境变量**：`UNREAL_MCP_URL=http://127.0.0.1:9999/mcp` 在启动 Harness 前设置；它是进程级变量，改完需重启 Harness，且优先级永远高于表单端口。
- **自定义 transport 保护**：如果用户把 `unreal-mcp` 行改成 stdio 代理（`transport: stdio` + `command`/`args`），端口同步不会触碰该行。
- **补丁条目的坑**：profile 补丁里同 `id` 的条目会**整体替换**行的配置而不是合并——手写补丁必须写全 `serverName` / `transport` / `url`，只写一个 `url` 会导致 schema 校验失败、插件无法激活。优先用插件页表单或环境变量。
- 同步实现依赖 `configEditor.edit()` 的 HMR 事务：它在 `hmr.runExclusive` 内运行，而设置保存本身也是 HMR 事务，因此同步经 `hmr.executing.exit()` 逃逸后排队执行（`HMR transactions cannot be nested` 是设计约束，不是缺陷）。

## 主要组成

| 位置 | 职责与入口 |
| --- | --- |
| `package.json` | 包清单：`dsh.bundle.patch` 指向 bundle 补丁；`dsh.client` 声明浏览器半侧及其 `inject` 模块；`exports["./client"]` 指向 `lib/client.js`；依赖 `@deepseek-ai/schemastery`。 |
| `cordis.patch.yml` | bundle 补丁层：插入 `unreal-engine-skills` 与 `unreal-mcp` 两行；`unreal-mcp` 行的 `url` 默认取 `UNREAL_MCP_URL` 环境变量（`!!js` 表达式），其余字段为默认连接参数。 |
| `lib/index.js` | host 半：解析 `skills/` 目录注册技能；UE 工程检测与系统提示词上下文注入（沿会话工作目录向上找 `.uproject` 或 `GenerateProjectFiles.*`，每次模型步骤按 cwd 缓存重算）；导出 volatile `Config`（`port` 1–65535 默认 8000、`path` 默认 `/mcp`）；端口到 `unreal-mcp` 行 url 的同步。 |
| `lib/client.js` | 浏览器半：手写的 `__ModuleLoader__.load` bundle（无构建步骤）。通过 `plugins.bundle.config`（key=`dsh-unreal-engine-skills`）在 bundle 页面渲染端口表单，通过 `plugins.row.config`（key=`dsh-unreal-engine-skills#unreal-mcp`）给 `unreal-mcp` 行加「配置」入口；两个注册都由 `configForms.whileServed` 门控。 |
| `skills/` | 三个技能的 `SKILL.md` 与 reference 文档（`unreal-mcp` 技能带 `setup.md` / `operations.md`）。 |
| `locale/` | 插件本地化字典。 |
| `icon.svg` | bundle 图标。 |

`node_modules/` 与 `pnpm-lock.yaml` 是本仓库链接安装时的依赖落地物；`lib/client.js` 运行时只依赖 Web 应用内置的 `react` 与客户端原语，不依赖本仓库 `node_modules`。

## 专题文档

- [MCP 首次配置与代理安装](skills/unreal-mcp/references/setup.md) / [MCP 排障与恢复](skills/unreal-mcp/references/operations.md)
- [AI 与贡献者协作约定：每项修改递增版本并同步文档](AGENTS.md) / [变更记录](CHANGELOG.md)

专题文档描述各自功能；修改或排查时，仍需以当前分支的 `package.json`、`cordis.patch.yml`、源码和实际运行结果核对。

## 平台与验证边界

本插件面向 DeepSeek Harness 0.2.0-rc.2 系桌面部署。已在运行中的 Harness 实例上实测并确认的项：

- host 半新代码经 HMR 热替换加载，volatile `Config` schema 在线可见（Config 检查器：`port` 1–65535、`path`，均带 volatile 标记）；
- 端口同步端到端往返：改端口 → 行热重载 → 同步把 `unreal-mcp` 行的完整配置（含 url）写入 profile 补丁 → 行热重载重连（9998 → 9999 实测）；
- 客户端 bundle 已组合并由 `/plugins/??dsh-unreal-engine-skills/client.js` 提供服务（HTTP 200）；浏览器内 `plugins.bundle.config` 与 `plugins.row.config` 两个槽位均已注册且 active。

尚未验证的项：表单的视觉呈现与从界面点击「保存」的完整链路（写入通道与上述实测路径相同，但未实际点击）；编辑器端 MCP 工具的真实调用与结果（验证期间编辑器服务器未运行）；`UNREAL_MCP_URL` 环境变量路径；无 `settings` / `configEditor` 服务的精简 profile 降级行为。此外，同步实现依赖 DSH 的 `configEditor`、HMR 队列与 `hmr.executing.exit()` 等内部机制，DSH 升级后需按 [AGENTS.md](AGENTS.md) 复核。

## 安全

本 bundle 给智能体对运行中编辑器的广泛实时访问，包括 `ProgrammaticToolset.execute_tool_script`（在编辑器进程内执行任意 Python）。请按"让助手运行任意代码"同等对待。长 MCP 会话前提交保存、事后检查差异；上游 [README](https://github.com/EpicGames/unreal-engine-skills-for-claude-code-plugin#security) 有完整威胁模型。

## 致谢

技能内容与 hook 逻辑改编自 [EpicGames/unreal-engine-skills-for-claude-code-plugin](https://github.com/EpicGames/unreal-engine-skills-for-claude-code-plugin)（MIT，© Epic Games）。改动：Claude Code 的工具/hook 机制替换为 Harness 等价物（`mcp__unreal-mcp__*` 工具名、`systemPrompt` 运行时上下文替代 bash SessionStart hook、`@deepseek-ai/dsh-mcp-client` 行替代生成的 `.mcp.json`），并新增插件页端口配置表单。
