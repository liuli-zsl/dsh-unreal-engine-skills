# dsh-unreal-engine-skills 变更记录

从 2026-10-15 文档建档起记录可核实的变更。更早版本的发布日期和改动历史未在本工作副本中核实，因此不补写历史条目。变更类型与验证范围均按实际执行内容记录，静态检查不能代替运行实测。

## 1.0.4 — 2026-10-18

`package.json`：`version: 1.0.4`；新增 `engines.dsh: ">=0.2.0-rc.2 <0.3.0"`。

- 适配 DeepSeek Harness 0.2.1-rc.2 的兼容性判据：0.2.1 把 `evaluatePluginCompatibility` 改为 `unmetRequirements()` —— 清单自带 `engines.dsh` 时由它单独决定，`@deepseek-ai/dsh-*` 的 peer 范围不再参与判定；未声明时才回退到 peer 检查。本插件原先没有任何 `@deepseek-ai/dsh-*` peer，因此在任何 DSH 版本上都属于「无声明、不检查」。补上 `engines.dsh` 后，插件管理器与桌面端的兼容性判断对本插件有了明确依据，同时不改变运行行为。
- 运行时代码、`cordis.patch.yml`、浏览器半 bundle 均未修改：逐一核对 0.2.0-rc.2 → 0.2.1-rc.2 的接口后确认无破坏性变更。`dsh-skill`、`dsh-settings`、`dsh-config-editor` 的 `lib/index.js` 与 0.2.0-rc.2 逐字节相同；`dsh-system-prompt` 只做增量（新增 `interpolate`、`refreshContext` 等），`context({ name, order, text })` 的注册形状不变；`dsh-hmr` 内部实现从 672 行增长到 1465 行，但 `executing` 仍是 `AsyncLocalStorage`，`hmr.executing.exit()` 语义不变；`dsh-mcp-client` 的 `serverName` / `transport` / `url` / `failOnStartupError` / `toolCallTimeoutMs` / `reconnect.*` 配置键不变，`cordis.patch.yml` 无需改动。
- 浏览器半同样无需改动：`@deepseek-ai/dsh-client-ui-primitives`、`-client-ui-slots`、`-client-store` 在 0.2.1 不再作为独立包发布，改由 Web 前端 bundle 的共享模块表以同一模块 id 提供（`dsh-web-frontend` 的 `SZ()` 模块映射），`require()` 名称不变；`plugins.bundle.config` / `plugins.row.config` 槽位、`${bundle}#${rowId}` 的 key 约定、`configForms.whileServed` 用法，以及 `SettingsFormModel` / `settingsNumberField` / `settingsTextField` / `SettingsValueField` / `SettingsForm` 导出在 0.2.1 前端 bundle 中均保留。
- 文档：`README.md` 的「平台与验证边界」改为面向 0.2.1-rc.2，并说明 `engines.dsh` 的新判定规则；当前版本号同步为 1.0.4。
- 验证（静态 + 在线只读探针）：
  - `package.json` JSON 解析通过；`node --check lib/index.js lib/client.js` 通过；以 `Config["~standard"].validate({ port: 8000, path: '/mcp' })` 校验 schema 通过（port / path 解析为 volatile 包装，与既有行为一致）。
  - 用运行中 Harness 的 `@deepseek-ai/dsh-app-boot@0.2.1-rc.2` 直接调用 `evaluatePluginCompatibility(<本插件 package.json>)`：`runtime dsh: 0.2.1-rc.2`，`compat issue: none`，新门禁放行。
  - 在线：`Config` 检查器中 `include:unreal-engine-skills` 仍为 `status: schema`（volatile `port` / `path` 可见）；插件管理器读取到的 bundle 版本为 1.0.4。
- 未验证（与 1.0.3 相同的边界）：插件页表单的视觉呈现与从界面点击「保存」的完整链路；编辑器端 MCP 工具的真实调用（验证期间编辑器服务器未运行）；`UNREAL_MCP_URL` 环境变量路径；无 `settings` / `configEditor` 服务的精简 profile 降级行为。

## 1.0.3 — 2026-10-15

`package.json`：`version: 1.0.3`。

- README「从哪里开始」补充链接安装的前置条件：以本目录链接方式安装时，host 半依赖落地于本仓库 `node_modules`，克隆后或新增依赖后必须先 `pnpm install`（建议 `--frozen-lockfile`），否则 Node 按真实路径解析依赖时找不到 `@deepseek-ai/schemastery`，插件行静默未激活（fiber 未运行 / Config 检查器 `inactive`），技能注册、UE 上下文注入与插件页表单全部不生效。
- 本条目的起因与运行实测：本机以链接安装 1.0.2 时复现上述静默失败（模块导入报 `ERR_MODULE_NOT_FOUND: Cannot find package '@deepseek-ai/schemastery'`）；在仓库执行 `pnpm install --frozen-lockfile` 落地依赖后，经插件管理器对 `unreal-engine-skills` 行停用→启用触发热重载，行恢复 active、volatile `Config`（`port`/`path`）在线可见、`plugins.bundle.config` 与 `plugins.row.config` 两个槽位重新注册 active，全程无需重启 Harness。
- 未验证：表单视觉呈现与界面点击保存链路；编辑器端 MCP 工具真实调用（编辑器服务器未运行）。

