# dsh-unreal-engine-skills 协作说明

适用于本仓库（DeepSeek Harness bundle）内的修改。先理解用户当前请求和本工作副本的实际状态；本文件提供导航与协作约定，不能代替当前源码、配置、用户 profile 或用户的明确要求。

## 阅读顺序与边界

1. 先读根目录 `README.md`（英文版）与 `README.zh.md`（中文版）、`package.json`、`cordis.patch.yml`，再读 `lib/index.js`（host 半）与 `lib/client.js`（浏览器半），最后按需读 `skills/` 下的 `SKILL.md` 与 reference 文档。已有的专题文档可帮助定位，但结论要用当前代码核对；发行与市场上架步骤见 `docs/publishing.md`。
2. 端口配置链路从 `unreal-engine-skills` 行的 volatile `Config`（`port` / `path`）查起：插件页表单 → Harness 设置传输（`settings.mutate`）→ `configEditor.edit` → host 半 `syncMcpUrl` → `unreal-mcp` 行 `url` → MCP 客户端重连。排查时区分「行配置解析值」「profile 补丁原文」与「运行中 fiber 的配置」三层。
3. 浏览器侧从 `dsh.client` 声明查起：`clientModules` 在进程内按 `(baseUrl, 包名)` 永久缓存包元数据（含「不是客户端包」的否定结论），包清单变化后必须触发一次 `modules` 行重新应用（见下）或重启 Harness；客户端 bundle 由 `/plugins` combo 路由按文件元数据哈希的修订号服务。
4. 涉及 DSH 内部机制（settings、configEditor、HMR、clientModules、槽位系统）时，以 asar 内对应包的源码为准，不要凭名称推断行为。

## 每项修改的版本与 Markdown 同步

每落实一项独立的插件修改或用户反馈（包括源码、配置、资源、脚本和文档修改），完成交付前按以下顺序处理。一次需求涉及多个文件，只递增一次版本；为同步版本而修改 Markdown，不再额外递增。

1. 在 `package.json` 中将 `version` 在当前值上加 1，默认递增补丁号（例如 `1.0.0 → 1.0.1`）；功能或兼容性变化需要次版本、主版本时，按实际影响选择并在 CHANGELOG 说明理由。
2. 更新根目录 `README.md` 与 `README.zh.md` 的当前版本、功能或接入说明，使其与本次改动和 `package.json` 一致。更新根目录 `CHANGELOG.md`：在顶部加入本次版本、日期、实际变更和验证状态；旧版本记录保持原样，不补造未核实的历史。
3. 按影响更新专题文档：端口/连接配置改动查 `skills/unreal-mcp/references/setup.md` 与 `README.md` 的 Port configuration 节 / `README.zh.md` 的「端口配置」节；技能内容改动查对应 `skills/*/SKILL.md`；协作流程或源码导航变化时也更新本文件。无需改写不受影响的文档。
4. 同一项修改之后补充运行实测结果时，只补记到该版本的 `CHANGELOG.md` 和必要的说明文档，不再次递增版本。明确区分静态检查（`node --check`、schema 探针）、在线实测（Config 检查器、补丁观察、槽位检查、combo 路由探测）与用户界面确认，不能沿用旧版结果作为新版验证。

## 修改约定

- 围绕请求做最小必要修改，保留工作副本中已有改动。不要顺手改用户 profile（`~/.dsh/profiles/*/cordis.patch.yml` 等）、DSH 安装目录或引擎内容；确需跨目录修改时说明原因和影响。
- 公开文档（`README.md`、`README.zh.md`、`docs/`）面向外部读者：署名用笔名 `liuli-zsl`，不写真实姓名、个人邮箱、本机绝对路径或私有笔记内容。许可证与商标声明（`LICENSE`、`THIRD_PARTY_NOTICES.md`）是上架条件，不要删除或改写其中的上游署名。
- `lib/client.js` 是手写的 `window.__ModuleLoader__.load({ id: "dsh-unreal-engine-skills", factory })` bundle，依赖保持最少（`react/jsx-runtime` 与 `@deepseek-ai/dsh-client-ui-primitives`，均由 Web 应用提供）。不要引入构建步骤或 Node API；`dsh.client.inject` 与 `exports.inject` 是两套声明，前者是模块依赖、后者是服务注入，别混用。
- host 半写配置必须经 `configEditor.edit()`（会校验 schema 并热重载）；它运行在 `hmr.runExclusive` 事务内，而插件的 `apply` 本身就常在一个 HMR 事务里，因此从 `apply` 发起的编辑必须用 `hmr.executing.exit()` 逃逸嵌套事务检查，并延迟到 Loader 结算后执行。
- volatile 字段的解析值是 `{ get: () => value }` 包装对象；使用 `config.port` / `config.path` 前解包。新增 volatile 字段时要同步考虑浏览器表单投影与 host 解析两处。
- 端口同步的既定规则：`UNREAL_MCP_URL` 环境变量优先；`unreal-mcp` 行存在自定义 `transport` 时不触碰；写入以 bundle 默认值为基础，保留 `configEditor.edit` 回调中 current 的显式配置，仅替换 url；url 相同则完全不写。端口须为 1–65535 的整数；path 须为以 `/` 开头的 RFC 3986 路径（其他字符使用百分号编码），不得包含查询或片段；host schema 与浏览器字段验证规则要同步。volatile 字段的保存不会重挂载插件行：同步同时监听 fiber 上下文的 `loader/volatile-update`（只处理 `port` / `path` 路径），与 apply 后的启动/重载同步共用 `requested` 去重状态，同一目标 url 只写一次；旧版 DSH 若没有该事件，退回启动/重载同步。
- bundle 以链接方式安装时，host 半依赖装在本仓库 `node_modules`（新增依赖要同步 `pnpm install` 与 `pnpm-lock.yaml`）；`dsh.client` 清单变化后，在运行中的实例上可给 `modules` 行加一个临时配置变化（如 `config: { rescan: 1 }`，再移除）强制 `clientModules` 服务重建重扫，免重启；host 半代码可经 hmr root 热替换。

## 验证与交付

- 可先做限定范围的静态检查与在线探针，并明确它们不能代替用户界面与编辑器端的完整验证：分别执行 `node --check lib/index.js` 与 `node --check lib/client.js`；`pnpm test` 使用 Node 内置测试运行器，不触发编译；用 Node 导入模块并以 `Config["~standard"].validate(...)` 校验 schema 行为。`test/` 验证配置与模拟服务契约，真实 UI、持久化及编辑器调用另行验收；CI 定义在 `.github/workflows/check.yml`。
- 在线实测手段（只读）：`cordis_inspect_query` 的 Config 检查器看行 schema；观察 profile 补丁文件是否被同步写入；探测 `/plugins/??dsh-unreal-engine-skills/client.js&rev=<文件元数据 sha1 前 12 位>` 是否 200；客户端 Slots 检查器看 `plugins.bundle.config` / `plugins.row.config` 的 occupant。写操作（改补丁、`plugin_manager` 启停、`configEditor.edit`）会改变运行状态，按当前用户授权范围执行。
- 表单视觉呈现、从界面点击「保存」的完整链路、编辑器端 MCP 工具真实调用无法从本仓库侧确认，交付时如实说明，由用户在 Harness 中最终确认；历史测试结果不能充当本次结果。不要替用户提交仓库，也不要提交用户 profile 或 `node_modules` 内容。
