# dsh-unreal-engine-skills 协作说明

适用于本仓库（DeepSeek Harness bundle）内的修改。先理解用户当前请求和本工作副本的实际状态；本文件提供导航与协作约定，不能代替当前源码、配置、用户 profile 或用户的明确要求。

开工或恢复任务时先读 `$zsl-common-skills`，提交前重新核对其中的“每次提交的底线”。仓库必备文档为根目录的 `AGENTS.md`、`README.md` 和仓库级变更记录 `Docs/CHANGELOG.md`。中文首页 `README.zh.md` 与英文首页同步维护。

## 阅读顺序与边界

1. 先读根目录 `README.md`（英文版）与 `README.zh.md`（中文版）、`package.json`、`cordis.patch.yml`，再读 `lib/index.js`（host 半）与 `lib/client.js`（浏览器半），最后按需读 `skills/` 下的 `SKILL.md` 与 reference 文档。专题文档帮助定位，结论按当前代码核对。发行与市场上架步骤见 [Docs/publishing.md](Docs/publishing.md)。
2. 端口配置链路从 `unreal-engine-skills` 行的 volatile `Config`（`port` / `path`）查起：插件页表单 → Harness 设置传输（`settings.mutate`）→ `configEditor.edit` → host 半 `syncMcpUrl` → `unreal-mcp` 行 `url` → MCP 客户端重连。排查时区分「行配置解析值」「profile 补丁原文」与「运行中 fiber 的配置」三层。
3. 浏览器侧从 `dsh.client` 声明查起：`clientModules` 在进程内按 `(baseUrl, 包名)` 永久缓存包元数据（含「不是客户端包」的否定结论），包清单变化后必须触发一次 `modules` 行重新应用（见下）或重启 Harness；客户端 bundle 由 `/plugins` combo 路由按文件元数据哈希的修订号服务。
4. 涉及 DSH 内部机制（settings、configEditor、HMR、clientModules、槽位系统）时，以 asar 内对应包的源码为准，不要凭名称推断行为。

## 分支约定

`main` 跟进最新适配，也是公开安装来源。`5.8` 与 `5.9` 是维护者的本地分支，各自维护对应 UE 系列。更新引擎接入说明时，按目标分支核对工具 schema 和引擎配置，并记录实际验证的版本。通用修复按各分支的适用性移植。

## README 写作约定

修改任一首页前，重读 `$zsl-common-skills` 的“写作和审阅 README”。首页面向首次用 DeepSeek Harness 连接 Unreal Editor 的用户。先写市场安装、启动目标编辑器的 MCP 服务、通过 Harness 读取当前关卡名的步骤与可观察结果，再给 GitHub 和本地开发安装入口。

按 `package.json`、`cordis.patch.yml` 与 `skills/unreal-mcp/references/setup.md` 核对宿主版本、安装入口和控制台命令。维护者与反馈渠道以 `package.json` 的 `author`、`bugs.url` 为准。提交前逐一打开变动的相对链接，对照两个语言版本的步骤、预期结果和验证范围。

## 本地任务计划

需要将计划写成文件时，按任务名保存在 `Docs/Plan/`。恢复时先读对应计划，随进度更新已完成事项和下一步。该目录仅供本地使用，单独更新计划免升版、免写变更记录、免提交。提交、对外文档与发布附件均排除计划内容。从工作目录打包时显式排除 `Docs/Plan/`。

用 `git check-ignore -v --no-index -- Docs/Plan/example.md` 核对忽略规则，用 `git ls-files -- Docs/Plan/` 确认索引为空。

## 本地提交、版本与文档

1. 每项有实际差异的插件修改（含文档、配置和脚本）完成后创建本地提交。每次提交从当前分支上一提交的 `package.json` 递增 `version`，默认递增补丁号。功能或兼容性变化按实际影响选择次版本或主版本，并在变更记录中说明原因。
2. 每次提交都在仓库根目录下的 `Docs/CHANGELOG.md` 顶部记录版本、日期、实际变化和验证结果，同步两份 README 的当前版本与受影响的说明。将提交前取得的验证结果一并记录。提交后取得的结果如需入库，随下一次升版提交注明被验证的版本。
3. 端口或连接配置改动须核对 `skills/unreal-mcp/references/setup.md` 和双语首页的端口配置章节。技能、协作流程或源码入口有变动时，同步对应的 `skills/*/SKILL.md` 或本文件。分别说明静态检查、在线探针与实际界面或编辑器验收的结果。
4. 检查工作区和暂存区，只提交本次变动，保留用户原有修改及其暂存状态。提交标题先中文、后英文，用 ` / ` 分隔，可选正文也逐项中英文对照。核对提交文件并报告短哈希。远程推送按用户当次明确授权的目标执行。

## dshmarket 上架与更新确认