## 1.0.2 — 2026-10-15

`package.json`：`version: 1.0.2`。

- 根据与运行中编辑器联调的实测结果修正技能文档：`skills/unreal-mcp/SKILL.md` 把 `call_tool` 的调用约定写精确——`toolset_name` 必须是 `list_toolsets` 输出的注册全名（如 `ToolsetRegistry.AgentSkillToolset`），短类名会被服务器以 "Toolset not found" 拒绝；`tool_name` 用 `describe_toolset` 列出的短名，全限定名会被 "Tool not found" 拒绝。
- `skills/unreal-mcp/references/operations.md` 排障表新增一行：编辑器重启 MCP 服务器后调用报 `Unknown session id ... client should reinitialize` 的成因与恢复方法（在插件清单停用并重新启用 `unreal-mcp` 行，强制重新 initialize）。
- 运行时代码与 bundle 补丁未修改。
- 验证：与运行中的 Unreal 编辑器（MCP 服务器于 9999 端口）实测——`list_toolsets` 返回 30+ 工具集；`describe_toolset` 返回完整 schema；`call_tool`（`ToolsetRegistry.AgentSkillToolset` + `ListSkills`）返回工程注册的 Agent Skills；会话过期场景按上述恢复方法实测重连成功。

## 1.0.1 — 2026-10-15

`package.json`：`version: 1.0.1`。

- 新增插件页端口配置 GUI：host 半导出 volatile `Config`（`port` 默认 8000、1–65535；`path` 默认 `/mcp`），并在 `apply` 中经 `ctx.inject(['settings'])` 注册展示策略（`configure({ auto: false })`）。
- 新增浏览器半侧 `lib/client.js`（手写 `__ModuleLoader__.load` bundle，无构建步骤）：注册 `plugins.bundle.config`（key=`dsh-unreal-engine-skills`，bundle 页面表单）与 `plugins.row.config`（key=`dsh-unreal-engine-skills#unreal-mcp`，`unreal-mcp` 行的「配置」入口），表单经共享 `SettingsFormModel` 暂存并写回设置通道，中英双语。
- 新增端口同步：`unreal-engine-skills` 行配置变化后，host 半把 `unreal-mcp` 行的 `url` 同步为 `http://127.0.0.1:<port><path>` 并热重载；`UNREAL_MCP_URL` 环境变量优先；行上有自定义 `transport`（如 stdio 代理）时不触碰；写入继承 bundle 行默认配置。
- 修复同步的实现约束：volatile 字段的解析值是 `{ get() }` 包装，同步前解包；`configEditor.edit()` 运行在 `hmr.runExclusive` 内、拒绝嵌套事务，同步经 `hmr.executing.exit()` 逃逸后由 HMR 队列串行执行；同步延迟到 Loader 结算之后，避免与 `unreal-mcp` 行的启动竞争。
- 清单与依赖：`package.json` 增加 `@deepseek-ai/schemastery` 依赖、`./client` 导出与 `dsh.client` 声明（`inject` 列表照抄官方 web-search 插件）；`cordis.patch.yml` 的 `unreal-mcp` 行 `url` 改为 `!!js` 环境变量表达式。
- 文档：根目录 `README.md` 按本仓库协作风格重写；新增 `CHANGELOG.md` 与 `AGENTS.md`。此三项随 1.0.1 一并建档，不再单独递增版本。
- 验证（运行中 Harness 实例实测）：新 host 代码经 HMR 热替换加载，Config 检查器显示两个 volatile 字段；端口 9998 → 9999 往返同步，`unreal-mcp` 行 url 与完整配置随行热重载；客户端 bundle 经 `/plugins/??dsh-unreal-engine-skills/client.js` 服务（HTTP 200）；浏览器内两个配置槽位注册 active；`node --check` 与 schemastery 校验探针通过。未验证：表单视觉呈现与界面点击保存的完整链路、编辑器端 MCP 工具真实调用（编辑器服务器未运行）、`UNREAL_MCP_URL` 环境变量路径、无 settings 服务的精简 profile。

## 1.0.0 — 2026-10-15

`package.json`：`version: 1.0.0`。

- 初始移植（EpicGames/unreal-engine-skills-for-claude-code-plugin 3.1.1 → DeepSeek Harness bundle）：host 半解析 `skills/` 目录并把 `unreal-mcp` / `create-toolset` / `unreal-skill` 注册为运行时技能（`resourceBase` 指向各技能目录）；端口上游 `SessionStart` hook，以 `systemPrompt` 运行时上下文注入 UE 工程提示（沿会话工作目录向上检测 `.uproject` 或 `GenerateProjectFiles.*`，按 cwd 缓存）。
- `cordis.patch.yml` 插入 `unreal-engine-skills` 与 `unreal-mcp` 两行；`unreal-mcp` 使用 `@deepseek-ai/dsh-mcp-client`（streamable-http，默认 8000，编辑器不在线时指数退避重连，约 1 小时预算）。
- 验证：插件启用、技能注册与上下文注入在运行中的 Harness 实例上生效；`unreal-mcp` 行激活。编辑器端工具调用当时未验证。
