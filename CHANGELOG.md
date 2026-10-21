# dsh-unreal-engine-skills 变更记录

从 2026-10-15 文档建档起记录可核实的变更。更早版本的发布日期和改动历史未在本工作副本中核实，因此不补写历史条目。变更类型与验证范围均按实际执行内容记录，静态检查不能代替运行实测。

## 1.0.9 — 2026-10-21

`package.json`：`version: 1.0.9`，保留 `private: true`。本版仅调整许可证、清单版本与发布文档；运行时代码、测试、bundle 补丁、市场条目与第三方声明均未修改。

- `LICENSE` 保留标准 MIT 全文及 `Copyright (c) 2026 liuli-zsl`，移除末尾附加项目说明，以便许可证识别；对应的移植说明、Epic Games MIT 全文及商标声明继续保留在原样未动的 `THIRD_PARTY_NOTICES.md`。提交前核对时 GitHub 返回 `NOASSERTION`，推送后是否识别为 MIT 仍待确认，不承诺识别结果。
- 双语 README 更新当前版本与市场收录状态，链接目录页及已合并的市场 PR #8355（2026-10-20 UTC）；区分完整社区目录与供 Discover 使用的 npm 版本索引。2026-10-21 实际核对：目录详情页及 `plugins.json` 已收录本插件，记录的 npm/version 均为空；发布的 `index.json` 未包含本插件。上游生成器要求 npm 包、确切版本和发布时间，并跳过 GitHub-only 条目；这是该生成器的限制，不是 Discover 索引格式的通用要求。本包继续仅通过 GitHub 分发并保留 `private: true`。
- `docs/publishing.md` 的发布示例更新为 1.0.9；按实际证据标记公开提交身份、`dsh-plugin` topic 和市场 PR 合并。只读 GitHub API 确认 PR #8355 于 2026-10-20 17:52:16 UTC 合并，提交前核对的远端 main 为 `6286b60fbced54e6c246b6b0a4be6e88c312c367`（1.0.8）；此为提交前验证快照：当时 1.0.9 补丁未提交、未推送，不将当前工作树标为已发布。旧公开提交元数据未改写。
- 本次验证：使用本机现有 Node v24.21.0 / pnpm 11.28.5，`python3 -m json.tool package.json` 通过；分别执行 `node --check lib/index.js` 与 `node --check lib/client.js` 通过；`pnpm test` 16/16 通过；三份文档的相对链接与当前版本引用一致性检查通过；`git diff --check` 通过。未安装依赖或修改全局环境。
- 提交前验证边界：未启动或操作 Harness / UE，未进行全新 profile 安装、真实 UI 新验收、编辑器端只读工具调用或截图验收；未运行本版远端 CI，也未提交、推送、打标签或发布 Release。历史条目保持原样，历史测试不作为本版新结果。

## 1.0.8 — 2026-10-21

`package.json`：`version: 1.0.8`。本版只调整仓库发布口径，运行时代码、测试、`cordis.patch.yml` 与市场条目均未修改。

- 按维护者要求，内部交叉审查报告不随仓库发布：`.gitignore` 增加 `docs/cross-review-*.zh.md`（文件保留在本地，不再出现在待提交列表），README / README.zh 与 `docs/publishing.md` 不再链接它，证据与剩余验收清单改由 `CHANGELOG.md` 承载。1.0.6 条目里「新增交叉审查报告」的表述保持不变（当时确实在本地新增了该报告），按本版约定该文件不发布。
- `docs/publishing.md` 的发布版本引用（提交信息提示、tag、Release tarball 示例）更新为 1.0.8。
- 验证（静态）：`node --check lib/index.js lib/client.js` 通过；`pnpm test` 16/16 通过；`package.json` JSON、文档相对链接、版本一致性、`git diff --check` 通过；`git status -uall` 中不再包含 `docs/cross-review-1.0.6.zh.md`。本版不涉及运行时行为，未做新的在线或界面实测；等待推送后的远端 CI 结果。

## 1.0.7 — 2026-10-21

`package.json`：`version: 1.0.7`；`lib/index.js` 增加 volatile 保存后的 url 同步，`test/connection.test.js` 增至 16 项；`lib/client.js` 与 `cordis.patch.yml` 未修改。

