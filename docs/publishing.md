# Publishing and marketplace

This repository is distributed from GitHub. npm is optional. The canonical repository URL is

```text
https://github.com/liuli-zsl/dsh-unreal-engine-skills
```

## Pre-flight checklist

The first four checks describe the local source tree. Verify the actual remote release before
submitting the catalog entry; uncommitted local files do not reach GitHub installs.

- [x] `dsh.bundle` manifest and `cordis.patch.yml` at the repository root (required for `dsh plugin add`).
- [x] MIT license plus upstream Epic Games notice ([`LICENSE`](../LICENSE), [`THIRD_PARTY_NOTICES.md`](../THIRD_PARTY_NOTICES.md)).
- [x] Public repository (`liuli-zsl/dsh-unreal-engine-skills`).
- [x] Public-facing README in English and Chinese ([`README.md`](../README.md), [`README.zh.md`](../README.zh.md)).
- [ ] Future Git commits use the intended public name and GitHub noreply address; decide how to handle old public commit metadata.
- [ ] Complete the real Harness/UI/editor checks listed in the current [`CHANGELOG.md`](../CHANGELOG.md) entry.
- [ ] `dsh-plugin` topic on the GitHub repository (required by the list's CI).
- [ ] Current working tree pushed to GitHub.
- [ ] Listing PR opened against `awesome-dsh-plugin` (below).
- [ ] Screenshots added (optional, recommended — see below).

## Releasing

1. Bump `version` in [`package.json`](../package.json) (patch by default) and update
   [`README.md`](../README.md), [`README.zh.md`](../README.zh.md) and [`CHANGELOG.md`](../CHANGELOG.md)
   as described in [`AGENTS.md`](../AGENTS.md).
2. Run the checks without compiling anything:

   ```sh
   pnpm install --frozen-lockfile --ignore-scripts
   node --check lib/index.js
   node --check lib/client.js
   pnpm test
   git diff --check
   ```

   `cordis.patch.yml` uses the Harness loader's `!!js` tag. A generic YAML parser cannot validate
   that expression's runtime behavior; a tag error is not a passing configuration check.
3. Review and commit the intended files. Check `git status --short` and the full diff, select the
   source, tests, workflow, manifests, license files and documentation explicitly with `git add`,
   then inspect the staged diff:

   ```sh
   git diff --cached --check
   git diff --cached
   git commit -m "Fix MCP endpoint configuration and prepare v1.0.8"
   git status --short
   git show HEAD:package.json
   ```

   Stop if the working tree still contains intended release changes or `HEAD:package.json` does
   not say `1.0.8`. Do not tag the old HEAD while the release files remain uncommitted. Resolve
   the privacy decision before pushing; changing future Git identity does not scrub old commits.
4. The maintainer can then tag and push that reviewed commit (only the intended tag):

   ```sh
   git tag v1.0.8
   git push origin main v1.0.8
   ```

5. Check GitHub's actual files and CI results. Create a GitHub Release for the tag with the matching
   `CHANGELOG.md` section as the body. The workflow definition itself is not evidence of a green run.

## DeepSeek Harness plugin market

The visual plugin market (`dshmarket`) shows the curated list
[awesome-dsh-plugin](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin). To appear there, add
an entry **to that list repository** — not to the market application repository
(`dsh-market/dsh-market`). Rules and review criteria are documented in its
[contributing.md](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin/blob/main/contributing.md).

Harness 0.2.1+ can consume the same catalog in **Plugins → Discover → Index sources** using
`https://cdn.jsdelivr.net/npm/dsh-plugin-catalog/index.json`. A catalog listing only makes the plugin
discoverable to clients that use that source; it does not enable a new source for every user.
See the [market's index instructions](https://github.com/dsh-market/dsh-market#readme).

### Submission steps

1. Add the `dsh-plugin` topic to this repository (required; CI reads it).
2. Fork `awesome-dsh-plugin` and add exactly one new file:
   `data/plugins/liuli-zsl__dsh-unreal-engine-skills.yml`

   The ready-to-copy source is [`marketplace/liuli-zsl__dsh-unreal-engine-skills.yml`](marketplace/liuli-zsl__dsh-unreal-engine-skills.yml):

   ```yaml
   url: https://github.com/liuli-zsl/dsh-unreal-engine-skills
   name: liuli-zsl/dsh-unreal-engine-skills
   category: skill
   description:
     en: Registers Epic's Unreal Engine skills (unreal-mcp, create-toolset, unreal-skill), injects Unreal project context, and connects the editor's ModelContextProtocol server with a port form on the Plugins page.
     zh: 注册 Epic 的 Unreal Engine 三个技能（unreal-mcp、create-toolset、unreal-skill），注入 UE 工程上下文，接通编辑器的 ModelContextProtocol 服务器，并支持在插件页修改端口。
   ```

   `description.en` is required and must be one line ending with a period. The Chinese line is
   optional. Keep the description accurate: the three skills are shipped here; the MCP tools
   themselves are provided by the editor's `ModelContextProtocol` and `AllToolsets` plugins, not by
   this package.

3. Do **not** edit the generated `README.md` / `README.zh.md` in the list repository. They are
   regenerated from `data/plugins/*.yml` after merge.
4. Open one pull request. The list accepts at most three entries per PR; a single-plugin submission
   is one file. Suggested PR body:

   ```text
   Add liuli-zsl/dsh-unreal-engine-skills — a DeepSeek Harness port of Epic's Unreal Engine
   Skills for Claude Code (MIT). One bundle registers the three skills (unreal-mcp,
   create-toolset, unreal-skill), injects Unreal project context, and wires the editor's
   ModelContextProtocol server, with the endpoint editable on the Plugins page and hot-reloaded
   on save.

   - dsh.bundle + cordis.patch.yml at the repository root
   - repo older than one day
   - skills live in skills/*/SKILL.md; the MCP toolsets come from the editor plugins
   ```

   Add a statement that the `dsh-plugin` topic and validation checks are complete only after
   checking their actual state. A draft PR body must not claim unperformed acceptance testing.

5. Wait for review. CI checks the manifest, repository age, formatting and the regenerated README;
   a maintainer then reads the repository and verifies the description against the code. Listings
   usually go live within about a day after merge.

### Updating the listing later

Edit only your own `data/plugins/liuli-zsl__dsh-unreal-engine-skills.yml` in the list repository and
open a PR; regenerating the READMEs is done by the list's CI. Do not hand-write an `npm:` key — the
npm mapping is picked up automatically from `package.json`'s `repository` field.

## Screenshots (optional, recommended)

The market detail page shows App Store-style screenshots. Add 1–8 PNG images to this repository
(for example under `assets/`) and declare them in `screenshots.json` next to `package.json`:

```json
["assets/plugins-page-port-form.png", "assets/editor-mcp-log.png"]
```

Paths are relative to `screenshots.json`, must stay inside this repository, and are picked up on the
next build after a push. Useful shots: the Plugins-page port form, the editor output log showing the
MCP server start, and one real tool call. Without screenshots the market falls back to images
extracted from the README.

## npm package (optional)

Check the package name and intended npm account before publishing:

```sh
npm view dsh-unreal-engine-skills version
```

To publish:

1. Remove `"private": true` from [`package.json`](../package.json). Keep `repository` pointing at
   this repository — the curated list links the npm package to the repository through it.
2. Run `npm publish` (the `files` allowlist already includes `lib/`, `skills/`, `locale/`,
   `icon.svg`, `cordis.patch.yml`, `LICENSE`, `THIRD_PARTY_NOTICES.md` and `README.zh.md`; npm also
   includes `package.json` and the main README automatically).
3. Note that this package ships plain JavaScript with no build step, so installing from GitHub
   source works as well; npm mainly adds install speed and download statistics.

## Prebuilt tarball (optional)

A GitHub Release asset can be offered instead of a source install. Attach a `.tgz` and keep the
asset name free of the version if you plan to use `releases/latest/download/...`, or pin the tag:
`https://github.com/liuli-zsl/dsh-unreal-engine-skills/releases/download/v1.0.8/dsh-unreal-engine-skills.tgz`.
