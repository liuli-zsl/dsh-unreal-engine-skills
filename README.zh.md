# dsh-unreal-engine-skills

[English](README.md) | 中文

用 DeepSeek Harness 连接 Unreal Editor，读取当前关卡，或通过编辑器工具集操作 Actor 和资产。
插件当前版本为 **1.2.0**。同一份 Harness 安装支持 UE 5.8 和 5.9，包含从 Epic 的 Claude Code 插件移植的技能，以及按目标版本查询引擎工作流的入口。
[DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) · [Epic 上游插件](https://github.com/EpicGames/unreal-engine-skills-for-claude-code-plugin)

## 安装

需要 DeepSeek Harness `>=0.2.0-rc.2 <0.3.0`，以及包含 Unreal MCP 和所需工具集的编辑器。[包清单](package.json) · [已核对的引擎版本](#平台与验证边界)

### 从插件市场安装

1. 在 `dshmarket` 的「发现」中搜索 `dsh-unreal-engine-skills`，安装作者为 `liuli-zsl` 的条目。市场从公开的 `main` 分支安装。[市场条目](https://awesome-dsh-plugin.com/p/liuli-zsl/dsh-unreal-engine-skills/)
2. 打开目标 Unreal 工程，启用 Unreal MCP 和 All Toolsets（或所需的独立工具集），按提示重启编辑器。如果 MCP 服务尚未启动，在编辑器控制台运行 `ModelContextProtocol.StartServer`。[编辑器侧配置](#编辑器侧配置每个工程一次)
3. 在 Harness 中输入 **“用 Unreal MCP 读取当前打开的关卡名。”** 将返回的名称与目标编辑器中打开的关卡核对。[连接验证](#验证)

通过 GitHub 来源安装的用户可在 `dshmarket` 检查更新。遇到安装或连接问题，可在仓库向维护者 `liuli-zsl` 反馈。[GitHub Issues](https://github.com/liuli-zsl/dsh-unreal-engine-skills/issues)

### 从 GitHub 安装

```sh
dsh plugin --profile web add github:liuli-zsl/dsh-unreal-engine-skills
```

以上命令用于 `dsh web`。官方桌面端优先从应用内的**插件**页填写 GitHub 来源安装。
命令行管理 `desktop` 需要使用 Desktop 安装的命令，先初始化 profile 并完全退出应用；npm 安装的 CLI
不能管理该 profile。参见[官方 CLI 说明](https://github.com/deepseek-ai/deepseek-harness/blob/master/apps/cli/README.md)。bundle 补丁会插入
`unreal-engine-skills`（本包）与 `unreal-mcp`（`@deepseek-ai/dsh-mcp-client`）两行。

### 从本地目录安装（开发）

在 Harness 插件管理器里把 `install_bundle` 指向本目录，或用 `dsh plugin add` 添加该目录。以链接方式
安装到本地检出目录时，先在本仓库执行 `pnpm install --frozen-lockfile`：host 半依赖
（`@deepseek-ai/schemastery`）必须落在本仓库的 `node_modules`，否则插件行会静默保持未激活，技能注册、
上下文注入与插件页表单全部不生效。

## 编辑器侧配置（每个工程一次）

引擎提供 `ModelContextProtocol` 插件及编辑器工具集，本插件负责让 Harness 连接该服务。

1. 确认已启用 Unreal MCP，再启用 All Toolsets 或工程所需的独立工具集插件。编辑器提示重启时按提示操作。
2. 在编辑器偏好设置的 **Model Context Protocol → Auto Start Server** 中检查自动启动状态。UE 5.8 默认为关，UE 5.9.0 的引擎基础配置默认开启。也可在编辑器控制台运行 `ModelContextProtocol.StartServer [port]` 启动当前会话。两个版本各自的 `.ini` 节名见[接入说明](skills/unreal-mcp/references/setup.md)。
3. 默认端口为 `8000`。同时运行多个编辑器时，给每个工作区分配固定端口，再在 Harness 中选择相应端点。见[多编辑器配置](skills/unreal-mcp/references/setup.md#multiple-editors)。

## 端口配置

- **插件页表单（推荐）。** 端口与 URL 路径是 `unreal-engine-skills` 行的 volatile 配置。保存走 Harness
  设置传输（`settings.mutate` → `configEditor.edit`），host 半随即把 `unreal-mcp` 行的 `url` 同步为
  `http://127.0.0.1:<port><path>`，MCP 客户端重连，无需重启。同步会在保存设置（Loader 通告 volatile
  更新）和插件重载后运行，只在 url 实际不同时写入；保留当前显式配置（包括请求头、超时与重连策略），
  未覆盖的字段继承 bundle 默认值（`failOnStartupError`、300 秒工具超时、约 1 小时退避重连预算）。
  如果 Harness 版本不提供 volatile 更新通告，保存的端点会在下次重载或重启时生效。
- **输入范围。** 端口须为 1–65535 的整数；路径须以 `/` 开头，不含空格、反斜杠、查询参数或片段。
  RFC 3986 路径字符集以外的字符须使用百分号编码，例如 `/mcp%20endpoint`。表单与 host schema 均校验。
- **环境变量。** 启动 Harness 前设置 `UNREAL_MCP_URL=http://127.0.0.1:9999/mcp`。它是进程级变量
  （改完需重启），且优先级永远高于表单。
- **自定义 transport 保护。** 如果 `unreal-mcp` 行被改成 stdio 代理（`transport: stdio` 加
  `command`/`args`），端口同步不会触碰该行。
- **补丁条目的坑。** profile 补丁里同 `id` 的条目会**整体替换**行的配置而不是合并；手写补丁必须写全
  `serverName` / `transport` / `url`，只写 `url` 会导致 schema 校验失败、插件无法激活。优先用表单或
  环境变量。
- 同步实现依赖 `configEditor.edit()` 所在的 HMR 事务：它经 `hmr.executing.exit()` 逃逸嵌套事务检查，
  由 HMR 队列串行执行（`HMR transactions cannot be nested` 是设计约束，不是缺陷）。

## 验证

编辑器运行后，让智能体读取当前关卡。启用工具搜索时，智能体先列出工具集，再用当前编辑器提供的接口读取参数，通过 `call_tool` 执行只读查询。UE 5.8 提供 `describe_toolset`，UE 5.9.0 提供 `describe_toolsets` 和 `describe_tools`。最后核对返回的关卡是否属于目标工程。

## 查找当前工程的技能

可以对 Harness 说 **“帮我找这个工程的蓝图编辑工作流。”** 插件向 Harness 注册四个技能。前三个来自 Epic 的 Claude Code 插件，第四个 `unreal-engine-workflows` 根据目标工程和引擎版本查找指引。[查询入口](skills/unreal-engine-workflows/SKILL.md)

| 来源 | 适用版本 | 可用内容 |
| --- | --- | --- |
| Epic 官方 GitHub 的 Claude Code 插件 3.1.2（MIT），已适配 Harness | 5.8、5.9 | `unreal-mcp` 操作编辑器，`create-toolset` 辅助开发 C++ 或 Python 工具，`unreal-skill` 辅助编写编辑器 Agent Skill。[Epic 官方仓库](https://github.com/EpicGames/unreal-engine-skills-for-claude-code-plugin) |
| UE 引擎安装自带的工作流 | 两代共用 **21 项**，5.9 新增 **57 项**，合计 **78 项** | 共用项包括布料、Dataflow、蓝图及编辑器、Niagara 和 PCG。5.9 新增项包括构建与日志、Sequencer、UI、MetaSound、渲染、PCG Markdown 和 Wasm 等。两张随包清单逐项列出 ID、提供模块、相对 `Engine/` 的源码路径和原创桌面指引。[21 项共用清单](skills/unreal-engine-workflows/references/shared.csv) · [57 项新增清单](skills/unreal-engine-workflows/references/ue5.9.csv) |
| Unreal Canvas 与 Unreal Assistant | 5.9 | Canvas 0.24.0 提供扩展编写技能 `unrealcanvas-extension-author`。画布技能库使用 `list_skills`、`get_skill` 和 `resolve_skills`。编辑器操作走 `unreal-mcp`，Unreal Assistant 使用当前编辑器注册表。这些入口与 78 项引擎工作流分别统计。[Canvas 与 Assistant 指引](skills/unreal-engine-workflows/references/canvas-assistant.md) |

**离线使用。** 告诉 Harness 目标 `.uproject`、引擎安装目录或明确的版本。查询入口会核对工程的数字版本关联、安装中的 `Engine/Build/Build.version` 和你指定的版本。版本未知或互相冲突时会停止。只给版本即可读随包指引，提供匹配安装后还可读取其中的 Python、Markdown 和 C++ 文本。Epic 引擎正文和资产保留在用户安装中。

**连接编辑器。** 在 Harness 插件页选中目标编辑器的端点。Harness 先核对响应的工程与引擎，再发现当前注册表的工具，通过 `ListSkills` 列出真实键，用返回的键调用 `GetSkills` 读取完整正文，包括蓝图和工程自定义技能。可用条目取决于工程启用的模块。切换编辑器或重新连接后，重新核对身份、工具参数和技能键。[连接与编辑器识别](skills/unreal-mcp/references/operations.md#identify-the-editor)

## 安全

本 bundle 给智能体对运行中编辑器的广泛实时访问，包括 `ProgrammaticToolset.execute_tool_script`
（在编辑器进程内执行任意 Python）。请按“让助手运行任意代码”同等对待。长 MCP 会话前提交或搁置改动，
事后检查差异。上游
[README](https://github.com/EpicGames/unreal-engine-skills-for-claude-code-plugin#security) 有完整的
威胁模型。

## 平台与验证边界

Harness 运行时的技能工具已加载本包查询入口。DSH MCP 客户端分别在 UE 5.8.4（CL 58902052，临时空工程的编辑器命令行实例，4 个注册键）和 UE 5.9.0（CL 60738873，运行中的编辑器工程，87 个注册键）完成只读 `ListSkills` 和 `GetSkills`。两边都取得蓝图编辑完整正文，5.9 还取得日志排查和 PCG 图生成资产的正文。已逐项核对两套安装中的 21 和 78 条来源路径。全新 Harness profile 安装和桌面插件页点击流程仍待单独验收。[验证记录](Docs/CHANGELOG.md)

## 仓库结构

| 位置 | 作用 |
| --- | --- |
| [`package.json`](package.json) | 包清单：`dsh.bundle.patch`、`dsh.client`（浏览器半侧及其 `inject` 模块）、`exports["./client"]`、`engines.dsh` 兼容范围。 |
| [`cordis.patch.yml`](cordis.patch.yml) | bundle 补丁层：插入 `unreal-engine-skills` 行与 `unreal-mcp` 行（`url` 默认取 `UNREAL_MCP_URL`，`!!js` 表达式）。 |
| [`lib/index.js`](lib/index.js) | host 半：注册 `skills/` 下的技能、UE 工程检测与系统提示词上下文注入、volatile `Config`（`port` / `path`）、url 同步。 |
| [`lib/client.js`](lib/client.js) | 浏览器半：手写的 `__ModuleLoader__.load` bundle（无构建步骤），渲染 bundle 页端口表单与 `unreal-mcp` 行的“配置”入口。 |
| [`skills/`](skills/) | 四个 Harness 技能入口、MCP 连接说明、分版本工作流清单与离线读取器。 |
| `locale/` | 插件本地化字典。 |
| [`Docs/publishing.md`](Docs/publishing.md) | 发布、npm 与插件市场上架步骤。 |
| [`LICENSE`](LICENSE)、[`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md) | 许可证与上游署名。 |

## 相关项目

- [EpicGames/unreal-engine-skills-for-claude-code-plugin](https://github.com/EpicGames/unreal-engine-skills-for-claude-code-plugin)
  —— 上游 Claude Code 插件（MIT），本仓库是它的移植版。
- [PeterTXPan/dsh-unreal-mcp](https://github.com/PeterTXPan/dsh-unreal-mcp) —— 另一个独立维护的
  DeepSeek Harness Unreal MCP bundle。本项目的差异在于插件页端口表单与热切换，以及面向当前 0.2.x
  Harness 版本线；两者可以分别评估。

## 开发

公开安装使用 `main`，同一份插件支持两代引擎。维护者本地的 `5.8` 与 `5.9` 分支用于对应系列的专项改动。

本插件直接以 JavaScript 分发。[仓库协作约定](AGENTS.md) · [变更记录](Docs/CHANGELOG.md) · [发布说明](Docs/publishing.md)

先执行 `pnpm install --frozen-lockfile --ignore-scripts`，再执行 `pnpm test`。测试使用 Node 内置运行器，
不会触发编译。CI 定义为在 Node 22、24 上运行相同检查；推送后仍需确认远端 CI 的实际结果。

## 许可

[MIT](LICENSE) © 2026 liuli-zsl。改编自上游的技能内容保留 Epic Games 的 MIT 声明，见
[THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。Unreal Engine 是 Epic Games, Inc. 的商标；本项目
为非官方项目，与 Epic Games 无从属关系，也未获其背书。