- 修复真机验收发现的同步缺口：插件页保存端口（实测 8000 → 9999）后，profile 补丁只写入了 `unreal-engine-skills` 的 `config.port`，`unreal-mcp` 行仍无 config/url；重启 Harness 后启动路径才补写了完整 `unreal-mcp` config（url 9999，超时与重连默认值保留）。根因是 DSH 0.2.1 的 Loader 把「仅 volatile 字段变化」视为不重挂载更新（`equalExceptVolatile` / `_commitVolatile`），只原地更新运行中的 `Config` 并发 `loader/volatile-update` 事件，不重新执行 `apply()`；而 url 同步原先只挂在 apply 后调度。
- 修复方式：`apply` 中监听 fiber 上下文的 `loader/volatile-update`（只处理 `port` / `path` 路径），保存后重新触发同步；保留 apply 后的启动/重载同步，两条路径共用 `requested` 去重状态，同一目标 url 只写一次；`configEditor.edit` 失败时清除去重状态，留给下一次变化或重载重试。旧版 Harness 若无该事件，退回原有启动/重载同步行为。
- 文档：README / README.zh 的端口配置改为「保存（volatile 更新通告）与重载后都会同步」并注明旧版回退；`skills/unreal-mcp/references/setup.md` 同步说明；AGENTS.md 补记该事件与去重约定；`docs/publishing.md` 的发布版本引用更新为 1.0.7。
- 验证（静态 + 真机前置证据）：`node --check lib/index.js lib/client.js` 通过；`pnpm test` 16/16 通过，新增回归测试覆盖「volatile 端点变更触发同步、无关字段不触发、重复通告不重复写、保留默认超时」。1.0.6 的真机验收已确认表单呈现、非法值拦截（红字提示、保存禁用）与设置写入（profile 补丁出现 `port: 9999`，无循环写入）；保存流程的复验结果见下条，编辑器端工具调用仍未验证。
- 保存流程真机复验通过（2026-10-21 00:19）：重启加载 1.0.7 后（新进程 00:19:16，晚于代码改动），在插件页把端口从 9999 改回 8000 并保存；**同一进程内** profile 补丁的 `unreal-mcp.url` 当场更新为 `http://127.0.0.1:8000/mcp`，`unreal-engine-skills` 行回到默认（config 被移除），无需重启；保存后 5 秒以上补丁哈希稳定，无循环写入；插件行 Config 状态仍为 schema。仍待验证：全新 profile 安装、编辑器端只读工具调用。

## 1.0.6 — 2026-10-20

`package.json`：`version: 1.0.6`；新增 `scripts.test`（`node --test test/*.test.js`）。运行时代码修复见下（`lib/index.js`、`lib/client.js`）；`cordis.patch.yml` 未修改。

- 修复端口/路径同步覆盖 MCP 行显式配置：`configEditor.edit` 回调保留最新 current 的请求头、超时、重连策略等字段，只替换 `url`；未覆盖字段仍继承 bundle 默认值。
- host schema 与插件页字段均校验 1–65535 的整数端口与 RFC 3986 路径；拒绝小数端口、主机替换形式、查询、片段、空格、反斜杠和错误的百分号编码。表单构造的最终 URL 额外检查 HTTP loopback 地址；显式 `UNREAL_MCP_URL` 仍保持原有优先级。
- 路径字段补充中英文验证提示；环境变量说明明确同时覆盖端口和路径。
- 增加 15 项 Node 内置运行器测试，覆盖 schema、浏览器字段契约、配置保留、环境变量、自定义 transport、HMR 事务逃逸、错误处理、技能注册和工程上下文；新增 Node 22/24 的 CI 定义，不引入编译步骤或新依赖。
- 更新双语 README、端口设置 reference 和协作约定；发布文档补齐先提交再打标签的步骤、Desktop CLI 前提与原生 Discover 索引接入。增加可直接复制的市场条目与 `docs/cross-review-1.0.6.zh.md` 交叉审查报告。
- 本次验证：修复前同组测试 7 通过 / 8 失败，修复后 15/15 通过；在独立目录使用 frozen lockfile 和禁用脚本重新安装后仍 15/15 通过。原始运行记录为 Node v24.19.0 / pnpm 11.25.0；2026-10-20 独立复验使用 Node v24.21.0 / pnpm 11.28.5，结果一致。两个 JS 分别通过 `node --check`；打包预览含 16 个文件及两份许可文件；4 个生产依赖的 `pnpm audit --prod` 返回 0 条已知漏洞；市场 YAML 和 CI YAML 解析通过。
- 独立复验（2026-10-20，另一位审查者）：8 个核心文件 SHA-256 与报告一致；当前工作区 15/15 通过，修复前源码 7 通过 / 8 失败；独立目录 frozen install 后仍 15/15，`pnpm audit --prod` 无已知漏洞；`node --check`、`pack --dry-run`（16 个文件）、`git diff --check`、市场/CI YAML 解析通过；远端 `main` 仍为 `3b39846`，本地未提交、未推送。对照实际安装的 DSH 0.2.1-rc.2 源码确认：`configEditor.edit` 的 current/inherited 语义、mcp-client 的 headers/超时/重连配置、HMR `executing` 的 AsyncLocalStorage 逃逸、前端 `settingsNumberField` / `SettingsFormModel` 的 parse 与 `invalidLabel` 契约均支持本次修复；旧代码拼接 `@evil.com/mcp` 会把 host 解析为 `evil.com`，确认路径缺陷属安全问题。运行中的 Harness 进程启动于本次改动之前，Config 检查器仍显示旧 schema，因此复验不含真实 UI/编辑器验收。
- 重启后只读复验（2026-10-20 23:58）：新 Harness 进程启动于本次改动之后；Config 检查器中 `include:unreal-engine-skills` 显示 1.0.6 schema（`port` 为 integer、`path` 带 pattern 与预期的 native-validation limitation），`unreal-mcp` 行仍为 schema；客户端 `plugins.bundle.config`（key=`dsh-unreal-engine-skills`）与 `plugins.row.config`（key=`dsh-unreal-engine-skills#unreal-mcp`）两个槽位均 active；启动未写 profile 补丁（mtime 未变）。仍未覆盖：界面点击保存、保存后重启持久化、编辑器端工具调用。
- 验证边界：浏览器测试使用共享组件契约桩，host 测试使用模拟配置服务；未运行新版本真实 UI 保存/持久化、全新 Harness 安装或编辑器工具调用；Node 22 与远端 GitHub CI 尚未运行。本地文本/链接/版本一致性检查结果见交叉审查报告。历史在线结果不算作本版实测。
- GitHub 发布、topic、市场 PR、截图和旧公开提交元数据清理仍为发布前事项；本次没有提交或推送仓库。未来提交身份的本地设置不改变旧提交。

