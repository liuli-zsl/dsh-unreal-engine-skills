/**
 * dsh-unreal-engine-skills — browser half.
 *
 * Registers the bundle's port/path settings form on the Plugins page:
 *   - `plugins.bundle.config` keyed "dsh-unreal-engine-skills": the form on
 *     the bundle's own page (between the description and its rows);
 *   - `plugins.row.config` keyed "dsh-unreal-engine-skills#unreal-mcp": a
 *     **Configure** control on the unreal-mcp row.
 *
 * The form stages over the `unreal-engine-skills` settings namespace the Host
 * half exposes (`port` / `path`, volatile). Saving writes through the shared
 * settings transport; the Host half then syncs the unreal-mcp row's url and
 * the MCP client reconnects — no restart needed.
 *
 * Hand-written prebuilt bundle in the __ModuleLoader__ format (no build step):
 * the only runtime dependencies are `react` and the shared client primitives,
 * both provided by the web app.
 */
window.__ModuleLoader__.load({
	id: "dsh-unreal-engine-skills",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let react_jsx_runtime = require("react/jsx-runtime");
		let primitives = require("@deepseek-ai/dsh-client-ui-primitives");

		// ------------------------------------------------------------------
		// Copy
		// ------------------------------------------------------------------

		const NS = "settings.unrealEngine";
		// Keep the endpoint-path contract in sync with the host Config schema.
		const MCP_PATH_PATTERN = /^\/(?:[A-Za-z0-9._~!$&'()*+,;=:@/-]|%[0-9A-Fa-f]{2})*(?![\s\S])/;

		const en = {
			title: "Unreal Engine MCP connection",
			description: "Configure the connection to the Unreal Editor's ModelContextProtocol server.",
			port: "Port",
			portHint: "The port the editor's MCP server listens on. The connection hot-switches to the new port after saving.",
			path: "URL path",
			pathHint: "The MCP endpoint path; keep /mcp unless the editor config changes it.",
			overridden: "Overridden",
			reset: "Reset to default",
			invalidNumber: "Enter a whole port number between 1 and 65535.",
			invalidPath: "Enter a path starting with /, without spaces, a query or a fragment; percent-encode other characters.",
			unavailable: "This plugin is not loaded, so it cannot be configured right now.",
			readOnly: "This deployment stores settings read-only.",
			save: "Save",
			saving: "Saving…",
			saveFailed: "The deployment did not accept these values; they were left for you to correct.",
			envNote: "The UNREAL_MCP_URL environment variable, when set, overrides the port and path."
		};

		const zh = {
			title: "Unreal Engine MCP 连接",
			description: "配置与 Unreal 编辑器 ModelContextProtocol 服务器的连接。",
			port: "端口",
			portHint: "编辑器 MCP 服务器监听的端口。保存后连接会热切换到新端口。",
			path: "URL 路径",
			pathHint: "MCP 端点路径；除非编辑器配置改过，否则保持 /mcp。",
			overridden: "已覆盖",
			reset: "恢复默认",
			invalidNumber: "请输入 1 到 65535 之间的整数端口号。",
			invalidPath: "请输入以 / 开头的路径，不含空格、查询参数或片段；其他字符请使用百分号编码。",
			unavailable: "该插件当前未加载，暂时无法配置。",
			readOnly: "本部署的设置为只读。",
			save: "保存",
			saving: "保存中…",
			saveFailed: "本部署没有接受这些值，已保留供你修改。",
			envNote: "设置了 UNREAL_MCP_URL 环境变量时，它会覆盖端口和路径。"
		};

		function formLabels(t) {
			return {
				unavailable: t("unavailable"),
				readOnly: t("readOnly"),
				saveFailed: t("saveFailed"),
				save: t("save"),
				saving: t("saving")
			};
		}

		// ------------------------------------------------------------------
		// Page
		// ------------------------------------------------------------------

		/** Settings namespace the Host half serves (`unreal-engine-skills` entry). */
		const HOST_NS = "unreal-engine-skills";
		/** Bundle package name; also the `plugins.bundle.config` slot key. */
		const BUNDLE_NAME = "dsh-unreal-engine-skills";

		function UnrealCard(props) {
			const { t } = props;
			const state = props.useUnrealCard((snapshot) => snapshot);
			if (props.view === "summary") return t("description");
			const disabled = !state.writable;
			return react_jsx_runtime.jsxs(primitives.SettingsForm, {
				labels: formLabels(t),
				state,
				onSave: props.save,
				onDiscard: props.discard,
				children: [
					react_jsx_runtime.jsx(primitives.SettingsValueField, {
						id: "plugin-config-unreal-mcp-port",
						label: t("port"),
						hint: t("portHint"),
						overriddenLabel: t("overridden"),
						resetLabel: t("reset"),
						invalidLabel: t("invalidNumber"),
						numeric: true,
						disabled,
						...state.port,
						onEdit: (text) => {
							props.edit("port", text);
						},
						onReset: () => {
							props.resetField("port");
						}
					}),
					react_jsx_runtime.jsx(primitives.SettingsValueField, {
						id: "plugin-config-unreal-mcp-path",
						label: t("path"),
						hint: t("pathHint"),
						overriddenLabel: t("overridden"),
						resetLabel: t("reset"),
						invalidLabel: t("invalidPath"),
						disabled,
						...state.path,
						onEdit: (text) => {
							props.edit("path", text);
						},
						onReset: () => {
							props.resetField("path");
						}
					}),
					react_jsx_runtime.jsx("p", {
						className: "dsh-unreal-env-note",
						children: t("envNote")
					})
				]
			});
		}

		/** Staged form over the shared `SettingsFormModel` of ui-primitives. */
		function validatedField(field, valid) {
			return {
				...field,
				parse: (text) => {
					const parsed = field.parse(text);
					return parsed?.kind === "set" && !valid(parsed.value) ? undefined : parsed;
				}
			};
		}

		var UnrealCardController = class {
			form;
			store;
			constructor(scope) {
				this.form = new primitives.SettingsFormModel(scope, [
					validatedField(primitives.settingsNumberField("port"), (value) => Number.isInteger(value) && value >= 1 && value <= 65535),
					validatedField(primitives.settingsTextField("path"), (value) => MCP_PATH_PATTERN.test(value))
				], []);
				this.store = this.form.bind(() => this.projection());
			}
			projection() {
				return {
					...this.form.shell(),
					port: this.form.field("port"),
					path: this.form.field("path")
				};
			}
			inject() {
				return {
					hooks: { unrealCard: this.store },
					...this.form.actions()
				};
			}
			dispose() {
				this.form.dispose();
			}
		};

		// ------------------------------------------------------------------
		// Plugin
		// ------------------------------------------------------------------

		const inject = [
			"slots",
			"locale",
			"configForms"
		];

		function apply(ctx) {
			const t = ctx.locale.bind(NS);
			ctx.effect(() => ctx.locale.register(NS, {
				zh,
				en
			}), "dsh-unreal-engine-skills: dictionaries");
			const card = new UnrealCardController(ctx.configForms.get(HOST_NS));
			ctx.effect(() => () => {
				card.dispose();
			}, "dsh-unreal-engine-skills: form subscription");
			ctx.effect(() => ctx.configForms.whileServed([HOST_NS], () => {
				const offBundle = ctx.slots.inject("plugins.bundle.config", () => ctx.slots.register({
					name: "plugins.bundle.config",
					key: BUNDLE_NAME,
					locale: NS,
					inject: () => card.inject()
				}, UnrealCard));
				const offRow = ctx.slots.inject("plugins.row.config", () => ctx.slots.register({
					name: "plugins.row.config",
					key: `${BUNDLE_NAME}#unreal-mcp`,
					locale: NS,
					inject: () => card.inject()
				}, UnrealCard));
				return () => {
					offBundle();
					offRow();
				};
			}), "dsh-unreal-engine-skills: plug-ins page configuration");
		}

		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});