- 每次完成一项插件修改，在汇报验证结果时询问用户：「是否将本次修改（分支 `<branch>`，插件版本 `<version>`）更新到 `dshmarket`？」一次需求统一询问一次。用户已在当前任务明确要求发布或暂缓时，按该决定执行。
- 用户确认后，按 [发布说明](Docs/publishing.md) 核对市场条目的安装来源。本插件的 GitHub 来源跟随默认分支 `main`。发布前明确将进入该分支的改动。只有目录描述、分类或安装来源变化时才需要修改已有目录条目。
- 发布后从公开目录读取安装目标，核对它解析到的提交和 `package.json` 版本，并向用户报告结果。若更新仍在等待索引刷新或 PR 审核，说明当前实际进度。

## 修改约定

- 围绕请求做最小必要修改，保留工作副本中已有改动。不要顺手改用户 profile（`~/.dsh/profiles/*/cordis.patch.yml` 等）、DSH 安装目录或引擎内容；确需跨目录修改时说明原因和影响。
- 公开文档（`README.md`、`README.zh.md`、`Docs/` 下随库发布的文件）使用笔名 `liuli-zsl`，不写真实姓名、个人邮箱、本机绝对路径或私有笔记内容。自有代码采用根目录 `LICENSE` 中的 MIT 许可，改编内容保留 `THIRD_PARTY_NOTICES.md` 中的 Epic Games 许可、署名和商标声明。
- `lib/client.js` 是手写的 `window.__ModuleLoader__.load({ id: "dsh-unreal-engine-skills", factory })` bundle，依赖保持最少（`react/jsx-runtime` 与 `@deepseek-ai/dsh-client-ui-primitives`，均由 Web 应用提供）。不要引入构建步骤或 Node API；`dsh.client.inject` 与 `exports.inject` 是两套声明，前者是模块依赖、后者是服务注入，别混用。
- host 半写配置必须经 `configEditor.edit()`（会校验 schema 并热重载）；它运行在 `hmr.runExclusive` 事务内，而插件的 `apply` 本身就常在一个 HMR 事务里，因此从 `apply` 发起的编辑必须用 `hmr.executing.exit()` 逃逸嵌套事务检查，并延迟到 Loader 结算后执行。
- volatile 字段的解析值是 `{ get: () => value }` 包装对象；使用 `config.port` / `config.path` 前解包。新增 volatile 字段时要同步考虑浏览器表单投影与 host 解析两处。
- 端口同步的既定规则：`UNREAL_MCP_URL` 环境变量优先；`unreal-mcp` 行存在自定义 `transport` 时不触碰；写入以 bundle 默认值为基础，保留 `configEditor.edit` 回调中 current 的显式配置，仅替换 url；url 相同则完全不写。端口须为 1–65535 的整数；path 须为以 `/` 开头的 RFC 3986 路径（其他字符使用百分号编码），不得包含查询或片段；host schema 与浏览器字段验证规则要同步。volatile 字段的保存不会重挂载插件行：同步同时监听 fiber 上下文的 `loader/volatile-update`（只处理 `port` / `path` 路径），与 apply 后的启动/重载同步共用 `requested` 去重状态，同一目标 url 只写一次；旧版 DSH 若没有该事件，退回启动/重载同步。
- bundle 以链接方式安装时，host 半依赖装在本仓库 `node_modules`（新增依赖要同步 `pnpm install` 与 `pnpm-lock.yaml`）；`dsh.client` 清单变化后，在运行中的实例上可给 `modules` 行加一个临时配置变化（如 `config: { rescan: 1 }`，再移除）强制 `clientModules` 服务重建重扫，免重启；host 半代码可经 hmr root 热替换。

## 验证与交付

- 可先做限定范围的静态检查与在线探针，并明确它们不能代替用户界面与编辑器端的完整验证：分别执行 `node --check lib/index.js` 与 `node --check lib/client.js`；`pnpm test` 使用 Node 内置测试运行器，不触发编译；用 Node 导入模块并以 `Config["~standard"].validate(...)` 校验 schema 行为。`test/` 验证配置与模拟服务契约，真实 UI、持久化及编辑器调用另行验收；CI 定义在 `.github/workflows/check.yml`。
- 在线实测手段（只读）：`cordis_inspect_query` 的 Config 检查器看行 schema；观察 profile 补丁文件是否被同步写入；探测 `/plugins/??dsh-unreal-engine-skills/client.js&rev=<文件元数据 sha1 前 12 位>` 是否 200；客户端 Slots 检查器看 `plugins.bundle.config` / `plugins.row.config` 的 occupant。写操作（改补丁、`plugin_manager` 启停、`configEditor.edit`）会改变运行状态，按当前用户授权范围执行。
- 表单呈现、从界面点击「保存」的完整链路和编辑器端 MCP 工具调用需要在 Harness 与目标编辑器中验收，交付时注明本次实测范围。发布只包含本次确认的仓库文件，排除用户 profile 和 `node_modules`。