## 1.0.5 — 2026-10-20

`package.json`：`version: 1.0.5`；新增 `author`、`repository`、`bugs`、`homepage`、`keywords`；`files` 增加 `LICENSE`、`THIRD_PARTY_NOTICES.md`、`README.zh.md`。运行时代码、`cordis.patch.yml` 与浏览器半 bundle 未修改。

- 首次公开发布前的门面补齐（只涉及清单与文档，未改变插件行为）：
  - 新增 `LICENSE`（MIT，© 2026 liuli-zsl）与 `THIRD_PARTY_NOTICES.md`（Epic Games 上游 MIT 全文、被改编的部分、商标与非官方声明）；补上 `package.json` 早已声明但仓库缺失的许可证正文。
  - `README.md` 改写为面向外部读者的英文版（从插件市场 / GitHub / 本地目录安装、编辑器侧配置、端口配置、验证、安全、验证边界、仓库结构、相关项目）；原中文内容整理为 `README.zh.md` 并同步版本号，删除「本工作副本」等内部表述。
  - 新增 `docs/publishing.md`：awesome-dsh-plugin 收录条目（`data/plugins/liuli-zsl__dsh-unreal-engine-skills.yml`，category `skill`）、提交与更新步骤、可选 npm 与 Release tarball 流程、截图约定。
  - `AGENTS.md`：导航与版本同步条目改为英文 `README.md` + 中文 `README.zh.md`；新增公开文档不得写入真实姓名、邮箱、本机路径的规定，以及许可证/商标声明不得删除的约定。
  - 仓库侧事实：GitHub 仓库已公开为 `https://github.com/liuli-zsl/dsh-unreal-engine-skills`；本地 `origin` 仍指向改名前的旧用户名（GitHub 会重定向），推送前可更新。
- 验证（静态）：`package.json` 通过 `python3 -m json.tool`；`docs/publishing.md` 内嵌条目经 Ruby YAML 解析且 `description.en` 以句号结尾，`name` / `category` 格式符合精选列表要求；各 README 与 `docs/publishing.md` 的相对链接逐条核对存在；工作区扫描确认新增与修改文件不含旧用户名、真实姓名、个人邮箱与本机绝对路径；各文档版本号与 `package.json` 一致。本次未改运行时代码，未做在线探针，也未重新验证 UI 与编辑器端；历史实测结果不作为 1.0.5 的结果。
- 待仓库维护者在 GitHub 侧完成：添加 `dsh-plugin` topic；提交并推送本次改动；向 awesome-dsh-plugin 提 PR；补充 1–8 张截图与 `screenshots.json`；可选 npm 发布。

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
