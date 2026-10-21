# dsh-unreal-engine-skills

[English](README.md) | 中文

Epic Games [Unreal Engine Skills for Claude Code](https://github.com/EpicGames/unreal-engine-skills-for-claude-code-plugin)
插件（MIT，上游 3.1.1）的 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness)
非官方移植版。单个 bundle 同时提供三件事：

- **三个运行时技能。** `unreal-mcp`（发现并调用编辑器工具集）、`create-toolset`（编写可被 AI 调用的
  C++/Python 工具集）、`unreal-skill`（在编辑器内编写 UE Agent Skill），由 [`skills/`](skills/) 注册。
- **Unreal MCP 连接。** 一条 `unreal-mcp` 行通过 `@deepseek-ai/dsh-mcp-client` 连接编辑器的
  `ModelContextProtocol` 服务器（默认 `http://127.0.0.1:8000/mcp`）。端口与 URL 路径可在 Harness
  插件页直接修改，保存即生效，无需重启。
- **UE 工程上下文。** 会话工作目录位于 Unreal 工程内时，向系统提示词注入一段简短的 UE 上下文提示
  （沿目录向上查找 `.uproject` 或 `GenerateProjectFiles.*` 判断）。

当前版本：**1.0.9**。已验证与未验证的范围见[平台与验证边界](#平台与验证边界)。

## 安装

要求 DeepSeek Harness `>=0.2.0-rc.2 <0.3.0`（[`package.json`](package.json) 的 `engines.dsh`）。

### 从 GitHub 安装

```sh
dsh plugin --profile <你的 profile> add github:liuli-zsl/dsh-unreal-engine-skills
```

使用 `dsh web` 时填写 `web`。官方桌面端优先从应用内的**插件**页填写 GitHub 来源安装。
命令行管理 `desktop` 需要使用 Desktop 安装的命令，先初始化 profile 并完全退出应用；npm 安装的 CLI
不能管理该 profile。参见[官方 CLI 说明](https://github.com/deepseek-ai/deepseek-harness/blob/master/apps/cli/README.md)。bundle 补丁会插入
`unreal-engine-skills`（本包）与 `unreal-mcp`（`@deepseek-ai/dsh-mcp-client`）两行。

### 从插件市场安装

本插件已被 `dshmarket` 使用的社区目录[收录](https://awesome-dsh-plugin.com/p/liuli-zsl/dsh-unreal-engine-skills/)，[市场 PR #8355](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin/pull/8355) 于 2026-10-20（UTC）合并。

该社区目录供 Harness 0.2.1+ **插件 → 发现**使用的 npm 版本索引，覆盖范围小于完整 GitHub 目录：其生成器要求 npm 包、确切版本和发布时间。2026-10-21 核对时，本插件目录记录中的 npm 包和版本为空，未出现在该索引；本包继续仅通过 GitHub 分发并保留 `private: true`。这是该目录生成器的限制，不是所有 Discover 索引的通用要求。详见 [`docs/publishing.md`](docs/publishing.md)。

### 从本地目录安装（开发）

在 Harness 插件管理器里把 `install_bundle` 指向本目录，或用 `dsh plugin add` 添加该目录。以链接方式
安装到本地检出目录时，先在本仓库执行 `pnpm install --frozen-lockfile`：host 半依赖
（`@deepseek-ai/schemastery`）必须落在本仓库的 `node_modules`，否则插件行会静默保持未激活，技能注册、
上下文注入与插件页表单全部不生效。

## 编辑器侧配置（每个工程一次）

目标引擎必须实际包含 `ModelContextProtocol` 与 `AllToolsets` 插件；本包不会安装它们，也不宣称所有
UE5 发行版都支持。实测引擎版本、分支和 Windows/Linux 行为目前尚未形成可核对的验证记录。

1. 在工程的 `.uproject` 中启用 `ModelContextProtocol` 与 `AllToolsets` 插件。没有 `AllToolsets` 时
   服务器会启动，但不提供工具。
2. 编辑器启动时启动 MCP 服务器：在
   `<Project>/Saved/Config/<Platform>Editor/EditorPerProjectUserSettings.ini` 的
   `[/Script/ModelContextProtocolEngine.ModelContextProtocolSettings]` 下设置
   `bAutoStartServer=True`，或在编辑器控制台执行 `ModelContextProtocol.StartServer [port]`。
3. 默认端口为 `8000`。

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

编辑器运行后，让智能体调用 `mcp__unreal-mcp__list_toolsets`（或“列出当前关卡的所有 Actor”）。
插件页中 `unreal-mcp` 行应显示运行中，编辑器输出日志应有 MCP 服务器启动信息。

## 安全

本 bundle 给智能体对运行中编辑器的广泛实时访问，包括 `ProgrammaticToolset.execute_tool_script`
（在编辑器进程内执行任意 Python）。请按“让助手运行任意代码”同等对待。长 MCP 会话前提交或搁置改动，
事后检查差异。上游
[README](https://github.com/EpicGames/unreal-engine-skills-for-claude-code-plugin#security) 有完整的
威胁模型。

## 平台与验证边界

1.0.9 仅调整许可证与发布文档；验证结果和剩余验收项见 [CHANGELOG.md](CHANGELOG.md)。

1.0.9 的 Node 自动测试覆盖 schema 校验、MCP 自定义配置保留、环境变量优先、自定义 transport 保护、
HMR 事务逃逸、技能注册、项目上下文以及 volatile 设置保存后的同步路径。浏览器侧测试在共享组件契约桩上
执行真实 bundle，不渲染实际界面。

更早版本在 DeepSeek Harness 0.2.1-rc.2 上做过在线检查，包括 schema 可见、端口同步、客户端 bundle
服务与槽位注册；历史结果保留在 [CHANGELOG.md](CHANGELOG.md)，不作为 1.0.9 的新验收结果。

1.0.6 的真机验收确认了表单呈现、非法值拦截与设置写入，但发现「保存端点后 `unreal-mcp` 行的 url 要等
重启才更新」；1.0.7 修复了该缺口，并于 2026-10-21 真机复验：端口 9999 → 8000 保存后同一进程内
`unreal-mcp.url` 立即更新，无需重启且无循环写入。1.0.9 仍需：全新 profile 安装、以及对运行中编辑器
成功执行一次只读工具调用。同步依赖 DSH 内部机制（`configEditor`、HMR 队列、`hmr.executing.exit()`、
`loader/volatile-update`），DSH 升级后需复核。证据记录在 [CHANGELOG.md](CHANGELOG.md)。

## 仓库结构

| 位置 | 作用 |
| --- | --- |
| [`package.json`](package.json) | 包清单：`dsh.bundle.patch`、`dsh.client`（浏览器半侧及其 `inject` 模块）、`exports["./client"]`、`engines.dsh` 兼容范围。 |
| [`cordis.patch.yml`](cordis.patch.yml) | bundle 补丁层：插入 `unreal-engine-skills` 行与 `unreal-mcp` 行（`url` 默认取 `UNREAL_MCP_URL`，`!!js` 表达式）。 |
| [`lib/index.js`](lib/index.js) | host 半：注册 `skills/` 下的技能、UE 工程检测与系统提示词上下文注入、volatile `Config`（`port` / `path`）、url 同步。 |
| [`lib/client.js`](lib/client.js) | 浏览器半：手写的 `__ModuleLoader__.load` bundle（无构建步骤），渲染 bundle 页端口表单与 `unreal-mcp` 行的“配置”入口。 |
| [`skills/`](skills/) | 三个技能的 `SKILL.md` 与 `unreal-mcp` 的参考文档（`setup.md`、`operations.md`）。 |
| `locale/` | 插件本地化字典。 |
| [`docs/publishing.md`](docs/publishing.md) | 发布、npm 与插件市场上架步骤。 |
| [`LICENSE`](LICENSE)、[`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md) | 许可证与上游署名。 |

## 相关项目

- [EpicGames/unreal-engine-skills-for-claude-code-plugin](https://github.com/EpicGames/unreal-engine-skills-for-claude-code-plugin)
  —— 上游 Claude Code 插件（MIT），本仓库是它的移植版。
- [PeterTXPan/dsh-unreal-mcp](https://github.com/PeterTXPan/dsh-unreal-mcp) —— 另一个独立维护的
  DeepSeek Harness Unreal MCP bundle。本项目的差异在于插件页端口表单与热切换，以及面向当前 0.2.x
  Harness 版本线；两者可以分别评估。

## 开发

仓库没有构建步骤。版本递增、文档同步与验证范围的约定见 [AGENTS.md](AGENTS.md)，变更记录见
[CHANGELOG.md](CHANGELOG.md)，发布与上架步骤见 [`docs/publishing.md`](docs/publishing.md)。

先执行 `pnpm install --frozen-lockfile --ignore-scripts`，再执行 `pnpm test`。测试使用 Node 内置运行器，
不会触发编译。CI 定义为在 Node 22、24 上运行相同检查；推送后仍需确认远端 CI 的实际结果。

## 许可

[MIT](LICENSE) © 2026 liuli-zsl。改编自上游的技能内容保留 Epic Games 的 MIT 声明，见
[THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。Unreal Engine 是 Epic Games, Inc. 的商标；本项目
为非官方项目，与 Epic Games 无从属关系，也未获其背书。
